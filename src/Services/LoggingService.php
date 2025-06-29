<?php

namespace PteroBot\Services;

use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Formatter\LineFormatter;
use PDO;
use PDOException;

/**
 * Service untuk logging aktivitas bot dan error handling
 * 
 * @author Pablos (@ImTamaa)
 */
class LoggingService
{
    private Logger $logger;
    private PDO $db;
    private string $ownerTelegramId;

    public function __construct()
    {
        $this->ownerTelegramId = $_ENV['OWNER_TELEGRAM_ID'];
        $this->setupLogger();
        $this->setupDatabase();
    }

    /**
     * Setup Monolog logger
     */
    private function setupLogger(): void
    {
        $this->logger = new Logger('PteroBot');
        
        // File handler dengan rotasi
        $fileHandler = new RotatingFileHandler(
            $_ENV['LOG_FILE'] ?? 'logs/bot.log',
            (int)($_ENV['LOG_MAX_FILES'] ?? 7),
            $this->getLogLevel()
        );
        
        // Format log yang readable
        $formatter = new LineFormatter(
            "[%datetime%] %channel%.%level_name%: %message% %context% %extra%\n",
            'Y-m-d H:i:s'
        );
        $fileHandler->setFormatter($formatter);
        
        $this->logger->pushHandler($fileHandler);
        
        // Console handler untuk debug mode
        if ($_ENV['DEBUG_MODE'] === 'true') {
            $consoleHandler = new StreamHandler('php://stdout', Logger::DEBUG);
            $consoleHandler->setFormatter($formatter);
            $this->logger->pushHandler($consoleHandler);
        }
    }

    /**
     * Setup SQLite database untuk logging
     */
    private function setupDatabase(): void
    {
        try {
            $dbPath = $_ENV['DB_PATH'] ?? 'logs/bot.db';
            $this->db = new PDO("sqlite:{$dbPath}");
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Buat tabel jika belum ada
            $this->createTables();
            
        } catch (PDOException $e) {
            $this->logger->error('Gagal setup database: ' . $e->getMessage());
            throw new \Exception('Gagal setup database: ' . $e->getMessage());
        }
    }

    /**
     * Buat tabel database
     */
    private function createTables(): void
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_id TEXT,
                username TEXT,
                action TEXT,
                details TEXT,
                status TEXT,
                ip_address TEXT
            );
            
            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                error_type TEXT,
                error_message TEXT,
                stack_trace TEXT,
                user_id TEXT,
                context TEXT
            );
            
            CREATE TABLE IF NOT EXISTS server_operations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                operation_type TEXT,
                server_id TEXT,
                server_name TEXT,
                status TEXT,
                duration INTEGER,
                user_id TEXT
            );
        ";
        
        $this->db->exec($sql);
    }

    /**
     * Get log level dari environment
     */
    private function getLogLevel(): int
    {
        $level = strtoupper($_ENV['LOG_LEVEL'] ?? 'INFO');
        
        return match($level) {
            'DEBUG' => Logger::DEBUG,
            'INFO' => Logger::INFO,
            'WARNING' => Logger::WARNING,
            'ERROR' => Logger::ERROR,
            'CRITICAL' => Logger::CRITICAL,
            default => Logger::INFO
        };
    }

    /**
     * Log info message
     */
    public function info(string $message, array $context = []): void
    {
        $this->logger->info($message, $context);
    }

    /**
     * Log warning message
     */
    public function warning(string $message, array $context = []): void
    {
        $this->logger->warning($message, $context);
    }

    /**
     * Log error message
     */
    public function error(string $message, array $context = []): void
    {
        $this->logger->error($message, $context);
        
        // Simpan ke database
        $this->logErrorToDatabase($message, $context);
    }

    /**
     * Log critical error
     */
    public function critical(string $message, array $context = []): void
    {
        $this->logger->critical($message, $context);
        
        // Simpan ke database
        $this->logErrorToDatabase($message, $context, 'CRITICAL');
    }

    /**
     * Log debug message
     */
    public function debug(string $message, array $context = []): void
    {
        $this->logger->debug($message, $context);
    }

    /**
     * Log aktivitas user
     */
    public function logUserActivity(
        string $userId, 
        string $username, 
        string $action, 
        string $details = '', 
        string $status = 'SUCCESS'
    ): void {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO activity_logs (user_id, username, action, details, status, ip_address)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $userId,
                $username,
                $action,
                $details,
                $status,
                $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);
            
            $this->info("User activity: {$username} ({$userId}) - {$action}", [
                'details' => $details,
                'status' => $status
            ]);
            
        } catch (PDOException $e) {
            $this->error('Gagal log user activity: ' . $e->getMessage());
        }
    }

    /**
     * Log operasi server
     */
    public function logServerOperation(
        string $operationType,
        string $serverId,
        string $serverName,
        string $status,
        int $duration = 0,
        string $userId = ''
    ): void {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO server_operations (operation_type, server_id, server_name, status, duration, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $operationType,
                $serverId,
                $serverName,
                $status,
                $duration,
                $userId
            ]);
            
            $this->info("Server operation: {$operationType} on {$serverName} ({$serverId}) - {$status}", [
                'duration' => $duration,
                'user_id' => $userId
            ]);
            
        } catch (PDOException $e) {
            $this->error('Gagal log server operation: ' . $e->getMessage());
        }
    }

    /**
     * Simpan error ke database
     */
    private function logErrorToDatabase(string $message, array $context, string $type = 'ERROR'): void
    {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO error_logs (error_type, error_message, stack_trace, user_id, context)
                VALUES (?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $type,
                $message,
                debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS),
                $context['user_id'] ?? '',
                json_encode($context)
            ]);
            
        } catch (PDOException $e) {
            // Jika gagal log ke database, minimal log ke file
            $this->logger->error('Gagal log error ke database: ' . $e->getMessage());
        }
    }

    /**
     * Dapatkan statistik aktivitas
     */
    public function getActivityStats(int $days = 7): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    action,
                    COUNT(*) as count,
                    SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count
                FROM activity_logs 
                WHERE timestamp >= datetime('now', '-{$days} days')
                GROUP BY action
                ORDER BY count DESC
            ");
            
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            $this->error('Gagal mengambil statistik aktivitas: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Dapatkan error logs terbaru
     */
    public function getRecentErrors(int $limit = 10): array
    {
        try {
            $stmt = $this->db->prepare("
                SELECT timestamp, error_type, error_message, user_id
                FROM error_logs 
                ORDER BY timestamp DESC 
                LIMIT ?
            ");
            
            $stmt->execute([$limit]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            $this->error('Gagal mengambil error logs: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Cleanup old logs
     */
    public function cleanupOldLogs(int $days = 30): void
    {
        try {
            $tables = ['activity_logs', 'error_logs', 'server_operations'];
            
            foreach ($tables as $table) {
                $stmt = $this->db->prepare("
                    DELETE FROM {$table} 
                    WHERE timestamp < datetime('now', '-{$days} days')
                ");
                $stmt->execute();
                
                $deletedRows = $stmt->rowCount();
                $this->info("Cleaned up {$deletedRows} old records from {$table}");
            }
            
        } catch (PDOException $e) {
            $this->error('Gagal cleanup old logs: ' . $e->getMessage());
        }
    }

    /**
     * Send notification ke owner
     */
    public function notifyOwner(string $message, string $type = 'INFO'): void
    {
        // Implementasi ini akan dipanggil dari Bot class
        // untuk mengirim notifikasi ke owner via Telegram
        $this->info("Owner notification ({$type}): {$message}");
    }
}
