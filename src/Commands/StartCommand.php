<?php

namespace PteroBot\Commands;

use Longman\TelegramBot\Commands\SystemCommand;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Request;

/**
 * Start command - Menu utama bot
 * 
 * @author Pablos (@ImTamaa)
 */
class StartCommand extends BaseCommand
{
    protected $name = 'start';
    protected $description = 'Mulai menggunakan Pterodactyl Control Bot';
    protected $usage = '/start';
    protected $version = '1.0.0';

    public function execute(): ServerResponse
    {
        $message = $this->getMessage();
        $chatId = $message->getChat()->getId();
        $userId = $message->getFrom()->getId();
        $username = $message->getFrom()->getUsername() ?? $message->getFrom()->getFirstName();

        // Cek authorization
        if (!$this->isUserAllowed($userId)) {
            $this->logger->warning("Unauthorized access attempt", [
                'user_id' => $userId,
                'username' => $username,
                'chat_id' => $chatId
            ]);
            
            $this->sendUnauthorizedMessage($chatId);
            return Request::emptyResponse();
        }

        // Log aktivitas
        $this->logUserActivity('START_COMMAND', 'User memulai bot');

        // Kirim welcome message dengan menu
        $welcomeMessage = $this->createWelcomeMessage($username);
        
        return Request::sendMessage([
            'chat_id' => $chatId,
            'text' => $welcomeMessage,
            'parse_mode' => 'Markdown',
            'reply_markup' => $this->createMainMenuKeyboard()
        ]);
    }

    /**
     * Buat pesan welcome
     */
    private function createWelcomeMessage(string $username): string
    {
        $message = "🚀 *Selamat Datang di Pterodactyl Control Bot!*\n\n";
        $message .= "Halo {$username}! 👋\n\n";
        $message .= "Bot ini memungkinkan Anda untuk:\n";
        $message .= "🔄 Restart semua server sekaligus\n";
        $message .= "🔧 Reinstall server tanpa menghapus config\n";
        $message .= "⚡ Optimasi panel untuk performa terbaik\n";
        $message .= "📊 Monitor status dan statistik server\n";
        $message .= "🛠️ Manage server individual\n\n";
        
        $message .= "📋 *Panel Info:*\n";
        $message .= "🌐 URL: " . $this->escapeMarkdown($_ENV['PTERODACTYL_PANEL_URL']) . "\n";
        $message .= "👨‍💻 Author: " . $this->escapeMarkdown($_ENV['AUTHOR_NAME']) . " (" . $this->escapeMarkdown($_ENV['AUTHOR_TELEGRAM']) . ")\n\n";
        
        $message .= "Pilih menu di bawah untuk memulai:";
        
        return $message;
    }
}
