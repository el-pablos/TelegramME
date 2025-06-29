<?php

namespace PteroBot\Commands;

use Longman\TelegramBot\Commands\SystemCommand;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Request;

/**
 * Callback query handler untuk inline keyboard
 * 
 * @author Pablos (@ImTamaa)
 */
class CallbackqueryCommand extends BaseCommand
{
    protected $name = 'callbackquery';
    protected $description = 'Handle callback queries dari inline keyboard';
    protected $version = '1.0.0';

    public function execute(): ServerResponse
    {
        $callbackQuery = $this->getCallbackQuery();
        $data = $callbackQuery->getData();
        $chatId = $callbackQuery->getMessage()->getChat()->getId();
        $messageId = $callbackQuery->getMessage()->getMessageId();
        $userId = $callbackQuery->getFrom()->getId();

        // Cek authorization
        if (!$this->isUserAllowed($userId)) {
            return Request::answerCallbackQuery([
                'callback_query_id' => $callbackQuery->getId(),
                'text' => '🚫 Akses ditolak!',
                'show_alert' => true
            ]);
        }

        // Answer callback query untuk menghilangkan loading
        Request::answerCallbackQuery([
            'callback_query_id' => $callbackQuery->getId()
        ]);

        // Route berdasarkan callback data
        return $this->routeCallback($data, $chatId, $messageId, $userId);
    }

    /**
     * Route callback berdasarkan data
     */
    private function routeCallback(string $data, int $chatId, int $messageId, int $userId): ServerResponse
    {
        switch ($data) {
            // Main menu callbacks
            case 'main_menu':
                return $this->showMainMenu($chatId, $messageId);
                
            // Restart All callbacks
            case 'restart_all_confirm':
                return $this->showRestartAllConfirmation($chatId, $messageId);
            case 'restart_all_execute':
                $this->executeRestartAll($chatId, $userId);
                break;
                
            // Reinstall All callbacks
            case 'reinstall_all_confirm':
                return $this->showReinstallAllConfirmation($chatId, $messageId);
            case 'reinstall_all_execute':
                $this->executeReinstallAll($chatId, $userId);
                break;
                
            // Optimize callbacks
            case 'optimize_confirm':
                return $this->showOptimizeConfirmation($chatId, $messageId);
            case 'optimize_execute':
                $this->executeOptimize($chatId, $userId);
                break;
                
            // Manage servers callbacks
            case 'manage_servers':
                return $this->showManageServers($chatId, $messageId);
            case 'list_servers':
                $this->showServerList($chatId, $userId);
                break;
            case 'search_server':
                return $this->showSearchServer($chatId, $messageId);
                
            // Server stats callback
            case 'server_stats':
                $this->showServerStats($chatId, $userId);
                break;
                
            // Activity logs callback
            case 'activity_logs':
                $this->showActivityLogs($chatId, $userId);
                break;
                
            // Help callback
            case 'help':
                return $this->showHelp($chatId, $messageId);
                
            // Settings callback
            case 'settings':
                return $this->showSettings($chatId, $messageId);
                
            // Cancel action
            case 'cancel_action':
                return $this->showMainMenu($chatId, $messageId, '❌ Aksi dibatalkan.');
                
            default:
                return $this->handleUnknownCallback($data, $chatId, $messageId);
        }

        return Request::emptyResponse();
    }

    /**
     * Tampilkan main menu
     */
    private function showMainMenu(int $chatId, int $messageId, string $prefix = ''): ServerResponse
    {
        $message = $prefix;
        if (!empty($prefix)) $message .= "\n\n";
        
        $message .= "🚀 *Pterodactyl Control Bot*\n\n";
        $message .= "Pilih operasi yang ingin dilakukan:";

        return Request::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createMainMenuKeyboard()
        ]);
    }

    /**
     * Tampilkan konfirmasi restart all
     */
    private function showRestartAllConfirmation(int $chatId, int $messageId): ServerResponse
    {
        $message = "⚠️ *Konfirmasi Restart All Servers*\n\n";
        $message .= "Anda akan melakukan restart pada SEMUA server di panel.\n\n";
        $message .= "⚡ *Yang akan terjadi:*\n";
        $message .= "• Semua server akan di-restart secara bersamaan\n";
        $message .= "• Proses akan berjalan dalam background\n";
        $message .= "• Anda akan mendapat laporan hasil\n";
        $message .= "• Downtime sementara pada semua server\n\n";
        $message .= "🔥 *PERINGATAN:* Pastikan tidak ada proses penting yang sedang berjalan!\n\n";
        $message .= "Apakah Anda yakin ingin melanjutkan?";

        return Request::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createConfirmationKeyboard('restart_all')
        ]);
    }

    /**
     * Tampilkan konfirmasi reinstall all
     */
    private function showReinstallAllConfirmation(int $chatId, int $messageId): ServerResponse
    {
        $message = "⚠️ *Konfirmasi Reinstall All Servers*\n\n";
        $message .= "Anda akan melakukan reinstall pada SEMUA server di panel.\n\n";
        $message .= "🔧 *Yang akan terjadi:*\n";
        $message .= "• Semua server akan di-reinstall tanpa menghapus config\n";
        $message .= "• File sistem akan di-refresh\n";
        $message .= "• Konfigurasi dan data akan tetap aman\n";
        $message .= "• Proses akan berjalan dalam background\n";
        $message .= "• Server akan restart otomatis setelah reinstall\n\n";
        $message .= "⏰ *Estimasi waktu:* 5-15 menit per server\n\n";
        $message .= "🔥 *PERINGATAN:* Server akan offline selama proses reinstall!\n\n";
        $message .= "Apakah Anda yakin ingin melanjutkan?";

        return Request::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createConfirmationKeyboard('reinstall_all')
        ]);
    }

    /**
     * Tampilkan konfirmasi optimize
     */
    private function showOptimizeConfirmation(int $chatId, int $messageId): ServerResponse
    {
        $message = "⚡ *Konfirmasi Optimasi Panel*\n\n";
        $message .= "Anda akan melakukan optimasi pada panel Pterodactyl.\n\n";
        $message .= "🔧 *Yang akan dilakukan:*\n";
        $message .= "• Membersihkan cache aplikasi\n";
        $message .= "• Menghapus log lama yang tidak diperlukan\n";
        $message .= "• Optimasi database dan index\n";
        $message .= "• Restart service yang diperlukan\n";
        $message .= "• Cleanup temporary files\n\n";
        $message .= "📈 *Manfaat:*\n";
        $message .= "• Panel akan lebih responsif\n";
        $message .= "• Penggunaan storage berkurang\n";
        $message .= "• Performa database meningkat\n";
        $message .= "• Mengurangi memory usage\n\n";
        $message .= "⏰ *Estimasi waktu:* 2-5 menit\n\n";
        $message .= "Apakah Anda yakin ingin melanjutkan?";

        return Request::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createConfirmationKeyboard('optimize')
        ]);
    }

    /**
     * Tampilkan menu manage servers
     */
    private function showManageServers(int $chatId, int $messageId): ServerResponse
    {
        $message = "🛠️ *Manage Servers*\n\n";
        $message .= "Pilih operasi yang ingin dilakukan:\n\n";
        $message .= "📋 *Informasi:*\n";
        $message .= "• Lihat daftar semua server\n";
        $message .= "• Cari server berdasarkan nama/ID\n";
        $message .= "• Monitor status server\n\n";
        $message .= "⚡ *Operasi Individual:*\n";
        $message .= "• Restart/Stop/Start server tertentu\n";
        $message .= "• Reinstall server tertentu\n";
        $message .= "• Lihat detail server\n\n";
        $message .= "Pilih menu di bawah:";

        return Request::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createManageServersKeyboard()
        ]);
    }

    /**
     * Tampilkan search server
     */
    private function showSearchServer(int $chatId, int $messageId): ServerResponse
    {
        $message = "🔍 *Cari Server*\n\n";
        $message .= "Masukkan nama server atau ID server yang ingin dicari:\n\n";
        $message .= "Contoh:\n";
        $message .= "• `minecraft-server`\n";
        $message .= "• `a1b2c3d4`\n\n";
        $message .= "Ketik nama/ID server di chat:";

        return Request::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createManageServersKeyboard()
        ]);
    }

    /**
     * Tampilkan help
     */
    private function showHelp(int $chatId, int $messageId): ServerResponse
    {
        $message = "ℹ️ *Bantuan Pterodactyl Control Bot*\n\n";
        $message .= "🚀 *Fitur Utama:*\n";
        $message .= "• `/start` - Menu utama bot\n";
        $message .= "• `Restart All` - Restart semua server\n";
        $message .= "• `Reinstall All` - Reinstall semua server\n";
        $message .= "• `Optimize` - Optimasi panel\n";
        $message .= "• `Manage Servers` - Kelola server individual\n\n";
        $message .= "📋 *Tips Penggunaan:*\n";
        $message .= "• Selalu konfirmasi sebelum operasi massal\n";
        $message .= "• Monitor status server setelah operasi\n";
        $message .= "• Gunakan fitur search untuk server tertentu\n";
        $message .= "• Periksa activity logs untuk tracking\n\n";
        $message .= "⚠️ *Peringatan:*\n";
        $message .= "• Operasi restart/reinstall menyebabkan downtime\n";
        $message .= "• Pastikan tidak ada proses penting saat operasi\n";
        $message .= "• Hubungi admin jika ada masalah\n\n";
        $message .= "👨‍💻 *Developer:* " . $this->escapeMarkdown($_ENV['AUTHOR_NAME']) . " (" . $this->escapeMarkdown($_ENV['AUTHOR_TELEGRAM']) . ")";

        return Request::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createMainMenuKeyboard()
        ]);
    }

    /**
     * Tampilkan settings
     */
    private function showSettings(int $chatId, int $messageId): ServerResponse
    {
        $message = "⚙️ *Pengaturan Bot*\n\n";
        $message .= "📊 *Informasi Panel:*\n";
        $message .= "🌐 URL: " . $this->escapeMarkdown($_ENV['PTERODACTYL_PANEL_URL']) . "\n";
        $message .= "🔑 API Status: ✅ Terhubung\n";
        $message .= "👤 Owner: " . $this->escapeMarkdown($_ENV['OWNER_TELEGRAM_ID']) . "\n\n";
        $message .= "⚡ *Konfigurasi:*\n";
        $message .= "🕐 Timeout: " . ($_ENV['OPERATION_TIMEOUT'] ?? 300) . " detik\n";
        $message .= "🔄 Max Concurrent: " . ($_ENV['MAX_CONCURRENT_OPERATIONS'] ?? 10) . "\n";
        $message .= "📝 Log Level: " . ($_ENV['LOG_LEVEL'] ?? 'INFO') . "\n";
        $message .= "🐛 Debug Mode: " . ($_ENV['DEBUG_MODE'] === 'true' ? '✅ Aktif' : '❌ Nonaktif') . "\n\n";
        $message .= "📈 *Statistik akan ditampilkan di sini*";

        return Request::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createMainMenuKeyboard()
        ]);
    }

    /**
     * Handle callback yang tidak dikenal
     */
    private function handleUnknownCallback(string $data, int $chatId, int $messageId): ServerResponse
    {
        $this->logger->warning("Unknown callback data: {$data}");
        
        return Request::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => "❌ *Perintah tidak dikenal*\n\nKembali ke menu utama:",
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createMainMenuKeyboard()
        ]);
    }

    // Delegate methods ke command yang sesuai
    private function executeRestartAll(int $chatId, int $userId): void
    {
        $command = new RestartAllCommand($this->telegram);
        $command->executeRestartAll($chatId, $userId);
    }

    private function executeReinstallAll(int $chatId, int $userId): void
    {
        $command = new ReinstallAllCommand($this->telegram);
        $command->executeReinstallAll($chatId, $userId);
    }

    private function executeOptimize(int $chatId, int $userId): void
    {
        $command = new OptimizeCommand($this->telegram);
        $command->executeOptimize($chatId, $userId);
    }

    private function showServerList(int $chatId, int $userId): void
    {
        $command = new ManagePanelsCommand($this->telegram);
        $command->showServerList($chatId, $userId);
    }

    private function showServerStats(int $chatId, int $userId): void
    {
        // Implementasi show server stats
        $this->logger->info("User {$userId} requested server stats");
        // TODO: Implement server stats display
    }

    private function showActivityLogs(int $chatId, int $userId): void
    {
        // Implementasi show activity logs
        $this->logger->info("User {$userId} requested activity logs");
        // TODO: Implement activity logs display
    }
}
