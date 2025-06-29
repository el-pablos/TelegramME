<?php

namespace PteroBot\Commands;

use Longman\TelegramBot\Commands\UserCommand;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Entities\InlineKeyboard;
use Longman\TelegramBot\Entities\InlineKeyboardButton;
use Longman\TelegramBot\Request;

/**
 * Command untuk manage panels/servers
 * 
 * @author Pablos (@ImTamaa)
 */
class ManagePanelsCommand extends BaseCommand
{
    protected $name = 'manage';
    protected $description = 'Manage server individual atau massal';
    protected $usage = '/manage';
    protected $version = '1.0.0';

    public function execute(): ServerResponse
    {
        $message = $this->getMessage();
        $chatId = $message->getChat()->getId();
        $userId = $message->getFrom()->getId();

        // Cek authorization
        if (!$this->isUserAllowed($userId)) {
            $this->sendUnauthorizedMessage($chatId);
            return Request::emptyResponse();
        }

        // Log aktivitas
        $this->logUserActivity('MANAGE_PANELS', 'Membuka menu manage panels');

        // Kirim menu manage
        return $this->sendManageMenu($chatId);
    }

    /**
     * Kirim menu manage panels
     */
    private function sendManageMenu(int $chatId): ServerResponse
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

        return Request::sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createManageServersKeyboard()
        ]);
    }

    /**
     * Tampilkan daftar server
     */
    public function showServerList(int $chatId, int $userId): void
    {
        try {
            // Log aktivitas
            $this->logUserActivity('LIST_SERVERS', 'Melihat daftar server');

            // Kirim loading message
            $loadingResponse = $this->sendLoadingMessage($chatId, 'mengambil daftar server');
            $loadingMessageId = $loadingResponse->getResult()->getMessageId();

            // Ambil daftar server
            $servers = $this->pteroApi->getAllServers();

            if (empty($servers)) {
                $this->updateLoadingMessage(
                    $chatId, 
                    $loadingMessageId, 
                    "📋 *Daftar Server*\n\n❌ Tidak ada server ditemukan."
                );
                return;
            }

            // Format daftar server
            $message = "📋 *Daftar Server* (" . count($servers) . " server)\n\n";
            
            foreach ($servers as $index => $server) {
                $attributes = $server['attributes'];
                $serverId = $attributes['identifier'];
                $serverName = $attributes['name'];
                $status = $this->pteroApi->getServerStatus($serverId) ?? 'unknown';
                
                $statusIcon = $this->getStatusIcon($status);
                
                $message .= "🖥️ *{$serverName}*\n";
                $message .= "   📋 ID: `{$serverId}`\n";
                $message .= "   {$statusIcon} Status: " . ucfirst($status) . "\n";
                $message .= "   🌐 Node: " . ($attributes['node'] ?? 'N/A') . "\n\n";
                
                // Batasi tampilan untuk menghindari pesan terlalu panjang
                if ($index >= 9) {
                    $remaining = count($servers) - 10;
                    $message .= "... dan {$remaining} server lainnya\n\n";
                    break;
                }
            }

            $message .= "💡 *Tip:* Gunakan /search untuk mencari server tertentu";

            // Update loading message dengan hasil
            $this->updateLoadingMessage($chatId, $loadingMessageId, $message);

            // Kirim keyboard untuk operasi lanjutan
            Request::sendMessage([
                'chat_id' => $chatId,
                'text' => "Pilih operasi untuk server:",
                'reply_markup' => $this->createServerOperationKeyboard()
            ]);

        } catch (\Exception $e) {
            $this->logger->error('Gagal mengambil daftar server: ' . $e->getMessage(), [
                'user_id' => $userId,
                'chat_id' => $chatId
            ]);

            $this->sendErrorMessage($chatId, 'Gagal mengambil daftar server: ' . $e->getMessage());
        }
    }

    /**
     * Cari server berdasarkan nama atau ID
     */
    public function searchServer(int $chatId, int $userId, string $query = ''): void
    {
        if (empty($query)) {
            // Minta input dari user
            $message = "🔍 *Cari Server*\n\n";
            $message .= "Masukkan nama server atau ID server yang ingin dicari:\n\n";
            $message .= "Contoh:\n";
            $message .= "• `minecraft-server`\n";
            $message .= "• `a1b2c3d4`\n\n";
            $message .= "Ketik nama/ID server:";

            Request::sendMessage([
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'Markdown',
                'reply_markup' => new InlineKeyboard([
                    [InlineKeyboardButton::make('🔙 Kembali', '', 'manage_servers')]
                ])
            ]);
            return;
        }

        try {
            // Log aktivitas
            $this->logUserActivity('SEARCH_SERVER', "Mencari server: {$query}");

            // Kirim loading message
            $loadingResponse = $this->sendLoadingMessage($chatId, 'mencari server');
            $loadingMessageId = $loadingResponse->getResult()->getMessageId();

            // Ambil semua server
            $servers = $this->pteroApi->getAllServers();
            $foundServers = [];

            // Cari server yang cocok
            foreach ($servers as $server) {
                $attributes = $server['attributes'];
                $serverId = $attributes['identifier'];
                $serverName = strtolower($attributes['name']);
                $queryLower = strtolower($query);

                if (strpos($serverName, $queryLower) !== false || strpos($serverId, $queryLower) !== false) {
                    $foundServers[] = $server;
                }
            }

            if (empty($foundServers)) {
                $this->updateLoadingMessage(
                    $chatId, 
                    $loadingMessageId, 
                    "🔍 *Hasil Pencarian*\n\n❌ Tidak ada server ditemukan dengan kata kunci: `{$query}`"
                );
                return;
            }

            // Format hasil pencarian
            $message = "🔍 *Hasil Pencarian* (" . count($foundServers) . " server)\n";
            $message .= "Kata kunci: `{$query}`\n\n";
            
            foreach ($foundServers as $server) {
                $attributes = $server['attributes'];
                $serverId = $attributes['identifier'];
                $serverName = $attributes['name'];
                $status = $this->pteroApi->getServerStatus($serverId) ?? 'unknown';
                
                $statusIcon = $this->getStatusIcon($status);
                
                $message .= "🖥️ *{$serverName}*\n";
                $message .= "   📋 ID: `{$serverId}`\n";
                $message .= "   {$statusIcon} Status: " . ucfirst($status) . "\n\n";
            }

            // Update loading message dengan hasil
            $this->updateLoadingMessage($chatId, $loadingMessageId, $message);

        } catch (\Exception $e) {
            $this->logger->error('Gagal mencari server: ' . $e->getMessage(), [
                'user_id' => $userId,
                'chat_id' => $chatId,
                'query' => $query
            ]);

            $this->sendErrorMessage($chatId, 'Gagal mencari server: ' . $e->getMessage());
        }
    }

    /**
     * Restart server individual
     */
    public function restartSingleServer(int $chatId, int $userId, string $serverId): void
    {
        try {
            // Validasi server ID
            if (!$this->validateServerId($serverId)) {
                $this->sendErrorMessage($chatId, 'Format Server ID tidak valid. Gunakan format 8 karakter alphanumeric.');
                return;
            }

            // Log aktivitas
            $this->logUserActivity('RESTART_SINGLE_SERVER', "Restart server: {$serverId}");

            // Kirim loading message
            $loadingResponse = $this->sendLoadingMessage($chatId, "melakukan restart server {$serverId}");
            $loadingMessageId = $loadingResponse->getResult()->getMessageId();

            // Mulai timer
            $startTime = time();

            // Restart server
            $success = $this->pteroApi->restartServer($serverId);
            $duration = time() - $startTime;

            // Ambil info server untuk nama
            $serverInfo = $this->pteroApi->getServerInfo($serverId);
            $serverName = $serverInfo['name'] ?? $serverId;

            // Format hasil
            $icon = $success ? '✅' : '❌';
            $status = $success ? 'berhasil' : 'gagal';
            
            $resultMessage = "{$icon} *Restart Server {$status}*\n\n";
            $resultMessage .= "🖥️ Server: {$serverName}\n";
            $resultMessage .= "📋 ID: `{$serverId}`\n";
            $resultMessage .= "⏱️ Durasi: " . $this->formatDuration($duration) . "\n";
            
            if ($success) {
                $resultMessage .= "\n✅ Server berhasil di-restart dan akan online dalam beberapa saat.";
            } else {
                $resultMessage .= "\n❌ Gagal restart server. Periksa status server atau hubungi admin.";
            }

            // Update loading message dengan hasil
            $this->updateLoadingMessage($chatId, $loadingMessageId, $resultMessage);

            // Log hasil operasi
            $this->logger->logServerOperation(
                'RESTART',
                $serverId,
                $serverName,
                $success ? 'SUCCESS' : 'FAILED',
                $duration,
                (string)$userId
            );

            // Notify owner jika gagal
            if (!$success) {
                $this->notifyOwner("❌ Gagal restart server {$serverName} ({$serverId})", $userId);
            }

        } catch (\Exception $e) {
            $this->logger->error("Gagal restart server {$serverId}: " . $e->getMessage(), [
                'user_id' => $userId,
                'chat_id' => $chatId
            ]);

            $this->sendErrorMessage($chatId, "Gagal restart server: " . $e->getMessage());
        }
    }

    /**
     * Buat keyboard untuk operasi server
     */
    private function createServerOperationKeyboard(): InlineKeyboard
    {
        return new InlineKeyboard([
            [
                InlineKeyboardButton::make('🔄 Restart Server', '', 'restart_single_input'),
                InlineKeyboardButton::make('🔧 Reinstall Server', '', 'reinstall_single_input')
            ],
            [
                InlineKeyboardButton::make('⏹️ Stop Server', '', 'stop_single_input'),
                InlineKeyboardButton::make('▶️ Start Server', '', 'start_single_input')
            ],
            [
                InlineKeyboardButton::make('📊 Server Stats', '', 'server_stats_input'),
                InlineKeyboardButton::make('🔍 Search Again', '', 'search_server')
            ],
            [
                InlineKeyboardButton::make('🔙 Kembali', '', 'manage_servers')
            ]
        ]);
    }

    /**
     * Dapatkan icon status server
     */
    private function getStatusIcon(string $status): string
    {
        return match(strtolower($status)) {
            'running' => '🟢',
            'stopped' => '🔴',
            'starting' => '🟡',
            'stopping' => '🟠',
            'installing' => '🔵',
            default => '⚪'
        };
    }
}
