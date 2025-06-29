<?php

/**
 * Pterodactyl Telegram Bot - Entry Point (Polling Mode Only)
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

try {
    // Initialize bot
    $bot = new Bot();

    // Determine mode berdasarkan command line arguments atau default
    $mode = $argv[1] ?? 'polling';

    switch ($mode) {
        case 'polling':
            // Long polling mode (default)
            handlePolling($bot);
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
    // Log error
    error_log('Bot Error: ' . $e->getMessage());
    echo "❌ Bot Error: " . $e->getMessage() . "\n";
    exit(1);
}

/**
 * Handle long polling mode
 */
function handlePolling(Bot $bot): void
{
    echo "🚀 Starting Pterodactyl Telegram Bot...\n";
    echo "📱 Mode: Long Polling\n";
    echo "⏰ Started at: " . date('Y-m-d H:i:s') . "\n";
    echo "🔄 Press Ctrl+C to stop\n\n";

    // Start long polling
    $bot->handleLongPolling();
}



/**
 * Health check
 */
function handleHealthCheck(Bot $bot): void
{
    $health = $bot->healthCheck();

    echo "🏥 Health Check Results:\n";
    echo "Status: " . strtoupper($health['status']) . "\n";
    echo "Timestamp: " . $health['timestamp'] . "\n\n";

    echo "Component Checks:\n";
    foreach ($health['checks'] as $component => $status) {
        $icon = $status === 'ok' ? '✅' : '❌';
        echo "  {$icon} " . ucfirst(str_replace('_', ' ', $component)) . ": {$status}\n";
    }

    if ($health['status'] !== 'ok') {
        echo "\n❌ Health check failed!\n";
        if (isset($health['error'])) {
            echo "Error: " . $health['error'] . "\n";
        }
        exit(1);
    } else {
        echo "\n✅ All systems operational!\n";
    }
}

/**
 * Bot statistics
 */
function handleStats(Bot $bot): void
{
    $stats = $bot->getStats();

    echo "📊 Bot Statistics:\n";
    echo "================\n\n";

    echo "🤖 Bot Info:\n";
    echo "  Username: " . $stats['bot_info']['username'] . "\n";
    echo "  Owner ID: " . $stats['bot_info']['owner_id'] . "\n";
    echo "  Panel URL: " . $stats['bot_info']['panel_url'] . "\n\n";

    echo "🔒 Security Stats:\n";
    echo "  Active Operations: " . $stats['security']['active_operations'] . "\n";
    echo "  Blocked Users: " . $stats['security']['blocked_users'] . "\n";
    echo "  Violations Today: " . $stats['security']['violations_today'] . "\n\n";

    echo "📈 Activity Stats (Last 7 days):\n";
    if (!empty($stats['activity'])) {
        foreach ($stats['activity'] as $activity) {
            echo "  {$activity['action']}: {$activity['count']} total, {$activity['success_count']} success\n";
        }
    } else {
        echo "  No activity recorded\n";
    }

    echo "\n❌ Recent Errors:\n";
    if (!empty($stats['errors'])) {
        foreach ($stats['errors'] as $error) {
            echo "  [{$error['timestamp']}] {$error['error_type']}: {$error['error_message']}\n";
        }
    } else {
        echo "  No recent errors\n";
    }
}

/**
 * Cleanup old data
 */
function handleCleanup(Bot $bot): void
{
    echo "🧹 Starting cleanup process...\n";

    $bot->cleanup();

    echo "✅ Cleanup completed successfully!\n";
}

/**
 * Show bot info
 */
function handleBotInfo(Bot $bot): void
{
    echo "🤖 Pterodactyl Telegram Control Bot\n";
    echo "===================================\n\n";

    echo "📋 Bot Information:\n";
    echo "  Name: Pterodactyl Telegram Control Bot\n";
    echo "  Version: 1.0.0\n";
    echo "  Author: " . ($_ENV['AUTHOR_NAME'] ?? 'Pablos') . "\n";
    echo "  Telegram: " . ($_ENV['AUTHOR_TELEGRAM'] ?? '@ImTamaa') . "\n";
    echo "  Panel URL: " . ($_ENV['PTERODACTYL_PANEL_URL'] ?? 'Not configured') . "\n";
    echo "  Status: Running\n";
    echo "  Timestamp: " . date('Y-m-d H:i:s') . "\n\n";

    echo "🔧 Available Commands:\n";
    echo "  php index.php polling  - Start bot in polling mode\n";
    echo "  php index.php health   - Health check\n";
    echo "  php index.php stats    - Show statistics\n";
    echo "  php index.php cleanup  - Cleanup old data\n\n";

    echo "📱 Telegram Commands:\n";
    echo "  /start      - Main menu\n";
    echo "  /restartall - Restart all servers\n";
    echo "  /reinstallall - Reinstall all servers\n";
    echo "  /optimize   - Optimize panel\n";
    echo "  /manage     - Manage individual servers\n\n";

    echo "🚀 To start the bot: php index.php polling\n";
}
