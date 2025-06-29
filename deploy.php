<?php

/**
 * Deployment script untuk Pterodactyl Telegram Bot
 * 
 * @author Pablos (@ImTamaa)
 */

require_once __DIR__ . '/vendor/autoload.php';

use PteroBot\Bot;

// Load environment
if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

echo "🚀 Pterodactyl Telegram Bot - Deployment Script\n";
echo "===============================================\n\n";

$action = $argv[1] ?? 'help';

switch ($action) {
    case 'webhook':
        setWebhook();
        break;
        
    case 'delete-webhook':
        deleteWebhook();
        break;
        
    case 'webhook-info':
        getWebhookInfo();
        break;
        
    case 'test':
        runTests();
        break;
        
    case 'cleanup':
        runCleanup();
        break;
        
    case 'stats':
        showStats();
        break;
        
    case 'health':
        healthCheck();
        break;
        
    case 'polling':
        startPolling();
        break;
        
    default:
        showHelp();
        break;
}

function setWebhook()
{
    echo "🔗 Setting up webhook...\n";
    
    $webhookUrl = $_ENV['WEBHOOK_URL'] ?? '';
    $secretToken = $_ENV['WEBHOOK_SECRET_TOKEN'] ?? '';
    
    if (empty($webhookUrl)) {
        echo "❌ WEBHOOK_URL not set in .env file\n";
        exit(1);
    }
    
    try {
        $bot = new Bot();
        $success = $bot->setWebhook($webhookUrl, $secretToken);
        
        if ($success) {
            echo "✅ Webhook set successfully!\n";
            echo "📍 URL: {$webhookUrl}\n";
            echo "🔐 Secret Token: " . (!empty($secretToken) ? 'Set' : 'Not set') . "\n";
        } else {
            echo "❌ Failed to set webhook\n";
            exit(1);
        }
        
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

function deleteWebhook()
{
    echo "🗑️ Deleting webhook...\n";
    
    try {
        $bot = new Bot();
        $success = $bot->deleteWebhook();
        
        if ($success) {
            echo "✅ Webhook deleted successfully!\n";
        } else {
            echo "❌ Failed to delete webhook\n";
            exit(1);
        }
        
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

function getWebhookInfo()
{
    echo "ℹ️ Getting webhook info...\n";
    
    try {
        $bot = new Bot();
        $info = $bot->getWebhookInfo();
        
        if (!empty($info)) {
            echo "📊 Webhook Information:\n";
            echo "   URL: " . ($info['url'] ?? 'Not set') . "\n";
            echo "   Has Custom Certificate: " . ($info['has_custom_certificate'] ? 'Yes' : 'No') . "\n";
            echo "   Pending Update Count: " . ($info['pending_update_count'] ?? 0) . "\n";
            echo "   Max Connections: " . ($info['max_connections'] ?? 'Default') . "\n";
            echo "   Allowed Updates: " . implode(', ', $info['allowed_updates'] ?? []) . "\n";
            
            if (!empty($info['last_error_date'])) {
                echo "   Last Error Date: " . date('Y-m-d H:i:s', $info['last_error_date']) . "\n";
                echo "   Last Error Message: " . ($info['last_error_message'] ?? 'None') . "\n";
            }
        } else {
            echo "❌ No webhook info available\n";
        }
        
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

function runTests()
{
    echo "🧪 Running tests...\n";
    
    $output = shell_exec('php test.php');
    echo $output;
}

function runCleanup()
{
    echo "🧹 Running cleanup...\n";
    
    try {
        $bot = new Bot();
        $bot->cleanup();
        echo "✅ Cleanup completed successfully!\n";
        
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

function showStats()
{
    echo "📊 Bot Statistics:\n";
    
    try {
        $bot = new Bot();
        $stats = $bot->getStats();
        
        echo "\n🤖 Bot Info:\n";
        echo "   Username: " . $stats['bot_info']['username'] . "\n";
        echo "   Owner ID: " . $stats['bot_info']['owner_id'] . "\n";
        echo "   Panel URL: " . $stats['bot_info']['panel_url'] . "\n";
        
        echo "\n🔒 Security Stats:\n";
        echo "   Active Operations: " . $stats['security']['active_operations'] . "\n";
        echo "   Blocked Users: " . $stats['security']['blocked_users'] . "\n";
        echo "   Violations Today: " . $stats['security']['violations_today'] . "\n";
        
        echo "\n📈 Activity Stats (Last 7 days):\n";
        if (!empty($stats['activity'])) {
            foreach ($stats['activity'] as $activity) {
                echo "   {$activity['action']}: {$activity['count']} total, {$activity['success_count']} success\n";
            }
        } else {
            echo "   No activity recorded\n";
        }
        
        echo "\n❌ Recent Errors:\n";
        if (!empty($stats['errors'])) {
            foreach ($stats['errors'] as $error) {
                echo "   [{$error['timestamp']}] {$error['error_type']}: {$error['error_message']}\n";
            }
        } else {
            echo "   No recent errors\n";
        }
        
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

function healthCheck()
{
    echo "🏥 Health Check:\n";
    
    try {
        $bot = new Bot();
        $health = $bot->healthCheck();
        
        echo "Status: " . strtoupper($health['status']) . "\n";
        echo "Timestamp: " . $health['timestamp'] . "\n\n";
        
        echo "Component Checks:\n";
        foreach ($health['checks'] as $component => $status) {
            $icon = $status === 'ok' ? '✅' : '❌';
            echo "   {$icon} " . ucfirst(str_replace('_', ' ', $component)) . ": {$status}\n";
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
        
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

function startPolling()
{
    echo "🔄 Starting long polling mode...\n";
    echo "Press Ctrl+C to stop\n\n";
    
    try {
        $bot = new Bot();
        $bot->handleLongPolling();
        
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

function showHelp()
{
    echo "📖 Available Commands:\n";
    echo "=====================\n\n";
    
    echo "Webhook Management:\n";
    echo "   webhook         - Set webhook URL\n";
    echo "   delete-webhook  - Delete webhook\n";
    echo "   webhook-info    - Get webhook information\n\n";
    
    echo "Testing & Monitoring:\n";
    echo "   test           - Run all tests\n";
    echo "   health         - Health check\n";
    echo "   stats          - Show bot statistics\n\n";
    
    echo "Maintenance:\n";
    echo "   cleanup        - Clean up old data\n";
    echo "   polling        - Start long polling (development)\n\n";
    
    echo "Usage Examples:\n";
    echo "   php deploy.php webhook\n";
    echo "   php deploy.php test\n";
    echo "   php deploy.php health\n";
    echo "   php deploy.php stats\n";
    echo "   php deploy.php cleanup\n";
    echo "   php deploy.php polling\n\n";
    
    echo "Environment Setup:\n";
    echo "   1. Copy .env.example to .env\n";
    echo "   2. Configure your bot token and API keys\n";
    echo "   3. Set WEBHOOK_URL for production\n";
    echo "   4. Run 'php deploy.php test' to verify setup\n";
    echo "   5. Run 'php deploy.php webhook' to set webhook\n\n";
}
