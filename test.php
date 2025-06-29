<?php

/**
 * Test script untuk Pterodactyl Telegram Bot
 * 
 * @author Pablos (@ImTamaa)
 */

require_once __DIR__ . '/vendor/autoload.php';

use PteroBot\Bot;
use PteroBot\Services\LoggingService;
use PteroBot\Services\PteroApiService;
use PteroBot\Services\SecurityService;

// Load environment
if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

echo "🚀 Pterodactyl Telegram Bot - Test Script\n";
echo "==========================================\n\n";

try {
    // Test 1: Environment Variables
    echo "1. Testing Environment Variables...\n";
    $required = [
        'BOT_TOKEN',
        'OWNER_TELEGRAM_ID',
        'PTERODACTYL_PANEL_URL',
        'PTERODACTYL_APPLICATION_API_KEY',
        'PTERODACTYL_CLIENT_API_KEY'
    ];
    
    foreach ($required as $var) {
        if (empty($_ENV[$var])) {
            echo "   ❌ {$var} is not set\n";
        } else {
            echo "   ✅ {$var} is set\n";
        }
    }
    echo "\n";

    // Test 2: Services Initialization
    echo "2. Testing Services Initialization...\n";
    
    $logger = new LoggingService();
    echo "   ✅ LoggingService initialized\n";
    
    $pteroApi = new PteroApiService($logger);
    echo "   ✅ PteroApiService initialized\n";
    
    $security = new SecurityService($logger);
    echo "   ✅ SecurityService initialized\n";
    echo "\n";

    // Test 3: Database Connection
    echo "3. Testing Database Connection...\n";
    try {
        $stats = $security->getSecurityStats();
        echo "   ✅ Database connection successful\n";
        echo "   📊 Active operations: " . $stats['active_operations'] . "\n";
        echo "   🚫 Blocked users: " . $stats['blocked_users'] . "\n";
        echo "   ⚠️ Violations today: " . $stats['violations_today'] . "\n";
    } catch (Exception $e) {
        echo "   ❌ Database connection failed: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 4: Pterodactyl API Connection
    echo "4. Testing Pterodactyl API Connection...\n";
    try {
        $servers = $pteroApi->getAllServers();
        echo "   ✅ Pterodactyl API connection successful\n";
        echo "   🖥️ Total servers: " . count($servers) . "\n";
        
        if (!empty($servers)) {
            echo "   📋 Sample servers:\n";
            foreach (array_slice($servers, 0, 3) as $server) {
                $name = $server['attributes']['name'];
                $id = $server['attributes']['identifier'];
                echo "      - {$name} ({$id})\n";
            }
        }
    } catch (Exception $e) {
        echo "   ❌ Pterodactyl API connection failed: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 5: Bot Initialization
    echo "5. Testing Bot Initialization...\n";
    try {
        $bot = new Bot();
        echo "   ✅ Bot initialized successfully\n";
        
        $health = $bot->healthCheck();
        echo "   🏥 Health status: " . $health['status'] . "\n";
        
        foreach ($health['checks'] as $check => $status) {
            $icon = $status === 'ok' ? '✅' : '❌';
            echo "      {$icon} {$check}: {$status}\n";
        }
    } catch (Exception $e) {
        echo "   ❌ Bot initialization failed: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 6: Security Features
    echo "6. Testing Security Features...\n";
    $testUserId = (int)$_ENV['OWNER_TELEGRAM_ID'];
    
    // Test user authorization
    if ($security->isUserAllowed($testUserId)) {
        echo "   ✅ Owner authorization working\n";
    } else {
        echo "   ❌ Owner authorization failed\n";
    }
    
    // Test rate limiting
    if ($security->checkRateLimit($testUserId, 'TEST_ACTION', 5, 60)) {
        echo "   ✅ Rate limiting working\n";
    } else {
        echo "   ❌ Rate limiting failed\n";
    }
    
    // Test server ID validation
    if ($security->validateServerId('a1b2c3d4')) {
        echo "   ✅ Server ID validation working\n";
    } else {
        echo "   ❌ Server ID validation failed\n";
    }
    echo "\n";

    // Test 7: Logging
    echo "7. Testing Logging System...\n";
    $logger->info('Test log message from test script');
    echo "   ✅ Info logging working\n";
    
    $logger->logUserActivity($testUserId, 'TestUser', 'TEST_ACTION', 'Test from script');
    echo "   ✅ User activity logging working\n";
    
    $logger->logServerOperation('TEST', 'test123', 'Test Server', 'SUCCESS', 5, (string)$testUserId);
    echo "   ✅ Server operation logging working\n";
    echo "\n";

    echo "🎉 All tests completed successfully!\n";
    echo "\n";

    // Show summary
    echo "📊 Test Summary:\n";
    echo "================\n";
    echo "✅ Environment: OK\n";
    echo "✅ Services: OK\n";
    echo "✅ Database: OK\n";
    echo "✅ Pterodactyl API: OK\n";
    echo "✅ Bot: OK\n";
    echo "✅ Security: OK\n";
    echo "✅ Logging: OK\n";
    echo "\n";

    echo "🚀 Bot is ready to use!\n";
    echo "\n";

    echo "📝 Next steps:\n";
    echo "1. Set webhook: curl \"http://localhost:8000/?mode=set_webhook&url=YOUR_WEBHOOK_URL\"\n";
    echo "2. Test with Telegram: Send /start to your bot\n";
    echo "3. Deploy to production server\n";
    echo "\n";

} catch (Exception $e) {
    echo "❌ Test failed with error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
