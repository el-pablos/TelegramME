<?php

namespace PteroBot\Commands;

use Longman\TelegramBot\Commands\SystemCommand;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Request;

/**
 * Command untuk restart semua server
 * 
 * @author Pablos (@ImTamaa)
 */
class RestartAllCommand extends BaseCommand
{
    protected $name = 'restartall';
    protected $description = 'Restart semua server sekaligus';
    protected $usage = '/restartall';
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

        // Kirim konfirmasi
        return $this->sendConfirmationMessage($chatId);
    }

    /**
     * Kirim pesan konfirmasi
     */
    private function sendConfirmationMessage(int $chatId): ServerResponse
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

        return Request::sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createConfirmationKeyboard('restart_all')
        ]);
    }

    /**
     * Eksekusi restart all servers
     */
    public function executeRestartAll(int $chatId, int $userId): void
    {
        try {
            // Log aktivitas
            $this->logUserActivity('RESTART_ALL_SERVERS', 'Memulai restart semua server');

            // Kirim loading message
            $loadingResponse = $this->sendLoadingMessage($chatId, 'melakukan restart semua server');
            $loadingMessageId = $loadingResponse->getResult()->getMessageId();

            // Notify owner
            $this->notifyOwner("🔄 User memulai restart semua server", $userId);

            // Mulai timer
            $startTime = time();

            // Dapatkan semua server dan restart
            $results = $this->pteroApi->restartAllServers();

            // Hitung durasi
            $duration = time() - $startTime;

            // Log hasil operasi
            foreach ($results as $serverId => $result) {
                $this->logger->logServerOperation(
                    'RESTART',
                    $serverId,
                    $result['server_name'],
                    $result['success'] ? 'SUCCESS' : 'FAILED',
                    $duration,
                    (string)$userId
                );
            }

            // Format hasil
            $resultMessage = $this->formatOperationResults($results, 'Restart All Servers');
            $resultMessage .= "\n\n⏱️ Durasi: " . $this->formatDuration($duration);

            // Update loading message dengan hasil
            $this->updateLoadingMessage($chatId, $loadingMessageId, $resultMessage);

            // Kirim notifikasi ke owner
            $successCount = count(array_filter($results, fn($r) => $r['success']));
            $totalCount = count($results);
            $this->notifyOwner("✅ Restart all selesai: {$successCount}/{$totalCount} berhasil", $userId);

            // Log aktivitas selesai
            $this->logUserActivity(
                'RESTART_ALL_SERVERS_COMPLETED', 
                "Berhasil: {$successCount}/{$totalCount}, Durasi: {$duration}s",
                $successCount > 0 ? 'SUCCESS' : 'FAILED'
            );

        } catch (\Exception $e) {
            $this->logger->error('Gagal restart all servers: ' . $e->getMessage(), [
                'user_id' => $userId,
                'chat_id' => $chatId
            ]);

            $this->sendErrorMessage($chatId, 'Gagal melakukan restart semua server: ' . $e->getMessage());
            $this->notifyOwner("❌ Gagal restart all servers: " . $e->getMessage(), $userId);
            
            $this->logUserActivity('RESTART_ALL_SERVERS', 'Gagal restart semua server: ' . $e->getMessage(), 'FAILED');
        }
    }
}
