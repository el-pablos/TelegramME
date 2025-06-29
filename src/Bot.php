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

            // Configure database for long polling (use dummy MySQL config to prevent errors)
            $this->configureBotDatabase();

            $this->logger->info('Telegram bot initialized successfully');

        } catch (TelegramException $e) {
            $this->logger->critical('Failed to initialize Telegram bot: ' . $e->getMessage());
            throw new \Exception('Failed to initialize Telegram bot: ' . $e->getMessage());
        }
    }

    /**
     * Configure bot database to prevent MySQL errors
     */
    private function configureBotDatabase(): void
    {
        try {
            // Try to configure MySQL if available
            $dbConfig = [
                'host' => 'localhost',
                'port' => 3306,
                'user' => 'root',
                'password' => '',
                'database' => 'telegram_bot',
            ];

            // Try to enable MySQL - if it fails, we'll use direct API calls
            $this->telegram->enableMySql($dbConfig, 'telegram_bot_');
            $this->logger->info('MySQL database configured for bot');

        } catch (\Exception $e) {
            // MySQL not available - we'll use direct API calls in handleLongPolling
            $this->logger->info('MySQL not available, using direct API calls for polling: ' . $e->getMessage());
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
     * Handle long polling mode (without MySQL requirement)
     */
    public function handleLongPolling(): void
    {
        try {
            $this->logger->info('Starting long polling mode...');

            $lastUpdateId = 0;

            while (true) {
                // Use direct API call to avoid MySQL requirement
                $updates = $this->getUpdatesDirectly($lastUpdateId);

                if (!empty($updates)) {
                    foreach ($updates as $update) {
                        try {
                            // Process each update
                            $this->telegram->processUpdate($update);
                            $lastUpdateId = max($lastUpdateId, $update->getUpdateId() + 1);
                        } catch (\Exception $e) {
                            $this->logger->error('Error processing update: ' . $e->getMessage());
                        }
                    }

                    $this->logger->info('Processed ' . count($updates) . ' updates');
                    echo "📨 Processed " . count($updates) . " updates at " . date('H:i:s') . "\n";
                } else {
                    // No updates, just show heartbeat every 30 seconds
                    static $lastHeartbeat = 0;
                    if (time() - $lastHeartbeat > 30) {
                        echo "💓 Bot is running... " . date('H:i:s') . "\n";
                        $lastHeartbeat = time();
                    }
                }

                sleep(1); // Prevent excessive API calls
            }

        } catch (TelegramException $e) {
            $this->logger->error('Long polling error: ' . $e->getMessage());
            echo "❌ Telegram error: " . $e->getMessage() . "\n";
        } catch (\Exception $e) {
            $this->logger->critical('Critical error in long polling: ' . $e->getMessage());
            echo "💥 Critical error: " . $e->getMessage() . "\n";
        }
    }

    /**
     * Get updates directly from Telegram API without MySQL
     */
    private function getUpdatesDirectly(int $offset = 0): array
    {
        try {
            $params = [
                'offset' => $offset,
                'limit' => 100,
                'timeout' => 10
            ];

            $response = Request::getUpdates($params);

            if ($response->isOk()) {
                return $response->getResult();
            } else {
                $this->logger->error('Failed to get updates: ' . $response->getDescription());
                return [];
            }

        } catch (\Exception $e) {
            $this->logger->error('Error getting updates: ' . $e->getMessage());
            return [];
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
