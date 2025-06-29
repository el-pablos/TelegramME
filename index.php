<?php

/**
 * Pterodactyl Telegram Bot - Entry Point
 * 
 * Bot untuk kontrol massal Pterodactyl Panel via Telegram
 * 
 * @author Pablos (@ImTamaa)
 * @version 1.0.0
 */

// Error reporting untuk development
if ($_ENV['DEBUG_MODE'] ?? false) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Autoload dependencies
require_once __DIR__ . '/vendor/autoload.php';

use PteroBot\Bot;

// Set timezone
date_default_timezone_set('Asia/Jakarta');

// Headers untuk webhook
header('Content-Type: application/json');

try {
    // Initialize bot
    $bot = new Bot();
    
    // Determine mode berdasarkan request method dan parameters
    $mode = $_GET['mode'] ?? 'webhook';
    
    switch ($mode) {
        case 'webhook':
            // Handle webhook dari Telegram
            handleWebhook($bot);
            break;
            
        case 'polling':
            // Long polling untuk development
            handlePolling($bot);
            break;
            
        case 'set_webhook':
            // Set webhook URL
            handleSetWebhook($bot);
            break;
            
        case 'delete_webhook':
            // Delete webhook
            handleDeleteWebhook($bot);
            break;
            
        case 'webhook_info':
            // Get webhook info
            handleWebhookInfo($bot);
            break;
            
        case 'health':
            // Health check
            handleHealthCheck($bot);
            break;
            
        case 'stats':
            // Bot statistics
            handleStats($bot);
            break;
            
        case 'cleanup':
            // Cleanup old data
            handleCleanup($bot);
            break;
            
        default:
            // Default: show bot info
            handleBotInfo($bot);
            break;
    }

} catch (Exception $e) {
    // Log error dan kirim response error
    error_log('Bot Error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Internal server error',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

/**
 * Handle webhook request dari Telegram
 */
function handleWebhook(Bot $bot): void
{
    // Verify request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    // Verify content type
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($contentType, 'application/json') === false) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid content type']);
        return;
    }
    
    // Verify secret token jika diset
    $secretToken = $_ENV['WEBHOOK_SECRET_TOKEN'] ?? '';
    if (!empty($secretToken)) {
        $receivedToken = $_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '';
        if ($receivedToken !== $secretToken) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
    }
    
    // Process webhook
    $bot->handleWebhook();
    
    // Send OK response
    echo json_encode(['status' => 'ok']);
}

/**
 * Handle long polling untuk development
 */
function handlePolling(Bot $bot): void
{
    // Hanya allow dari localhost untuk security
    if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1', 'localhost'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        return;
    }
    
    echo json_encode(['status' => 'starting_polling']);
    
    // Start long polling
    $bot->handleLongPolling();
}

/**
 * Set webhook URL
 */
function handleSetWebhook(Bot $bot): void
{
    $url = $_GET['url'] ?? $_ENV['WEBHOOK_URL'] ?? '';
    $secretToken = $_GET['secret'] ?? $_ENV['WEBHOOK_SECRET_TOKEN'] ?? '';
    
    if (empty($url)) {
        http_response_code(400);
        echo json_encode(['error' => 'Webhook URL required']);
        return;
    }
    
    $success = $bot->setWebhook($url, $secretToken);
    
    echo json_encode([
        'status' => $success ? 'success' : 'error',
        'webhook_url' => $url,
        'has_secret_token' => !empty($secretToken)
    ]);
}

/**
 * Delete webhook
 */
function handleDeleteWebhook(Bot $bot): void
{
    $success = $bot->deleteWebhook();
    
    echo json_encode([
        'status' => $success ? 'success' : 'error',
        'message' => $success ? 'Webhook deleted' : 'Failed to delete webhook'
    ]);
}

/**
 * Get webhook info
 */
function handleWebhookInfo(Bot $bot): void
{
    $info = $bot->getWebhookInfo();
    
    echo json_encode([
        'status' => 'success',
        'webhook_info' => $info
    ]);
}

/**
 * Health check
 */
function handleHealthCheck(Bot $bot): void
{
    $health = $bot->healthCheck();
    
    http_response_code($health['status'] === 'ok' ? 200 : 500);
    echo json_encode($health);
}

/**
 * Bot statistics
 */
function handleStats(Bot $bot): void
{
    // Hanya allow owner atau localhost
    $allowedIPs = ['127.0.0.1', '::1', 'localhost'];
    $ownerTelegramId = $_ENV['OWNER_TELEGRAM_ID'] ?? '';
    $requestUserId = $_GET['user_id'] ?? '';
    
    if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', $allowedIPs) && $requestUserId !== $ownerTelegramId) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        return;
    }
    
    $stats = $bot->getStats();
    
    echo json_encode([
        'status' => 'success',
        'stats' => $stats
    ]);
}

/**
 * Cleanup old data
 */
function handleCleanup(Bot $bot): void
{
    // Hanya allow dari localhost atau dengan auth
    if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1', 'localhost'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        return;
    }
    
    $bot->cleanup();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Cleanup completed'
    ]);
}

/**
 * Show bot info
 */
function handleBotInfo(Bot $bot): void
{
    $info = [
        'name' => 'Pterodactyl Telegram Control Bot',
        'version' => '1.0.0',
        'author' => $_ENV['AUTHOR_NAME'] ?? 'Pablos',
        'telegram' => $_ENV['AUTHOR_TELEGRAM'] ?? '@ImTamaa',
        'panel_url' => $_ENV['PTERODACTYL_PANEL_URL'] ?? '',
        'status' => 'running',
        'timestamp' => date('Y-m-d H:i:s'),
        'endpoints' => [
            'webhook' => '/?mode=webhook',
            'polling' => '/?mode=polling',
            'set_webhook' => '/?mode=set_webhook&url=YOUR_WEBHOOK_URL',
            'delete_webhook' => '/?mode=delete_webhook',
            'webhook_info' => '/?mode=webhook_info',
            'health' => '/?mode=health',
            'stats' => '/?mode=stats',
            'cleanup' => '/?mode=cleanup'
        ]
    ];
    
    echo json_encode($info, JSON_PRETTY_PRINT);
}
