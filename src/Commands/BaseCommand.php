<?php

namespace PteroBot\Commands;

use Longman\TelegramBot\Commands\Command;
use Longman\TelegramBot\Entities\InlineKeyboard;
use Longman\TelegramBot\Entities\InlineKeyboardButton;
use Longman\TelegramBot\Request;
use PteroBot\Services\LoggingService;
use PteroBot\Services\PteroApiService;
use PteroBot\Services\SecurityService;

/**
 * Base command class dengan fungsi-fungsi umum
 * 
 * @author Pablos (@ImTamaa)
 */
abstract class BaseCommand extends Command
{
    protected LoggingService $logger;
    protected PteroApiService $pteroApi;
    protected SecurityService $security;
    protected string $ownerTelegramId;
    protected array $allowedUsers;

    public function __construct($telegram, $update = null)
    {
        parent::__construct($telegram, $update);
        
        $this->logger = new LoggingService();
        $this->pteroApi = new PteroApiService($this->logger);
        $this->security = new SecurityService($this->logger);
        $this->ownerTelegramId = $_ENV['OWNER_TELEGRAM_ID'];
        $this->allowedUsers = explode(',', $_ENV['ALLOWED_USERS'] ?? $_ENV['OWNER_TELEGRAM_ID']);
    }

    /**
     * Cek apakah user diizinkan menggunakan bot
     */
    protected function isUserAllowed(int $userId): bool
    {
        return $this->security->isUserAllowed($userId);
    }

    /**
     * Kirim pesan unauthorized
     */
    protected function sendUnauthorizedMessage(int $chatId): void
    {
        $message = "🚫 *Akses Ditolak*\n\n";
        $message .= "Maaf, Anda tidak memiliki izin untuk menggunakan bot ini.\n";
        $message .= "Hubungi @ImTamaa untuk mendapatkan akses.";

        Request::sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'Markdown'
        ]);
    }

    /**
     * Buat inline keyboard untuk menu utama
     */
    protected function createMainMenuKeyboard(): InlineKeyboard
    {
        return new InlineKeyboard([
            [
                InlineKeyboardButton::make('🔄 Restart All Servers', '', 'restart_all_confirm'),
                InlineKeyboardButton::make('🔧 Reinstall All Servers', '', 'reinstall_all_confirm')
            ],
            [
                InlineKeyboardButton::make('⚡ Optimize Panel', '', 'optimize_confirm'),
                InlineKeyboardButton::make('📊 Server Stats', '', 'server_stats')
            ],
            [
                InlineKeyboardButton::make('➕ Manage Servers', '', 'manage_servers'),
                InlineKeyboardButton::make('📋 Activity Logs', '', 'activity_logs')
            ],
            [
                InlineKeyboardButton::make('ℹ️ Help', '', 'help'),
                InlineKeyboardButton::make('⚙️ Settings', '', 'settings')
            ]
        ]);
    }

    /**
     * Buat keyboard konfirmasi
     */
    protected function createConfirmationKeyboard(string $action): InlineKeyboard
    {
        return new InlineKeyboard([
            [
                InlineKeyboardButton::make('✅ Ya, Lanjutkan', '', $action . '_execute'),
                InlineKeyboardButton::make('❌ Batal', '', 'cancel_action')
            ],
            [
                InlineKeyboardButton::make('🔙 Kembali ke Menu', '', 'main_menu')
            ]
        ]);
    }

    /**
     * Buat keyboard untuk manage servers
     */
    protected function createManageServersKeyboard(): InlineKeyboard
    {
        return new InlineKeyboard([
            [
                InlineKeyboardButton::make('📝 Daftar Server', '', 'list_servers'),
                InlineKeyboardButton::make('🔍 Cari Server', '', 'search_server')
            ],
            [
                InlineKeyboardButton::make('🔄 Restart Server', '', 'restart_single'),
                InlineKeyboardButton::make('🔧 Reinstall Server', '', 'reinstall_single')
            ],
            [
                InlineKeyboardButton::make('⏹️ Stop Server', '', 'stop_single'),
                InlineKeyboardButton::make('▶️ Start Server', '', 'start_single')
            ],
            [
                InlineKeyboardButton::make('🔙 Kembali ke Menu', '', 'main_menu')
            ]
        ]);
    }

    /**
     * Format hasil operasi untuk ditampilkan
     */
    protected function formatOperationResults(array $results, string $operation): string
    {
        $message = "📊 *Hasil {$operation}*\n\n";
        
        $successCount = 0;
        $failedCount = 0;
        
        foreach ($results as $serverId => $result) {
            $icon = $result['success'] ? '✅' : '❌';
            $serverName = $result['server_name'] ?? $serverId;
            $message .= "{$icon} *{$serverName}*\n";
            $message .= "   └ {$result['message']}\n\n";
            
            if ($result['success']) {
                $successCount++;
            } else {
                $failedCount++;
            }
        }
        
        $message .= "📈 *Ringkasan:*\n";
        $message .= "✅ Berhasil: {$successCount}\n";
        $message .= "❌ Gagal: {$failedCount}\n";
        $message .= "📊 Total: " . count($results);
        
        return $message;
    }

    /**
     * Kirim notifikasi ke owner
     */
    protected function notifyOwner(string $message, int $fromUserId = null): void
    {
        $notification = "🔔 *Notifikasi Bot*\n\n";
        $notification .= $message;
        
        if ($fromUserId && $fromUserId != $this->ownerTelegramId) {
            $notification .= "\n\n👤 Dari User ID: {$fromUserId}";
        }
        
        $notification .= "\n\n⏰ " . date('Y-m-d H:i:s');

        Request::sendMessage([
            'chat_id' => $this->ownerTelegramId,
            'text' => $notification,
            'parse_mode' => 'Markdown'
        ]);
    }

    /**
     * Kirim pesan loading
     */
    protected function sendLoadingMessage(int $chatId, string $operation): array
    {
        $message = "⏳ *Sedang {$operation}...*\n\n";
        $message .= "Mohon tunggu, proses sedang berjalan.\n";
        $message .= "Anda akan mendapat notifikasi setelah selesai.";

        return Request::sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'Markdown'
        ]);
    }

    /**
     * Update pesan loading
     */
    protected function updateLoadingMessage(int $chatId, int $messageId, string $newText): void
    {
        Request::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $newText,
            'parse_mode' => 'Markdown'
        ]);
    }

    /**
     * Kirim pesan error
     */
    protected function sendErrorMessage(int $chatId, string $error): void
    {
        $message = "❌ *Terjadi Kesalahan*\n\n";
        $message .= $error;
        $message .= "\n\nJika masalah berlanjut, hubungi @ImTamaa";

        Request::sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => new InlineKeyboard([
                [InlineKeyboardButton::make('🔙 Kembali ke Menu', '', 'main_menu')]
            ])
        ]);
    }

    /**
     * Log aktivitas user
     */
    protected function logUserActivity(string $action, string $details = '', string $status = 'SUCCESS'): void
    {
        $user = $this->getMessage()->getFrom();
        $userId = $user->getId();
        $username = $user->getUsername() ?? $user->getFirstName();
        
        $this->logger->logUserActivity($userId, $username, $action, $details, $status);
    }

    /**
     * Validasi input server ID
     */
    protected function validateServerId(string $serverId): bool
    {
        return $this->security->validateServerId($serverId);
    }

    /**
     * Format durasi dalam detik ke format yang readable
     */
    protected function formatDuration(int $seconds): string
    {
        if ($seconds < 60) {
            return "{$seconds} detik";
        } elseif ($seconds < 3600) {
            $minutes = floor($seconds / 60);
            return "{$minutes} menit";
        } else {
            $hours = floor($seconds / 3600);
            $minutes = floor(($seconds % 3600) / 60);
            return "{$hours} jam {$minutes} menit";
        }
    }

    /**
     * Escape markdown characters
     */
    protected function escapeMarkdown(string $text): string
    {
        $chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
        foreach ($chars as $char) {
            $text = str_replace($char, '\\' . $char, $text);
        }
        return $text;
    }
}
