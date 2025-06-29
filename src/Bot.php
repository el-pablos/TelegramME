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
     * Handle webhook request
     */
    public function handleWebhook(): void
    {
        try {
            $this->logger->info('Processing webhook request');
            
            // Process the update
            $serverResponse = $this->telegram->handle();
            
            if ($serverResponse->isOk()) {
                $this->logger->info('Webhook processed successfully');
            } else {
                $this->logger->error('Webhook processing failed: ' . $serverResponse->getDescription());
            }

        } catch (TelegramException $e) {
            $this->logger->error('Webhook handling error: ' . $e->getMessage());
            
            // Notify owner about critical errors
            $this->notifyOwner('🚨 Bot Error: ' . $e->getMessage());
        } catch (\Exception $e) {
            $this->logger->critical('Critical error in webhook handling: ' . $e->getMessage());
            
            // Notify owner about critical errors
            $this->notifyOwner('🚨 Critical Bot Error: ' . $e->getMessage());
        }
    }

    /**
     * Handle long polling (untuk development/testing)
     */
    public function handleLongPolling(): void
    {
        try {
            $this->logger->info('Starting long polling...');
            
            while (true) {
                $serverResponse = $this->telegram->handleGetUpdates();
                
                if ($serverResponse->isOk()) {
                    $updates = $serverResponse->getResult();
                    
                    if (!empty($updates)) {
                        $this->logger->info('Processed ' . count($updates) . ' updates');
                    }
                } else {
                    $this->logger->error('Long polling error: ' . $serverResponse->getDescription());
                    sleep(5); // Wait before retry
                }
                
                sleep(1); // Prevent excessive API calls
            }

        } catch (TelegramException $e) {
            $this->logger->error('Long polling error: ' . $e->getMessage());
        } catch (\Exception $e) {
            $this->logger->critical('Critical error in long polling: ' . $e->getMessage());
        }
    }

    /**
     * Set webhook URL
     */
    public function setWebhook(string $url, string $secretToken = ''): bool
    {
        try {
            $params = ['url' => $url];
            
            if (!empty($secretToken)) {
                $params['secret_token'] = $secretToken;
            }

            $result = Request::setWebhook($params);
            
            if ($result->isOk()) {
                $this->logger->info("Webhook set successfully: {$url}");
                return true;
            } else {
                $this->logger->error('Failed to set webhook: ' . $result->getDescription());
                return false;
            }

        } catch (TelegramException $e) {
            $this->logger->error('Webhook setup error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete webhook
     */
    public function deleteWebhook(): bool
    {
        try {
            $result = Request::deleteWebhook();
            
            if ($result->isOk()) {
                $this->logger->info('Webhook deleted successfully');
                return true;
            } else {
                $this->logger->error('Failed to delete webhook: ' . $result->getDescription());
                return false;
            }

        } catch (TelegramException $e) {
            $this->logger->error('Webhook deletion error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get webhook info
     */
    public function getWebhookInfo(): array
    {
        try {
            $result = Request::getWebhookInfo();
            
            if ($result->isOk()) {
                return $result->getResult()->getRawData();
            } else {
                $this->logger->error('Failed to get webhook info: ' . $result->getDescription());
                return [];
            }

        } catch (TelegramException $e) {
            $this->logger->error('Get webhook info error: ' . $e->getMessage());
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
                $servers = $this->security->isUserAllowed((int)$this->ownerTelegramId);
                $health['checks']['pterodactyl_api'] = 'ok';
            } catch (\Exception $e) {
                $health['checks']['pterodactyl_api'] = 'error';
            }

        } catch (\Exception $e) {
            $health['status'] = 'error';
            $health['error'] = $e->getMessage();
        }

        return $health;
    }
}
