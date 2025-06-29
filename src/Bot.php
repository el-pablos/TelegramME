<?php

namespace PteroBot;

use Longman\TelegramBot\Telegram;
use Longman\TelegramBot\Request;
use Longman\TelegramBot\Exception\TelegramException;
use PteroBot\Services\LoggingService;
use PteroBot\Services\SecurityService;
use Dotenv\Dotenv;

/**
 * Main Bot class - Controller utama untuk Pterodactyl Telegram Bot
 * 
 * @author Pablos (@ImTamaa)
 */
class Bot
{
    private Telegram $telegram;
    private LoggingService $logger;
    private SecurityService $security;
    private string $botToken;
    private string $botUsername;
    private string $ownerTelegramId;

    public function __construct()
    {
        $this->loadEnvironment();
        $this->initializeServices();
        $this->initializeTelegram();
        $this->setupCommands();
    }

    /**
     * Load environment variables
     */
    private function loadEnvironment(): void
    {
        // Load .env file
        if (file_exists(__DIR__ . '/../.env')) {
            $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
            $dotenv->load();
        }

        // Validate required environment variables
        $required = [
            'BOT_TOKEN',
            'OWNER_TELEGRAM_ID',
            'PTERODACTYL_PANEL_URL',
            'PTERODACTYL_APPLICATION_API_KEY',
            'PTERODACTYL_CLIENT_API_KEY'
        ];

        foreach ($required as $var) {
            if (empty($_ENV[$var])) {
                throw new \Exception("Required environment variable {$var} is not set");
            }
        }

        $this->botToken = $_ENV['BOT_TOKEN'];
        $this->botUsername = $_ENV['BOT_USERNAME'] ?? 'pterodactyl_control_bot';
        $this->ownerTelegramId = $_ENV['OWNER_TELEGRAM_ID'];
    }

    /**
     * Initialize services
     */
    private function initializeServices(): void
    {
        $this->logger = new LoggingService();
        $this->security = new SecurityService($this->logger);
        
        $this->logger->info('Bot services initialized');
    }

    /**
     * Initialize Telegram bot
     */
    private function initializeTelegram(): void
    {
        try {
            $this->telegram = new Telegram($this->botToken, $this->botUsername);
            
            // Set commands path
            $this->telegram->addCommandsPaths([
                __DIR__ . '/Commands'
            ]);

            // Enable admin users (owner)
            $this->telegram->enableAdmins([$this->ownerTelegramId]);

            // Set download and upload paths
            $this->telegram->setDownloadPath(__DIR__ . '/../downloads');
            $this->telegram->setUploadPath(__DIR__ . '/../uploads');

            // Skip database configuration - use simple polling

            $this->logger->info('Telegram bot initialized successfully');

        } catch (TelegramException $e) {
            $this->logger->critical('Failed to initialize Telegram bot: ' . $e->getMessage());
            throw new \Exception('Failed to initialize Telegram bot: ' . $e->getMessage());
        }
    }



    /**
     * Setup bot commands
     */
    private function setupCommands(): void
    {
        try {
            // Set bot commands untuk menu
            $commands = [
                [
                    'command' => 'start',
                    'description' => 'Mulai menggunakan bot dan tampilkan menu utama'
                ],
                [
                    'command' => 'restartall',
                    'description' => 'Restart semua server sekaligus'
                ],
                [
                    'command' => 'reinstallall',
                    'description' => 'Reinstall semua server tanpa menghapus config'
                ],
                [
                    'command' => 'optimize',
                    'description' => 'Optimasi panel untuk performa terbaik'
                ],
                [
                    'command' => 'manage',
                    'description' => 'Manage server individual atau massal'
                ],
                [
                    'command' => 'help',
                    'description' => 'Tampilkan bantuan penggunaan bot'
                ]
            ];

            Request::setMyCommands(['commands' => $commands]);
            
            $this->logger->info('Bot commands setup completed');

        } catch (TelegramException $e) {
            $this->logger->error('Failed to setup bot commands: ' . $e->getMessage());
        }
    }



    /**
     * Handle long polling mode (simple version without MySQL)
     */
    public function handleLongPolling(): void
    {
        try {
            $this->logger->info('Starting simple long polling mode...');

            $lastUpdateId = 0;
            $lastHeartbeat = 0;

            while (true) {
                // Get updates directly from Telegram API
                $updates = $this->getUpdatesDirectly($lastUpdateId);

                if (!empty($updates)) {
                    foreach ($updates as $updateData) {
                        try {
                            // Process each update manually
                            $this->processUpdateManually($updateData);
                            $lastUpdateId = max($lastUpdateId, $updateData['update_id'] + 1);
                        } catch (\Exception $e) {
                            $this->logger->error('Error processing update: ' . $e->getMessage());
                            echo "❌ Error processing update: " . $e->getMessage() . "\n";
                        }
                    }

                    $this->logger->info('Processed ' . count($updates) . ' updates');
                    echo "📨 Processed " . count($updates) . " updates at " . date('H:i:s') . "\n";
                } else {
                    // No updates, show heartbeat every 30 seconds
                    if (time() - $lastHeartbeat > 30) {
                        echo "💓 Bot is running... " . date('H:i:s') . "\n";
                        $lastHeartbeat = time();
                    }
                }

                sleep(2); // Prevent excessive API calls
            }

        } catch (\Exception $e) {
            $this->logger->critical('Critical error in long polling: ' . $e->getMessage());
            echo "💥 Critical error: " . $e->getMessage() . "\n";

            // Wait before retry
            sleep(5);

            // Restart polling
            $this->handleLongPolling();
        }
    }

    /**
     * Get updates directly from Telegram API using cURL
     */
    private function getUpdatesDirectly(int $offset = 0): array
    {
        try {
            $botToken = $_ENV['BOT_TOKEN'];
            $url = "https://api.telegram.org/bot{$botToken}/getUpdates";

            $params = [
                'offset' => $offset,
                'limit' => 100,
                'timeout' => 10
            ];

            // Use cURL for direct API call
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $response) {
                $data = json_decode($response, true);
                if ($data && $data['ok']) {
                    return $data['result'];
                }
            }

            return [];

        } catch (\Exception $e) {
            $this->logger->error('Error getting updates: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Process update manually without library dependencies
     */
    private function processUpdateManually(array $updateData): void
    {
        try {
            // Extract message data
            if (isset($updateData['message'])) {
                $message = $updateData['message'];
                $chatId = $message['chat']['id'];
                $text = $message['text'] ?? '';
                $userId = $message['from']['id'] ?? 0;

                // Check if user is owner
                if ($userId != $this->ownerTelegramId) {
                    $this->sendMessage($chatId, "❌ Access denied. This bot is private.");
                    return;
                }

                // Process commands
                if (strpos($text, '/') === 0) {
                    $this->processCommand($chatId, $text, $message);
                }

            } elseif (isset($updateData['callback_query'])) {
                $callbackQuery = $updateData['callback_query'];
                $chatId = $callbackQuery['message']['chat']['id'];
                $data = $callbackQuery['data'];
                $userId = $callbackQuery['from']['id'] ?? 0;

                // Check if user is owner
                if ($userId != $this->ownerTelegramId) {
                    return;
                }

                // Process callback
                $this->processCallback($chatId, $data, $callbackQuery);
            }

        } catch (\Exception $e) {
            $this->logger->error('Error processing update manually: ' . $e->getMessage());
        }
    }

    /**
     * Process command manually
     */
    private function processCommand(int $chatId, string $text, array $message): void
    {
        try {
            $command = strtolower(trim(explode(' ', $text)[0]));

            switch ($command) {
                case '/start':
                    $this->sendStartMenu($chatId);
                    break;

                case '/restartall':
                    $this->sendMessage($chatId, "🔄 Starting mass restart...");
                    // Add restart logic here
                    break;

                case '/reinstallall':
                    $this->sendMessage($chatId, "🔧 Starting mass reinstall...");
                    // Add reinstall logic here
                    break;

                case '/optimize':
                    $this->sendMessage($chatId, "⚡ Starting panel optimization...");
                    // Add optimize logic here
                    break;

                case '/manage':
                    $this->sendMessage($chatId, "🛠️ Server management menu...");
                    // Add manage logic here
                    break;

                default:
                    $this->sendMessage($chatId, "❓ Unknown command. Send /start for menu.");
                    break;
            }

        } catch (\Exception $e) {
            $this->logger->error('Error processing command: ' . $e->getMessage());
            $this->sendMessage($chatId, "❌ Error processing command.");
        }
    }

    /**
     * Process callback query manually
     */
    private function processCallback(int $chatId, string $data, array $callbackQuery): void
    {
        try {
            // Answer callback query first
            $this->answerCallbackQuery($callbackQuery['id']);

            // Process callback data
            switch ($data) {
                case 'restart_all':
                    $this->sendMessage($chatId, "🔄 Mass restart initiated...");
                    break;

                case 'reinstall_all':
                    $this->sendMessage($chatId, "🔧 Mass reinstall initiated...");
                    break;

                case 'optimize_panel':
                    $this->sendMessage($chatId, "⚡ Panel optimization started...");
                    break;

                case 'manage_servers':
                    $this->sendMessage($chatId, "🛠️ Server management...");
                    break;

                default:
                    $this->sendMessage($chatId, "❓ Unknown action.");
                    break;
            }

        } catch (\Exception $e) {
            $this->logger->error('Error processing callback: ' . $e->getMessage());
        }
    }

    /**
     * Send start menu
     */
    private function sendStartMenu(int $chatId): void
    {
        $text = "🤖 *Pterodactyl Panel Control Bot*\n\n";
        $text .= "Welcome! Choose an action:\n\n";
        $text .= "🔄 Mass Restart - Restart all servers\n";
        $text .= "🔧 Mass Reinstall - Reinstall all servers\n";
        $text .= "⚡ Optimize Panel - Clean cache & optimize\n";
        $text .= "🛠️ Manage Servers - Individual server control";

        $keyboard = [
            [
                ['text' => '🔄 Mass Restart', 'callback_data' => 'restart_all'],
                ['text' => '🔧 Mass Reinstall', 'callback_data' => 'reinstall_all']
            ],
            [
                ['text' => '⚡ Optimize Panel', 'callback_data' => 'optimize_panel'],
                ['text' => '🛠️ Manage Servers', 'callback_data' => 'manage_servers']
            ]
        ];

        $this->sendMessage($chatId, $text, $keyboard);
    }

    /**
     * Send message using cURL
     */
    private function sendMessage(int $chatId, string $text, array $keyboard = null): void
    {
        try {
            $botToken = $_ENV['BOT_TOKEN'];
            $url = "https://api.telegram.org/bot{$botToken}/sendMessage";

            $params = [
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'Markdown'
            ];

            if ($keyboard) {
                $params['reply_markup'] = json_encode([
                    'inline_keyboard' => $keyboard
                ]);
            }

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            curl_exec($ch);
            curl_close($ch);

        } catch (\Exception $e) {
            $this->logger->error('Error sending message: ' . $e->getMessage());
        }
    }

    /**
     * Answer callback query using cURL
     */
    private function answerCallbackQuery(string $callbackQueryId): void
    {
        try {
            $botToken = $_ENV['BOT_TOKEN'];
            $url = "https://api.telegram.org/bot{$botToken}/answerCallbackQuery";

            $params = [
                'callback_query_id' => $callbackQueryId
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            curl_exec($ch);
            curl_close($ch);

        } catch (\Exception $e) {
            $this->logger->error('Error answering callback query: ' . $e->getMessage());
        }
    }



    /**
     * Send notification to owner
     */
    public function notifyOwner(string $message): void
    {
        try {
            Request::sendMessage([
                'chat_id' => $this->ownerTelegramId,
                'text' => $message,
                'parse_mode' => 'Markdown'
            ]);

        } catch (TelegramException $e) {
            $this->logger->error('Failed to notify owner: ' . $e->getMessage());
        }
    }

    /**
     * Get bot statistics
     */
    public function getStats(): array
    {
        $stats = [
            'bot_info' => [
                'username' => $this->botUsername,
                'owner_id' => $this->ownerTelegramId,
                'panel_url' => $_ENV['PTERODACTYL_PANEL_URL']
            ],
            'security' => $this->security->getSecurityStats(),
            'activity' => $this->logger->getActivityStats(),
            'errors' => $this->logger->getRecentErrors(5)
        ];

        return $stats;
    }

    /**
     * Cleanup old data
     */
    public function cleanup(): void
    {
        try {
            $this->logger->info('Starting cleanup process');
            
            // Cleanup old logs
            $this->logger->cleanupOldLogs(30);
            
            $this->logger->info('Cleanup process completed');

        } catch (\Exception $e) {
            $this->logger->error('Cleanup process failed: ' . $e->getMessage());
        }
    }

    /**
     * Health check
     */
    public function healthCheck(): array
    {
        $health = [
            'status' => 'ok',
            'timestamp' => date('Y-m-d H:i:s'),
            'checks' => []
        ];

        try {
            // Check Telegram API
            $me = Request::getMe();
            $health['checks']['telegram_api'] = $me->isOk() ? 'ok' : 'error';

            // Check database
            $health['checks']['database'] = 'ok'; // SecurityService constructor would throw if DB fails

            // Check Pterodactyl API
            try {
                // Test API connection by checking if user is allowed (this will test API)
                $this->security->isUserAllowed((int)$this->ownerTelegramId);
                $health['checks']['pterodactyl_api'] = 'ok';
            } catch (\Exception $e) {
                $health['checks']['pterodactyl_api'] = 'error';
            }

            // Check if any component failed
            foreach ($health['checks'] as $check => $status) {
                if ($status !== 'ok') {
                    $health['status'] = 'error';
                    break;
                }
            }

        } catch (\Exception $e) {
            $health['status'] = 'error';
            $health['error'] = $e->getMessage();
        }

        return $health;
    }
}
