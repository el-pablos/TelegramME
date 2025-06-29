<?php

namespace PteroBot\Services;

use PDO;
use PDOException;

/**
 * Service untuk security, validation, dan rate limiting
 * 
 * @author Pablos (@ImTamaa)
 */
class SecurityService
{
    private LoggingService $logger;
    private PDO $db;
    private array $allowedUsers;
    private string $ownerTelegramId;
    private int $maxConcurrentOperations;
    private int $operationTimeout;

    public function __construct(LoggingService $logger)
    {
        $this->logger = $logger;
        $this->allowedUsers = explode(',', $_ENV['ALLOWED_USERS'] ?? $_ENV['OWNER_TELEGRAM_ID']);
        $this->ownerTelegramId = $_ENV['OWNER_TELEGRAM_ID'];
        $this->maxConcurrentOperations = (int)($_ENV['MAX_CONCURRENT_OPERATIONS'] ?? 10);
        $this->operationTimeout = (int)($_ENV['OPERATION_TIMEOUT'] ?? 300);
        
        $this->setupDatabase();
    }

    /**
     * Setup database untuk security tracking
     */
    private function setupDatabase(): void
    {
        try {
            $dbPath = $_ENV['DB_PATH'] ?? 'logs/bot.db';
            $this->db = new PDO("sqlite:{$dbPath}");
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            $this->createSecurityTables();
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal setup security database: ' . $e->getMessage());
            throw new \Exception('Gagal setup security database: ' . $e->getMessage());
        }
    }

    /**
     * Buat tabel untuk security tracking
     */
    private function createSecurityTables(): void
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS rate_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                action TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT
            );
            
            CREATE TABLE IF NOT EXISTS active_operations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                operation_type TEXT,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                status TEXT DEFAULT 'RUNNING'
            );
            
            CREATE TABLE IF NOT EXISTS security_violations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                violation_type TEXT,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT
            );
            
            CREATE TABLE IF NOT EXISTS blocked_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE,
                reason TEXT,
                blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                blocked_until DATETIME,
                is_permanent INTEGER DEFAULT 0
            );
        ";
        
        $this->db->exec($sql);
    }

    /**
     * Cek apakah user diizinkan menggunakan bot
     */
    public function isUserAllowed(int $userId): bool
    {
        // Cek apakah user di-block
        if ($this->isUserBlocked($userId)) {
            $this->logSecurityViolation($userId, 'BLOCKED_USER_ACCESS', 'User yang di-block mencoba akses');
            return false;
        }

        // Cek apakah user dalam daftar allowed
        return in_array((string)$userId, $this->allowedUsers);
    }

    /**
     * Cek apakah user di-block
     */
    public function isUserBlocked(int $userId): bool
    {
        try {
            $stmt = $this->db->prepare("
                SELECT * FROM blocked_users 
                WHERE user_id = ? 
                AND (is_permanent = 1 OR blocked_until > datetime('now'))
            ");
            $stmt->execute([(string)$userId]);
            
            return $stmt->fetch() !== false;
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal cek blocked user: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Rate limiting untuk mencegah spam
     */
    public function checkRateLimit(int $userId, string $action, int $maxRequests = 5, int $timeWindow = 60): bool
    {
        try {
            // Hapus record lama
            $this->cleanupOldRateLimits($timeWindow);
            
            // Hitung request dalam time window
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as count 
                FROM rate_limits 
                WHERE user_id = ? 
                AND action = ? 
                AND timestamp > datetime('now', '-{$timeWindow} seconds')
            ");
            $stmt->execute([(string)$userId, $action]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $currentCount = $result['count'] ?? 0;
            
            if ($currentCount >= $maxRequests) {
                $this->logSecurityViolation(
                    $userId, 
                    'RATE_LIMIT_EXCEEDED', 
                    "Action: {$action}, Count: {$currentCount}, Limit: {$maxRequests}"
                );
                return false;
            }
            
            // Record request ini
            $this->recordRateLimit($userId, $action);
            
            return true;
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal cek rate limit: ' . $e->getMessage());
            return true; // Allow jika ada error
        }
    }

    /**
     * Record rate limit request
     */
    private function recordRateLimit(int $userId, string $action): void
    {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO rate_limits (user_id, action, ip_address)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([
                (string)$userId,
                $action,
                $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal record rate limit: ' . $e->getMessage());
        }
    }

    /**
     * Cleanup old rate limit records
     */
    private function cleanupOldRateLimits(int $timeWindow): void
    {
        try {
            $stmt = $this->db->prepare("
                DELETE FROM rate_limits 
                WHERE timestamp < datetime('now', '-{$timeWindow} seconds')
            ");
            $stmt->execute();
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal cleanup rate limits: ' . $e->getMessage());
        }
    }

    /**
     * Cek apakah masih bisa menjalankan operasi concurrent
     */
    public function canStartOperation(int $userId, string $operationType): bool
    {
        try {
            // Cleanup expired operations
            $this->cleanupExpiredOperations();
            
            // Hitung active operations
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as count 
                FROM active_operations 
                WHERE status = 'RUNNING'
            ");
            $stmt->execute();
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $activeCount = $result['count'] ?? 0;
            
            if ($activeCount >= $this->maxConcurrentOperations) {
                $this->logSecurityViolation(
                    $userId, 
                    'MAX_CONCURRENT_EXCEEDED', 
                    "Active: {$activeCount}, Max: {$this->maxConcurrentOperations}"
                );
                return false;
            }
            
            return true;
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal cek concurrent operations: ' . $e->getMessage());
            return true; // Allow jika ada error
        }
    }

    /**
     * Start tracking operation
     */
    public function startOperation(int $userId, string $operationType): int
    {
        try {
            $expiresAt = date('Y-m-d H:i:s', time() + $this->operationTimeout);
            
            $stmt = $this->db->prepare("
                INSERT INTO active_operations (user_id, operation_type, expires_at)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([
                (string)$userId,
                $operationType,
                $expiresAt
            ]);
            
            return $this->db->lastInsertId();
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal start operation tracking: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Finish tracking operation
     */
    public function finishOperation(int $operationId, string $status = 'COMPLETED'): void
    {
        try {
            $stmt = $this->db->prepare("
                UPDATE active_operations 
                SET status = ? 
                WHERE id = ?
            ");
            $stmt->execute([$status, $operationId]);
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal finish operation tracking: ' . $e->getMessage());
        }
    }

    /**
     * Cleanup expired operations
     */
    private function cleanupExpiredOperations(): void
    {
        try {
            $stmt = $this->db->prepare("
                UPDATE active_operations 
                SET status = 'EXPIRED' 
                WHERE expires_at < datetime('now') 
                AND status = 'RUNNING'
            ");
            $stmt->execute();
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal cleanup expired operations: ' . $e->getMessage());
        }
    }

    /**
     * Log security violation
     */
    public function logSecurityViolation(int $userId, string $violationType, string $details): void
    {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO security_violations (user_id, violation_type, details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                (string)$userId,
                $violationType,
                $details,
                $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
            ]);
            
            $this->logger->warning("Security violation: {$violationType}", [
                'user_id' => $userId,
                'details' => $details
            ]);
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal log security violation: ' . $e->getMessage());
        }
    }

    /**
     * Block user
     */
    public function blockUser(int $userId, string $reason, int $durationHours = 0): void
    {
        try {
            $blockedUntil = null;
            $isPermanent = 0;
            
            if ($durationHours > 0) {
                $blockedUntil = date('Y-m-d H:i:s', time() + ($durationHours * 3600));
            } else {
                $isPermanent = 1;
            }
            
            $stmt = $this->db->prepare("
                INSERT OR REPLACE INTO blocked_users (user_id, reason, blocked_until, is_permanent)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                (string)$userId,
                $reason,
                $blockedUntil,
                $isPermanent
            ]);
            
            $this->logger->warning("User blocked: {$userId}", [
                'reason' => $reason,
                'duration_hours' => $durationHours,
                'is_permanent' => $isPermanent
            ]);
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal block user: ' . $e->getMessage());
        }
    }

    /**
     * Unblock user
     */
    public function unblockUser(int $userId): void
    {
        try {
            $stmt = $this->db->prepare("DELETE FROM blocked_users WHERE user_id = ?");
            $stmt->execute([(string)$userId]);
            
            $this->logger->info("User unblocked: {$userId}");
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal unblock user: ' . $e->getMessage());
        }
    }

    /**
     * Validasi input server ID
     */
    public function validateServerId(string $serverId): bool
    {
        // Server ID Pterodactyl biasanya 8 karakter alphanumeric
        return preg_match('/^[a-zA-Z0-9]{8}$/', $serverId);
    }

    /**
     * Sanitize input text
     */
    public function sanitizeInput(string $input): string
    {
        // Remove potentially dangerous characters
        $input = strip_tags($input);
        $input = htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
        $input = trim($input);
        
        return $input;
    }

    /**
     * Cek apakah user adalah owner
     */
    public function isOwner(int $userId): bool
    {
        return (string)$userId === $this->ownerTelegramId;
    }

    /**
     * Get security statistics
     */
    public function getSecurityStats(): array
    {
        try {
            $stats = [];
            
            // Active operations
            $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM active_operations WHERE status = 'RUNNING'");
            $stmt->execute();
            $stats['active_operations'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;
            
            // Blocked users
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as count FROM blocked_users 
                WHERE is_permanent = 1 OR blocked_until > datetime('now')
            ");
            $stmt->execute();
            $stats['blocked_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;
            
            // Security violations today
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as count FROM security_violations 
                WHERE timestamp > datetime('now', '-1 day')
            ");
            $stmt->execute();
            $stats['violations_today'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;
            
            return $stats;
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal get security stats: ' . $e->getMessage());
            return [];
        }
    }
}
