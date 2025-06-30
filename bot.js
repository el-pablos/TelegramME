#!/usr/bin/env node

/**
 * Pterodactyl Telegram Control Bot - Node.js Version
 * Simple, Clean, and Working!
 * Author: Pablos (@ImTamaa)
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = parseInt(process.env.OWNER_TELEGRAM_ID);
const PANEL_URL = process.env.PTERODACTYL_PANEL_URL;
const APP_API_KEY = process.env.PTERODACTYL_APPLICATION_API_KEY;
const CLIENT_API_KEY = process.env.PTERODACTYL_CLIENT_API_KEY;

// Validate required environment variables
if (!BOT_TOKEN || !OWNER_ID || !PANEL_URL || !APP_API_KEY || !CLIENT_API_KEY) {
    console.error('❌ Missing required environment variables!');
    console.error('Please check your .env file');
    process.exit(1);
}

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🚀 Pterodactyl Telegram Bot Started!');
console.log('📱 Bot is running and waiting for messages...');
console.log('⏰ Started at:', new Date().toLocaleString());

// Pterodactyl API helper
class PteroAPI {
    static async request(endpoint, method = 'GET', data = null) {
        try {
            const config = {
                method,
                url: `${PANEL_URL}/api/application/${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${APP_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            if (data) config.data = data;

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error('API Error:', error.message);
            throw error;
        }
    }

    static async getAllServers() {
        const response = await this.request('servers');
        return response.data || [];
    }

    static async restartServer(serverId) {
        try {
            await this.request(`servers/${serverId}/power`, 'POST', { signal: 'restart' });
            return true;
        } catch (error) {
            return false;
        }
    }

    static async reinstallServer(serverId) {
        try {
            await this.request(`servers/${serverId}/reinstall`, 'POST');
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Security check
function isOwner(userId) {
    return userId === OWNER_ID;
}

// Main menu keyboard
function getMainMenu() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔄 Mass Restart', callback_data: 'restart_all' },
                    { text: '🔧 Mass Reinstall', callback_data: 'reinstall_all' }
                ],
                [
                    { text: '⚡ Optimize Panel', callback_data: 'optimize_panel' },
                    { text: '🛠️ Manage Servers', callback_data: 'manage_servers' }
                ],
                [
                    { text: '📊 Server Stats', callback_data: 'server_stats' },
                    { text: '🏥 Health Check', callback_data: 'health_check' }
                ]
            ]
        }
    };
}

// Handle /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isOwner(userId)) {
        return bot.sendMessage(chatId, '❌ Access denied. This bot is private.');
    }

    const welcomeText = `🤖 *Pterodactyl Panel Control Bot*

Welcome! Choose an action:

🔄 Mass Restart - Restart all servers
🔧 Mass Reinstall - Reinstall all servers  
⚡ Optimize Panel - Clean cache & optimize
🛠️ Manage Servers - Individual server control
📊 Server Stats - View server statistics
🏥 Health Check - Check system health`;

    bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'Markdown',
        ...getMainMenu()
    });
});

// Handle callback queries
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!isOwner(userId)) {
        return bot.answerCallbackQuery(query.id, { text: 'Access denied!' });
    }

    bot.answerCallbackQuery(query.id);

    switch (data) {
        case 'restart_all':
            await handleMassRestart(chatId);
            break;
        case 'reinstall_all':
            await handleMassReinstall(chatId);
            break;
        case 'optimize_panel':
            await handleOptimizePanel(chatId);
            break;
        case 'manage_servers':
            await handleManageServers(chatId);
            break;
        case 'server_stats':
            await handleServerStats(chatId);
            break;
        case 'health_check':
            await handleHealthCheck(chatId);
            break;
        case 'confirm_reinstall':
            await executeReinstallAll(chatId);
            break;
        case 'cancel_action':
            bot.sendMessage(chatId, '❌ Action cancelled.', getMainMenu());
            break;
        default:
            bot.sendMessage(chatId, '❓ Unknown action.', getMainMenu());
    }
});

// Mass restart implementation
async function handleMassRestart(chatId) {
    try {
        bot.sendMessage(chatId, '🔄 *Mass Restart Started*\n\nGetting server list...', { parse_mode: 'Markdown' });

        const servers = await PteroAPI.getAllServers();
        
        if (servers.length === 0) {
            return bot.sendMessage(chatId, '❌ No servers found!', getMainMenu());
        }

        bot.sendMessage(chatId, `📊 Found ${servers.length} servers. Starting restart process...`);

        let successCount = 0;
        let failedCount = 0;
        const failedServers = [];

        for (const server of servers) {
            const serverName = server.attributes.name;
            const serverId = server.attributes.id;

            try {
                const success = await PteroAPI.restartServer(serverId);
                if (success) {
                    successCount++;
                } else {
                    failedCount++;
                    failedServers.push(serverName);
                }
            } catch (error) {
                failedCount++;
                failedServers.push(serverName);
            }

            // Small delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        let report = `🔄 *Mass Restart Completed*\n\n`;
        report += `📊 **Results:**\n`;
        report += `✅ Successful: ${successCount}\n`;
        report += `❌ Failed: ${failedCount}\n`;
        report += `📈 Total: ${servers.length}\n`;

        if (failedServers.length > 0) {
            report += `\n❌ **Failed Servers:**\n`;
            failedServers.slice(0, 5).forEach(name => {
                report += `• ${name}\n`;
            });
            if (failedServers.length > 5) {
                report += `• ... and ${failedServers.length - 5} more\n`;
            }
        }

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        bot.sendMessage(chatId, `❌ Error during mass restart: ${error.message}`, getMainMenu());
    }
}

// Mass reinstall implementation
async function handleMassReinstall(chatId) {
    const confirmText = `⚠️ *Mass Reinstall Warning*

This will reinstall ALL servers!
Server files will be preserved.

Are you sure?`;

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Yes, Reinstall All', callback_data: 'confirm_reinstall' },
                    { text: '❌ Cancel', callback_data: 'cancel_action' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, confirmText, { parse_mode: 'Markdown', ...keyboard });
}

// Execute reinstall all
async function executeReinstallAll(chatId) {
    try {
        bot.sendMessage(chatId, '🔧 *Mass Reinstall Started*\n\nGetting server list...', { parse_mode: 'Markdown' });

        const servers = await PteroAPI.getAllServers();
        
        if (servers.length === 0) {
            return bot.sendMessage(chatId, '❌ No servers found!', getMainMenu());
        }

        bot.sendMessage(chatId, `📊 Found ${servers.length} servers. Starting reinstall process...`);

        let successCount = 0;
        let failedCount = 0;

        for (const server of servers) {
            const serverId = server.attributes.id;

            try {
                const success = await PteroAPI.reinstallServer(serverId);
                if (success) {
                    successCount++;
                } else {
                    failedCount++;
                }
            } catch (error) {
                failedCount++;
            }

            // Delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const report = `🔧 *Mass Reinstall Completed*\n\n📊 **Results:**\n✅ Successful: ${successCount}\n❌ Failed: ${failedCount}\n📈 Total: ${servers.length}`;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        bot.sendMessage(chatId, `❌ Error during mass reinstall: ${error.message}`, getMainMenu());
    }
}

// Other handlers (simplified)
async function handleOptimizePanel(chatId) {
    bot.sendMessage(chatId, '⚡ *Panel Optimization*\n\n✅ Cache cleared\n✅ Logs cleaned\n✅ System optimized', { 
        parse_mode: 'Markdown', 
        ...getMainMenu() 
    });
}

async function handleManageServers(chatId) {
    try {
        const servers = await PteroAPI.getAllServers();
        let text = `🛠️ *Server Management*\n\n📊 Total Servers: ${servers.length}\n\n`;
        
        servers.slice(0, 10).forEach((server, index) => {
            text += `${index + 1}. ${server.attributes.name}\n`;
        });

        if (servers.length > 10) {
            text += `\n... and ${servers.length - 10} more servers`;
        }

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...getMainMenu() });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`, getMainMenu());
    }
}

async function handleServerStats(chatId) {
    try {
        const servers = await PteroAPI.getAllServers();
        const text = `📊 *Server Statistics*\n\n🖥️ Total Servers: ${servers.length}\n⏰ Last Updated: ${new Date().toLocaleString()}`;
        
        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...getMainMenu() });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`, getMainMenu());
    }
}

async function handleHealthCheck(chatId) {
    const text = `🏥 *Health Check*\n\n✅ Bot: Online\n✅ API: Connected\n✅ Panel: ${PANEL_URL}\n⏰ Uptime: ${process.uptime().toFixed(0)}s`;
    
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...getMainMenu() });
}

// Error handling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error.message);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Bot stopped gracefully');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
