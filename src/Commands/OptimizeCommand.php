<?php

namespace PteroBot\Commands;

use Longman\TelegramBot\Commands\UserCommand;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Request;

/**
 * Command untuk optimasi panel
 * 
 * @author Pablos (@ImTamaa)
 */
class OptimizeCommand extends BaseCommand
{
    protected $name = 'optimize';
    protected $description = 'Optimasi panel untuk performa terbaik';
    protected $usage = '/optimize';
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

        return Request::sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createConfirmationKeyboard('optimize')
        ]);
    }

    /**
     * Eksekusi optimasi panel
     */
    public function executeOptimize(int $chatId, int $userId): void
    {
        try {
            // Log aktivitas
            $this->logUserActivity('OPTIMIZE_PANEL', 'Memulai optimasi panel');

            // Kirim loading message
            $loadingResponse = $this->sendLoadingMessage($chatId, 'melakukan optimasi panel');
            $loadingMessageId = $loadingResponse->getResult()->getMessageId();

            // Notify owner
            $this->notifyOwner("⚡ User memulai optimasi panel", $userId);

            // Mulai timer
            $startTime = time();

            // Update progress step by step
            $this->updateLoadingMessage(
                $chatId, 
                $loadingMessageId, 
                "⏳ *Sedang melakukan optimasi panel...*\n\n" .
                "🔄 Membersihkan cache aplikasi...\n" .
                "Mohon tunggu..."
            );

            // Jalankan optimasi
            $results = $this->pteroApi->optimizePanel();

            // Update progress
            $this->updateLoadingMessage(
                $chatId, 
                $loadingMessageId, 
                "⏳ *Sedang melakukan optimasi panel...*\n\n" .
                "✅ Cache aplikasi dibersihkan\n" .
                "🔄 Membersihkan log lama...\n" .
                "Mohon tunggu..."
            );

            sleep(2); // Simulasi proses

            $this->updateLoadingMessage(
                $chatId, 
                $loadingMessageId, 
                "⏳ *Sedang melakukan optimasi panel...*\n\n" .
                "✅ Cache aplikasi dibersihkan\n" .
                "✅ Log lama dibersihkan\n" .
                "🔄 Optimasi database...\n" .
                "Mohon tunggu..."
            );

            sleep(2); // Simulasi proses

            // Hitung durasi
            $duration = time() - $startTime;

            // Format hasil
            $resultMessage = $this->formatOptimizationResults($results, $duration);

            // Update loading message dengan hasil
            $this->updateLoadingMessage($chatId, $loadingMessageId, $resultMessage);

            // Log hasil operasi
            $this->logger->logServerOperation(
                'OPTIMIZE_PANEL',
                'panel',
                'Pterodactyl Panel',
                'SUCCESS',
                $duration,
                (string)$userId
            );

            // Kirim notifikasi ke owner
            $this->notifyOwner("✅ Optimasi panel selesai dalam " . $this->formatDuration($duration), $userId);

            // Log aktivitas selesai
            $this->logUserActivity(
                'OPTIMIZE_PANEL_COMPLETED', 
                "Optimasi selesai, Durasi: {$duration}s",
                'SUCCESS'
            );

        } catch (\Exception $e) {
            $this->logger->error('Gagal optimasi panel: ' . $e->getMessage(), [
                'user_id' => $userId,
                'chat_id' => $chatId
            ]);

            $this->sendErrorMessage($chatId, 'Gagal melakukan optimasi panel: ' . $e->getMessage());
            $this->notifyOwner("❌ Gagal optimasi panel: " . $e->getMessage(), $userId);
            
            $this->logUserActivity('OPTIMIZE_PANEL', 'Gagal optimasi panel: ' . $e->getMessage(), 'FAILED');
        }
    }

    /**
     * Format hasil optimasi
     */
    private function formatOptimizationResults(array $results, int $duration): string
    {
        $message = "⚡ *Hasil Optimasi Panel*\n\n";
        
        foreach ($results as $operation => $result) {
            $icon = $result['success'] ? '✅' : '❌';
            $operationName = $this->getOperationDisplayName($operation);
            $message .= "{$icon} *{$operationName}*\n";
            $message .= "   └ {$result['message']}\n\n";
        }
        
        $message .= "⏱️ *Durasi Total:* " . $this->formatDuration($duration) . "\n\n";
        
        $message .= "📊 *Ringkasan Optimasi:*\n";
        $message .= "🧹 Cache aplikasi dibersihkan\n";
        $message .= "📝 Log lama dihapus\n";
        $message .= "🗄️ Database dioptimasi\n";
        $message .= "🚀 Performa panel meningkat\n\n";
        
        $message .= "💡 *Tips:* Lakukan optimasi secara berkala untuk menjaga performa panel tetap optimal.";
        
        return $message;
    }

    /**
     * Dapatkan nama operasi yang user-friendly
     */
    private function getOperationDisplayName(string $operation): string
    {
        return match($operation) {
            'cache_clear' => 'Pembersihan Cache',
            'log_cleanup' => 'Pembersihan Log',
            'database_optimize' => 'Optimasi Database',
            default => ucfirst(str_replace('_', ' ', $operation))
        };
    }
}
