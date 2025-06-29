<?php

namespace PteroBot\Commands;

use Longman\TelegramBot\Commands\SystemCommand;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Request;

/**
 * Command untuk reinstall semua server
 * 
 * @author Pablos (@ImTamaa)
 */
class ReinstallAllCommand extends BaseCommand
{
    protected $name = 'reinstallall';
    protected $description = 'Reinstall semua server tanpa menghapus config';
    protected $usage = '/reinstallall';
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

        return Request::sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createConfirmationKeyboard('reinstall_all')
        ]);
    }

    /**
     * Eksekusi reinstall all servers
     */
    public function executeReinstallAll(int $chatId, int $userId): void
    {
        try {
            // Log aktivitas
            $this->logUserActivity('REINSTALL_ALL_SERVERS', 'Memulai reinstall semua server');

            // Kirim loading message
            $loadingResponse = $this->sendLoadingMessage($chatId, 'melakukan reinstall semua server');
            $loadingMessageId = $loadingResponse->getResult()->getMessageId();

            // Notify owner
            $this->notifyOwner("🔧 User memulai reinstall semua server", $userId);

            // Mulai timer
            $startTime = time();

            // Update loading message dengan progress
            $this->updateLoadingMessage(
                $chatId, 
                $loadingMessageId, 
                "⏳ *Sedang melakukan reinstall semua server...*\n\n" .
                "📋 Mengambil daftar server...\n" .
                "Mohon tunggu, proses ini membutuhkan waktu lebih lama."
            );

            // Dapatkan semua server dan reinstall
            $results = $this->pteroApi->reinstallAllServers();

            // Hitung durasi
            $duration = time() - $startTime;

            // Log hasil operasi
            foreach ($results as $serverId => $result) {
                $this->logger->logServerOperation(
                    'REINSTALL',
                    $serverId,
                    $result['server_name'],
                    $result['success'] ? 'SUCCESS' : 'FAILED',
                    $duration,
                    (string)$userId
                );
            }

            // Format hasil
            $resultMessage = $this->formatOperationResults($results, 'Reinstall All Servers');
            $resultMessage .= "\n\n⏱️ Durasi: " . $this->formatDuration($duration);
            $resultMessage .= "\n\n📝 *Catatan:*\n";
            $resultMessage .= "• Server yang berhasil akan restart otomatis\n";
            $resultMessage .= "• Konfigurasi dan data tetap aman\n";
            $resultMessage .= "• Monitor status server untuk memastikan semuanya normal";

            // Update loading message dengan hasil
            $this->updateLoadingMessage($chatId, $loadingMessageId, $resultMessage);

            // Kirim notifikasi ke owner
            $successCount = count(array_filter($results, fn($r) => $r['success']));
            $totalCount = count($results);
            $this->notifyOwner("✅ Reinstall all selesai: {$successCount}/{$totalCount} berhasil", $userId);

            // Log aktivitas selesai
            $this->logUserActivity(
                'REINSTALL_ALL_SERVERS_COMPLETED', 
                "Berhasil: {$successCount}/{$totalCount}, Durasi: {$duration}s",
                $successCount > 0 ? 'SUCCESS' : 'FAILED'
            );

        } catch (\Exception $e) {
            $this->logger->error('Gagal reinstall all servers: ' . $e->getMessage(), [
                'user_id' => $userId,
                'chat_id' => $chatId
            ]);

            $this->sendErrorMessage($chatId, 'Gagal melakukan reinstall semua server: ' . $e->getMessage());
            $this->notifyOwner("❌ Gagal reinstall all servers: " . $e->getMessage(), $userId);
            
            $this->logUserActivity('REINSTALL_ALL_SERVERS', 'Gagal reinstall semua server: ' . $e->getMessage(), 'FAILED');
        }
    }
}
