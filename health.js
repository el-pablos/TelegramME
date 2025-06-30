#!/usr/bin/env node

/**
 * Health Check Script for Pterodactyl Telegram Bot
 * Author: Pablos (@ImTamaa)
 */

require('dotenv').config();
const axios = require('axios');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_TELEGRAM_ID;
const PANEL_URL = process.env.PTERODACTYL_PANEL_URL;
const APP_API_KEY = process.env.PTERODACTYL_APPLICATION_API_KEY;

console.log('🏥 Pterodactyl Telegram Bot - Health Check');
console.log('==========================================');
console.log('');

// Check environment variables
console.log('1. Checking Environment Variables...');
const checks = {
    BOT_TOKEN: !!BOT_TOKEN,
    OWNER_TELEGRAM_ID: !!OWNER_ID,
    PTERODACTYL_PANEL_URL: !!PANEL_URL,
    PTERODACTYL_APPLICATION_API_KEY: !!APP_API_KEY
};

let envOk = true;
for (const [key, value] of Object.entries(checks)) {
    if (value) {
        console.log(`   ✅ ${key} is set`);
    } else {
        console.log(`   ❌ ${key} is missing`);
        envOk = false;
    }
}

if (!envOk) {
    console.log('\n❌ Environment check failed!');
    process.exit(1);
}

// Check Telegram Bot API
async function checkTelegramAPI() {
    console.log('\n2. Checking Telegram Bot API...');
    try {
        const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
        if (response.data.ok) {
            console.log(`   ✅ Bot connected: @${response.data.result.username}`);
            return true;
        } else {
            console.log('   ❌ Bot API error:', response.data.description);
            return false;
        }
    } catch (error) {
        console.log('   ❌ Bot API connection failed:', error.message);
        return false;
    }
}

// Check Pterodactyl API
async function checkPterodactylAPI() {
    console.log('\n3. Checking Pterodactyl API...');
    try {
        const response = await axios.get(`${PANEL_URL}/api/application/servers`, {
            headers: {
                'Authorization': `Bearer ${APP_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (response.status === 200) {
            const serverCount = response.data.data ? response.data.data.length : 0;
            console.log(`   ✅ Panel API connected`);
            console.log(`   🖥️ Total servers: ${serverCount}`);
            return true;
        } else {
            console.log('   ❌ Panel API error:', response.status);
            return false;
        }
    } catch (error) {
        console.log('   ❌ Panel API connection failed:', error.message);
        return false;
    }
}

// Run all checks
async function runHealthCheck() {
    const telegramOk = await checkTelegramAPI();
    const pterodactylOk = await checkPterodactylAPI();

    console.log('\n🎉 Health Check Summary');
    console.log('=======================');
    console.log(`✅ Environment: OK`);
    console.log(`${telegramOk ? '✅' : '❌'} Telegram API: ${telegramOk ? 'OK' : 'FAILED'}`);
    console.log(`${pterodactylOk ? '✅' : '❌'} Pterodactyl API: ${pterodactylOk ? 'OK' : 'FAILED'}`);

    if (telegramOk && pterodactylOk) {
        console.log('\n🚀 All systems operational! Bot is ready to use.');
        console.log('\n📝 Next steps:');
        console.log('1. Run: npm start');
        console.log('2. Send /start to your Telegram bot');
        console.log('3. Enjoy! 🎊');
        process.exit(0);
    } else {
        console.log('\n❌ Some checks failed. Please fix the issues above.');
        process.exit(1);
    }
}

runHealthCheck().catch(error => {
    console.error('\n💥 Health check failed:', error.message);
    process.exit(1);
});
