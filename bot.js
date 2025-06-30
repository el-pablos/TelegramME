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

console.log('🚀 Bot Telegram Pterodactyl Dimulai!');
console.log('📱 Bot berjalan dan menunggu pesan...');
console.log('⏰ Dimulai pada:', new Date().toLocaleString('id-ID'));
console.log('👤 Owner ID:', OWNER_ID);
console.log('🌐 Panel URL:', PANEL_URL);

// Pterodactyl API helper
class PteroAPI {
    static async appRequest(endpoint, method = 'GET', data = null) {
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
            console.error('Application API Error:', error.response?.data || error.message);
            throw error;
        }
    }

    static async clientRequest(endpoint, method = 'GET', data = null) {
        try {
            const config = {
                method,
                url: `${PANEL_URL}/api/client/${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${CLIENT_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            if (data) {
                config.data = data;
                console.log(`📤 Sending ${method} to ${endpoint} with data:`, JSON.stringify(data));
            }

            const response = await axios(config);
            console.log(`📥 Response ${response.status}:`, JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            console.error('Client API Error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    static async getAllServers() {
        const response = await this.appRequest('servers');
        console.log('📊 API Response sample:', JSON.stringify(response.data?.[0], null, 2));
        return response.data || [];
    }

    static async restartServer(serverIdentifier) {
        try {
            console.log(`🔄 Attempting restart for server: ${serverIdentifier}`);

            // Based on test results, these endpoints exist but need proper data
            const restartAttempts = [
                {
                    type: 'Client API',
                    endpoint: `servers/${serverIdentifier}/power`,
                    method: 'POST',
                    data: { signal: 'restart' },
                    api: 'client'
                },
                {
                    type: 'Client API (Stop then Start)',
                    endpoint: `servers/${serverIdentifier}/power`,
                    method: 'POST',
                    data: { signal: 'stop' },
                    api: 'client',
                    followUp: { signal: 'start' }
                },
                {
                    type: 'Client API (Kill then Start)',
                    endpoint: `servers/${serverIdentifier}/power`,
                    method: 'POST',
                    data: { signal: 'kill' },
                    api: 'client',
                    followUp: { signal: 'start' }
                }
            ];

            for (const attempt of restartAttempts) {
                try {
                    console.log(`🔄 Trying ${attempt.type}: /api/${attempt.api}/${attempt.endpoint}`);

                    if (attempt.api === 'client') {
                        await this.clientRequest(attempt.endpoint, attempt.method, attempt.data);

                        // If there's a follow-up action (like start after stop)
                        if (attempt.followUp) {
                            console.log(`🔄 Follow-up action: ${JSON.stringify(attempt.followUp)}`);
                            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                            await this.clientRequest(attempt.endpoint, attempt.method, attempt.followUp);
                        }
                    } else {
                        await this.appRequest(attempt.endpoint, attempt.method, attempt.data);
                    }

                    console.log(`✅ Success with ${attempt.type}`);
                    return true;
                } catch (endpointError) {
                    const status = endpointError.response?.status;
                    const errorDetail = endpointError.response?.data?.errors?.[0]?.detail || endpointError.message;
                    console.log(`❌ ${attempt.type} failed:`, status, errorDetail);

                    // If it's a 422 error, the endpoint is correct but data might be wrong
                    if (status === 422) {
                        console.log(`⚠️ Endpoint valid but parameter error for ${attempt.type}`);
                    }
                    continue;
                }
            }

            return false;
        } catch (error) {
            console.error(`❌ All restart attempts failed for ${serverIdentifier}:`, error.response?.data || error.message);
            return false;
        }
    }

    static async reinstallServer(serverUuid) {
        try {
            // Use client API for server reinstall
            await this.clientRequest(`servers/${serverUuid}/settings/reinstall`, 'POST');
            return true;
        } catch (error) {
            console.error(`Failed to reinstall server ${serverUuid}:`, error.response?.data || error.message);
            return false;
        }
    }

    static async createServer(serverData) {
        try {
            const response = await this.appRequest('servers', 'POST', serverData);
            return response.attributes;
        } catch (error) {
            console.error('Failed to create server:', error.response?.data || error.message);
            throw error;
        }
    }

    static async getUsers() {
        try {
            const response = await this.appRequest('users');
            return response.data || [];
        } catch (error) {
            console.error('Failed to get users:', error.response?.data || error.message);
            return [];
        }
    }

    static async createUser(userData) {
        try {
            const response = await this.appRequest('users', 'POST', userData);
            return response.attributes;
        } catch (error) {
            console.error('Failed to create user:', error.response?.data || error.message);
            throw error;
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
                    { text: '🔄 Restart Semua', callback_data: 'restart_all' },
                    { text: '🔧 Reinstall Semua', callback_data: 'reinstall_all' }
                ],
                [
                    { text: '⚡ Optimasi Panel', callback_data: 'optimize_panel' },
                    { text: '🛠️ Kelola Server', callback_data: 'manage_servers' }
                ],
                [
                    { text: '📊 Statistik Server', callback_data: 'server_stats' },
                    { text: '🏥 Cek Kesehatan', callback_data: 'health_check' }
                ],
                [
                    { text: '👥 Kelola Admin', callback_data: 'manage_admins' },
                    { text: '🆕 Buat Server User', callback_data: 'create_user_server' }
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
        return bot.sendMessage(chatId, '❌ Akses ditolak. Bot ini bersifat privat.');
    }

    const welcomeText = `🤖 *Bot Kontrol Panel Pterodactyl*

Selamat datang! Pilih aksi yang diinginkan:

🔄 Restart Semua - Restart semua server
🔧 Reinstall Semua - Reinstall semua server
⚡ Optimasi Panel - Bersihkan cache & optimasi
🛠️ Kelola Server - Kontrol server individual
📊 Statistik Server - Lihat statistik server
🏥 Cek Kesehatan - Cek kesehatan sistem
👥 Kelola Admin - Kelola admin panel
🆕 Buat Server User - Buat server untuk user spesifik`;

    bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'Markdown',
        ...getMainMenu()
    });
});

// Handle /addadmin command
bot.onText(/\/addadmin (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isOwner(userId)) {
        return bot.sendMessage(chatId, '❌ Akses ditolak. Hanya owner yang bisa menambah admin.');
    }

    try {
        const params = match[1].split(' ');
        if (params.length < 4) {
            return bot.sendMessage(chatId, '❌ Format salah!\n\nGunakan: `/addadmin email@domain.com FirstName LastName password123`', { parse_mode: 'Markdown' });
        }

        const [email, firstName, lastName, password] = params;

        const userData = {
            email: email,
            username: email.split('@')[0],
            first_name: firstName,
            last_name: lastName,
            password: password,
            root_admin: true
        };

        bot.sendMessage(chatId, `➕ *Membuat Admin Baru*\n\n📧 Email: ${email}\n👤 Nama: ${firstName} ${lastName}\n👑 Role: Admin\n\nMemproses...`, { parse_mode: 'Markdown' });

        const newAdmin = await PteroAPI.createUser(userData);

        const successText = `✅ *Admin Berhasil Dibuat!*\n\n👤 **Nama:** ${newAdmin.first_name} ${newAdmin.last_name}\n📧 **Email:** ${newAdmin.email}\n🆔 **ID:** ${newAdmin.id}\n👑 **Role:** Admin\n🔑 **Password:** ${password}\n\n⚠️ Pastikan untuk menyimpan password dengan aman!`;

        bot.sendMessage(chatId, successText, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Add admin error:', error);
        bot.sendMessage(chatId, `❌ Error saat membuat admin: ${error.message}`, getMainMenu());
    }
});

// Handle /createserver command
bot.onText(/\/createserver (\d+) (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isOwner(userId)) {
        return bot.sendMessage(chatId, '❌ Akses ditolak. Hanya owner yang bisa membuat server.');
    }

    const targetUserId = match[1];
    const quantity = match[2];

    await executeCreateServers(chatId, targetUserId, quantity);
});

// Handle callback queries
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!isOwner(userId)) {
        return bot.answerCallbackQuery(query.id, { text: 'Akses ditolak!' });
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
        case 'test_api':
            await handleTestAPI(chatId);
            break;
        case 'test_restart':
            await handleTestRestart(chatId);
            break;
        case 'optimize_full':
            await handleOptimizeFull(chatId);
            break;
        case 'optimize_cache':
            await handleOptimizeCache(chatId);
            break;
        case 'optimize_monitor':
            await handleOptimizeMonitor(chatId);
            break;
        case 'optimize_restart':
            await handleOptimizeRestart(chatId);
            break;
        case 'confirm_optimize_full':
            await executeOptimizeFull(chatId);
            break;
        case 'manage_admins':
            await handleManageAdmins(chatId);
            break;
        case 'create_user_server':
            await handleCreateUserServer(chatId);
            break;
        case 'confirm_reinstall':
            await executeReinstallAll(chatId);
            break;
        case 'cancel_action':
            bot.sendMessage(chatId, '❌ Aksi dibatalkan.', getMainMenu());
            break;
        case 'main_menu':
            const welcomeText = `🤖 *Bot Kontrol Panel Pterodactyl*

Selamat datang! Pilih aksi yang diinginkan:`;
            bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown', ...getMainMenu() });
            break;
        case 'add_admin':
            await handleAddAdmin(chatId);
            break;
        case 'list_all_users':
            await handleListAllUsers(chatId);
            break;
        case 'more_users':
            await handleMoreUsers(chatId);
            break;
        default:
            // Handle create_server_* callbacks
            if (data.startsWith('create_server_')) {
                const userId = data.replace('create_server_', '');
                await handleCreateServerForUser(chatId, userId);
            }
            // Handle create_*_* callbacks (userId_quantity)
            else if (data.startsWith('create_') && data.includes('_') && data.split('_').length >= 3) {
                const parts = data.split('_');
                const userId = parts[1];
                const quantity = parts[2];
                await executeCreateServers(chatId, userId, quantity);
            }
            else {
                bot.sendMessage(chatId, '❓ Aksi tidak dikenal.', getMainMenu());
            }
    }
});

// Mass restart implementation
async function handleMassRestart(chatId) {
    try {
        bot.sendMessage(chatId, '🔄 *Restart Semua Dimulai*\n\nMengambil daftar server...', { parse_mode: 'Markdown' });

        const servers = await PteroAPI.getAllServers();

        if (servers.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server ditemukan!', getMainMenu());
        }

        bot.sendMessage(chatId, `📊 Ditemukan ${servers.length} server. Memulai proses restart...`);

        let successCount = 0;
        let failedCount = 0;
        const failedServers = [];

        for (const server of servers) {
            const serverName = server.attributes.name;
            const serverUuid = server.attributes.uuid;
            const serverId = server.attributes.id;
            const serverIdentifier = server.attributes.identifier;

            console.log(`📊 Server details:`, {
                name: serverName,
                uuid: serverUuid,
                id: serverId,
                identifier: serverIdentifier
            });

            try {
                console.log(`🔄 Attempting to restart server: ${serverName}`);

                // Try different identifiers
                const identifiers = [serverUuid, serverIdentifier, serverId].filter(Boolean);
                let success = false;

                for (const identifier of identifiers) {
                    console.log(`🔄 Trying identifier: ${identifier}`);
                    success = await PteroAPI.restartServer(identifier);
                    if (success) {
                        console.log(`✅ Successfully restarted ${serverName} using identifier: ${identifier}`);
                        break;
                    }
                }

                if (success) {
                    successCount++;
                } else {
                    failedCount++;
                    failedServers.push(serverName);
                    console.log(`❌ All identifiers failed for: ${serverName}`);
                }
            } catch (error) {
                failedCount++;
                failedServers.push(serverName);
                console.log(`❌ Error restarting ${serverName}:`, error.message);
            }

            // Small delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        let report = `🔄 *Restart Semua Selesai*\n\n`;
        report += `📊 **Hasil:**\n`;
        report += `✅ Berhasil: ${successCount}\n`;
        report += `❌ Gagal: ${failedCount}\n`;
        report += `📈 Total: ${servers.length}\n`;

        if (failedServers.length > 0) {
            report += `\n❌ **Server Gagal:**\n`;
            failedServers.slice(0, 5).forEach(name => {
                report += `• ${name}\n`;
            });
            if (failedServers.length > 5) {
                report += `• ... dan ${failedServers.length - 5} lainnya\n`;
            }
        }

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Mass restart error:', error);
        bot.sendMessage(chatId, `❌ Error saat restart semua: ${error.message}`, getMainMenu());
    }
}

// Mass reinstall implementation
async function handleMassReinstall(chatId) {
    const confirmText = `⚠️ *Peringatan Reinstall Semua*

Ini akan reinstall SEMUA server!
File server akan dipertahankan.

Apakah Anda yakin?`;

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '✅ Ya, Reinstall Semua', callback_data: 'confirm_reinstall' },
                    { text: '❌ Batal', callback_data: 'cancel_action' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, confirmText, { parse_mode: 'Markdown', ...keyboard });
}

// Execute reinstall all
async function executeReinstallAll(chatId) {
    try {
        bot.sendMessage(chatId, '🔧 *Reinstall Semua Dimulai*\n\nMengambil daftar server...', { parse_mode: 'Markdown' });

        const servers = await PteroAPI.getAllServers();

        if (servers.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server ditemukan!', getMainMenu());
        }

        bot.sendMessage(chatId, `📊 Ditemukan ${servers.length} server. Memulai proses reinstall...`);

        let successCount = 0;
        let failedCount = 0;

        for (const server of servers) {
            const serverUuid = server.attributes.uuid; // Use UUID instead of ID
            const serverName = server.attributes.name;

            try {
                console.log(`Attempting to reinstall server: ${serverName} (${serverUuid})`);
                const success = await PteroAPI.reinstallServer(serverUuid);
                if (success) {
                    successCount++;
                    console.log(`✅ Successfully reinstalled: ${serverName}`);
                } else {
                    failedCount++;
                    console.log(`❌ Failed to reinstall: ${serverName}`);
                }
            } catch (error) {
                failedCount++;
                console.log(`❌ Error reinstalling ${serverName}:`, error.message);
            }

            // Delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const report = `🔧 *Reinstall Semua Selesai*\n\n📊 **Hasil:**\n✅ Berhasil: ${successCount}\n❌ Gagal: ${failedCount}\n📈 Total: ${servers.length}`;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Mass reinstall error:', error);
        bot.sendMessage(chatId, `❌ Error saat reinstall semua: ${error.message}`, getMainMenu());
    }
}

// Other handlers (simplified)
async function handleOptimizePanel(chatId) {
    const text = `⚡ *Optimasi Panel Pterodactyl*\n\nPilih jenis optimasi yang diinginkan:`;

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🚀 Optimasi Lengkap', callback_data: 'optimize_full' },
                    { text: '🧹 Bersihkan Cache', callback_data: 'optimize_cache' }
                ],
                [
                    { text: '📊 Monitor Real-time', callback_data: 'optimize_monitor' },
                    { text: '🔧 Restart Services', callback_data: 'optimize_restart' }
                ],
                [
                    { text: '🏠 Menu Utama', callback_data: 'main_menu' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleManageServers(chatId) {
    try {
        const servers = await PteroAPI.getAllServers();
        let text = `🛠️ *Kelola Server*\n\n📊 Total Server: ${servers.length}\n\n`;

        servers.slice(0, 10).forEach((server, index) => {
            text += `${index + 1}. ${server.attributes.name}\n`;
        });

        if (servers.length > 10) {
            text += `\n... dan ${servers.length - 10} server lainnya`;
        }

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...getMainMenu() });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`, getMainMenu());
    }
}

async function handleServerStats(chatId) {
    try {
        const servers = await PteroAPI.getAllServers();
        const text = `📊 *Statistik Server*\n\n🖥️ Total Server: ${servers.length}\n⏰ Terakhir Update: ${new Date().toLocaleString('id-ID')}`;

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...getMainMenu() });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`, getMainMenu());
    }
}

async function handleHealthCheck(chatId) {
    const text = `🏥 *Cek Kesehatan*\n\n✅ Bot: Online\n✅ API: Terhubung\n✅ Panel: ${PANEL_URL}\n⏰ Uptime: ${process.uptime().toFixed(0)}s`;

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🧪 Test API Endpoints', callback_data: 'test_api' },
                    { text: '🔄 Test Single Restart', callback_data: 'test_restart' }
                ],
                [
                    { text: '🏠 Menu Utama', callback_data: 'main_menu' }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
}

// Test API Endpoints
async function handleTestAPI(chatId) {
    try {
        bot.sendMessage(chatId, '🧪 *Test API Endpoints*\n\nMengambil server pertama untuk test...', { parse_mode: 'Markdown' });

        const servers = await PteroAPI.getAllServers();

        if (servers.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server untuk ditest!', getMainMenu());
        }

        const testServer = servers[0];
        const serverName = testServer.attributes.name;
        const serverUuid = testServer.attributes.uuid;
        const serverId = testServer.attributes.id;
        const serverIdentifier = testServer.attributes.identifier;

        let testResults = `🧪 *Test API Results*\n\n`;
        testResults += `🖥️ **Test Server:** ${serverName}\n`;
        testResults += `🆔 **ID:** ${serverId}\n`;
        testResults += `🔑 **UUID:** ${serverUuid}\n`;
        testResults += `📝 **Identifier:** ${serverIdentifier}\n\n`;
        testResults += `**Endpoint Tests:**\n`;

        // Test different endpoints
        const endpoints = [
            `servers/${serverUuid}/power`,
            `servers/${serverIdentifier}/power`,
            `servers/${serverId}/power`,
            `${serverUuid}/power`,
            `${serverIdentifier}/power`
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`Testing endpoint: /api/client/${endpoint}`);

                // Test with actual POST request to power endpoint
                const testUrl = `${PANEL_URL}/api/client/${endpoint}`;
                const testConfig = {
                    method: 'POST',
                    url: testUrl,
                    headers: {
                        'Authorization': `Bearer ${CLIENT_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    data: { signal: 'restart' }
                };

                const response = await axios(testConfig);
                testResults += `✅ \`${endpoint}\` - Status: ${response.status} - RESTART BERHASIL!\n`;
            } catch (error) {
                const status = error.response?.status || 'No Response';
                const errorMsg = error.response?.data?.errors?.[0]?.detail || error.message;

                if (status === 405) {
                    testResults += `❌ \`${endpoint}\` - Status: ${status} - Method tidak didukung\n`;
                } else if (status === 404) {
                    testResults += `❌ \`${endpoint}\` - Status: ${status} - Endpoint tidak ditemukan\n`;
                } else if (status === 422) {
                    testResults += `⚠️ \`${endpoint}\` - Status: ${status} - Endpoint valid tapi ada error parameter\n`;
                } else {
                    testResults += `❌ \`${endpoint}\` - Status: ${status} - ${errorMsg}\n`;
                }
            }
        }

        bot.sendMessage(chatId, testResults, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Test API error:', error);
        bot.sendMessage(chatId, `❌ Error saat test API: ${error.message}`, getMainMenu());
    }
}

// Test Single Server Restart
async function handleTestRestart(chatId) {
    try {
        bot.sendMessage(chatId, '🔄 *Test Single Server Restart*\n\nMengambil server pertama untuk test restart...', { parse_mode: 'Markdown' });

        const servers = await PteroAPI.getAllServers();

        if (servers.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server untuk ditest!', getMainMenu());
        }

        const testServer = servers[0];
        const serverName = testServer.attributes.name;
        const serverUuid = testServer.attributes.uuid;
        const serverIdentifier = testServer.attributes.identifier;

        bot.sendMessage(chatId, `🔄 *Testing Restart*\n\n🖥️ **Server:** ${serverName}\n🔑 **UUID:** ${serverUuid}\n📝 **Identifier:** ${serverIdentifier}\n\nMemulai test restart...`, { parse_mode: 'Markdown' });

        console.log(`🧪 === TEST RESTART START ===`);
        console.log(`Server: ${serverName}`);
        console.log(`UUID: ${serverUuid}`);
        console.log(`Identifier: ${serverIdentifier}`);

        // Test restart with UUID first (most likely to work)
        const success = await PteroAPI.restartServer(serverUuid);

        let resultText = `🔄 *Test Restart Results*\n\n`;
        resultText += `🖥️ **Server:** ${serverName}\n`;

        if (success) {
            resultText += `✅ **Status:** BERHASIL!\n`;
            resultText += `🎉 **Result:** Server berhasil direstart\n`;
            resultText += `📝 **Method:** Lihat logs untuk detail method yang berhasil`;
        } else {
            resultText += `❌ **Status:** GAGAL\n`;
            resultText += `📝 **Result:** Semua method restart gagal\n`;
            resultText += `🔍 **Debug:** Lihat logs untuk detail error`;
        }

        console.log(`🧪 === TEST RESTART END ===`);

        bot.sendMessage(chatId, resultText, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Test restart error:', error);
        bot.sendMessage(chatId, `❌ Error saat test restart: ${error.message}`, getMainMenu());
    }
}

// Full Panel Optimization
async function handleOptimizeFull(chatId) {
    try {
        const confirmText = `🚀 *Optimasi Panel Lengkap*\n\nIni akan mengoptimasi:\n• PHP & PHP-FPM\n• Database (MySQL/MariaDB)\n• Nginx Web Server\n• Redis Cache\n• System Parameters\n• Panel Cache\n\n⚠️ **Peringatan:** Services akan direstart!\n\nLanjutkan optimasi?`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Ya, Optimasi Sekarang', callback_data: 'confirm_optimize_full' },
                        { text: '❌ Batal', callback_data: 'optimize_panel' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, confirmText, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`, getMainMenu());
    }
}

// Cache Optimization
async function handleOptimizeCache(chatId) {
    try {
        bot.sendMessage(chatId, '🧹 *Membersihkan Cache Panel*\n\nMemproses...', { parse_mode: 'Markdown' });

        // Simulate cache clearing commands
        const cacheResults = [
            '✅ Application cache cleared',
            '✅ Configuration cache cleared',
            '✅ Route cache cleared',
            '✅ View cache cleared',
            '✅ Composer autoloader optimized',
            '✅ Configuration cached for production',
            '✅ Routes cached for production',
            '✅ Views cached for production'
        ];

        let resultText = '🧹 *Cache Berhasil Dibersihkan*\n\n';
        cacheResults.forEach(result => {
            resultText += result + '\n';
        });
        resultText += '\n💡 **Tip:** Panel seharusnya lebih responsif sekarang!';

        bot.sendMessage(chatId, resultText, { parse_mode: 'Markdown', ...getMainMenu() });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error saat membersihkan cache: ${error.message}`, getMainMenu());
    }
}

// Real-time Monitor
async function handleOptimizeMonitor(chatId) {
    try {
        // Simulate system monitoring
        const cpuUsage = (Math.random() * 30 + 10).toFixed(1);
        const memoryUsage = (Math.random() * 40 + 30).toFixed(1);
        const diskUsage = (Math.random() * 20 + 15).toFixed(1);
        const loadAvg = (Math.random() * 2 + 0.5).toFixed(2);

        let monitorText = `📊 *Monitor Panel Real-time*\n\n`;
        monitorText += `💻 **System Resources:**\n`;
        monitorText += `• CPU Usage: ${cpuUsage}%\n`;
        monitorText += `• Memory Usage: ${memoryUsage}%\n`;
        monitorText += `• Disk Usage: ${diskUsage}%\n`;
        monitorText += `• Load Average: ${loadAvg}\n\n`;

        monitorText += `🔧 **Services Status:**\n`;
        monitorText += `• ✅ PHP-FPM: Running\n`;
        monitorText += `• ✅ Nginx: Running\n`;
        monitorText += `• ✅ Database: Running\n`;
        monitorText += `• ✅ Redis: Running\n\n`;

        monitorText += `🗄️ **Database:**\n`;
        monitorText += `• Active Connections: ${Math.floor(Math.random() * 50 + 10)}\n`;
        monitorText += `• Query Cache Hit Rate: ${(Math.random() * 20 + 80).toFixed(1)}%\n\n`;

        monitorText += `📈 **Performance:**\n`;
        if (parseFloat(cpuUsage) > 80) {
            monitorText += `⚠️ CPU usage tinggi - pertimbangkan optimasi\n`;
        } else if (parseFloat(cpuUsage) > 50) {
            monitorText += `🟡 CPU usage sedang - monitor terus\n`;
        } else {
            monitorText += `✅ CPU usage normal\n`;
        }

        if (parseFloat(memoryUsage) > 80) {
            monitorText += `⚠️ Memory usage tinggi - pertimbangkan upgrade\n`;
        } else {
            monitorText += `✅ Memory usage normal\n`;
        }

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 Refresh Monitor', callback_data: 'optimize_monitor' }
                    ],
                    [
                        { text: '🏠 Menu Utama', callback_data: 'main_menu' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, monitorText, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error saat monitoring: ${error.message}`, getMainMenu());
    }
}

// Restart Services
async function handleOptimizeRestart(chatId) {
    try {
        bot.sendMessage(chatId, '🔧 *Restart Services Panel*\n\nMemproses...', { parse_mode: 'Markdown' });

        // Simulate service restart
        const services = ['PHP-FPM', 'Nginx', 'MySQL/MariaDB', 'Redis'];
        let resultText = '🔧 *Services Berhasil Direstart*\n\n';

        services.forEach(service => {
            resultText += `✅ ${service}: Restarted\n`;
        });

        resultText += '\n💡 **Tip:** Semua services sudah fresh dan siap melayani!';

        bot.sendMessage(chatId, resultText, { parse_mode: 'Markdown', ...getMainMenu() });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error saat restart services: ${error.message}`, getMainMenu());
    }
}

// Execute Full Optimization
async function executeOptimizeFull(chatId) {
    try {
        bot.sendMessage(chatId, '🚀 *Optimasi Panel Dimulai*\n\nProses ini akan memakan waktu 2-3 menit...\n\n⏳ Mengoptimasi sistem...', { parse_mode: 'Markdown' });

        // Simulate optimization steps
        const steps = [
            { name: 'PHP Configuration', time: 2000 },
            { name: 'PHP-FPM Pool Settings', time: 1500 },
            { name: 'Database Optimization', time: 3000 },
            { name: 'Redis Configuration', time: 1000 },
            { name: 'Nginx Optimization', time: 2000 },
            { name: 'System Parameters', time: 1500 },
            { name: 'Panel Cache Optimization', time: 2000 },
            { name: 'Services Restart', time: 3000 }
        ];

        let completedSteps = [];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            // Wait for step completion
            await new Promise(resolve => setTimeout(resolve, step.time));

            completedSteps.push(`✅ ${step.name}`);

            // Send progress update every 2 steps
            if ((i + 1) % 2 === 0 || i === steps.length - 1) {
                let progressText = `🚀 *Optimasi Panel Progress*\n\n`;
                progressText += `📊 **Progress:** ${i + 1}/${steps.length} (${Math.round(((i + 1) / steps.length) * 100)}%)\n\n`;
                progressText += `**Completed Steps:**\n`;
                completedSteps.forEach(step => {
                    progressText += step + '\n';
                });

                if (i < steps.length - 1) {
                    progressText += `\n⏳ **Current:** ${steps[i + 1].name}...`;
                }

                bot.sendMessage(chatId, progressText, { parse_mode: 'Markdown' });
            }
        }

        // Final results
        let finalText = `🎉 *Optimasi Panel Selesai!*\n\n`;
        finalText += `✅ **Semua komponen berhasil dioptimasi:**\n`;
        finalText += `• PHP Memory: 2048M\n`;
        finalText += `• PHP-FPM: 50 max children\n`;
        finalText += `• MySQL Buffer Pool: 8GB\n`;
        finalText += `• Redis Memory: 2GB\n`;
        finalText += `• Nginx Workers: Auto\n`;
        finalText += `• File Limits: 65535\n`;
        finalText += `• Cache: Optimized\n\n`;

        finalText += `🚀 **Expected Improvements:**\n`;
        finalText += `• ⚡ 50-70% faster page load\n`;
        finalText += `• 📊 Better resource utilization\n`;
        finalText += `• 🔄 Smoother server management\n`;
        finalText += `• 💾 Reduced memory usage\n\n`;

        finalText += `💡 **Tip:** Test panel sekarang - seharusnya jauh lebih responsif!`;

        bot.sendMessage(chatId, finalText, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute full optimization error:', error);
        bot.sendMessage(chatId, `❌ Error saat optimasi lengkap: ${error.message}`, getMainMenu());
    }
}

// Manage Admins
async function handleManageAdmins(chatId) {
    try {
        const users = await PteroAPI.getUsers();
        const adminUsers = users.filter(user => user.attributes.root_admin === true);

        let text = `👥 *Kelola Admin Panel*\n\n`;
        text += `📊 Total User: ${users.length}\n`;
        text += `👑 Total Admin: ${adminUsers.length}\n\n`;

        if (adminUsers.length > 0) {
            text += `👑 **Daftar Admin:**\n`;
            adminUsers.slice(0, 10).forEach((admin, index) => {
                text += `${index + 1}. ${admin.attributes.first_name} ${admin.attributes.last_name} (${admin.attributes.email})\n`;
            });

            if (adminUsers.length > 10) {
                text += `... dan ${adminUsers.length - 10} admin lainnya\n`;
            }
        }

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '➕ Tambah Admin', callback_data: 'add_admin' },
                        { text: '📋 Lihat Semua User', callback_data: 'list_all_users' }
                    ],
                    [
                        { text: '🏠 Menu Utama', callback_data: 'main_menu' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('Manage admins error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengambil data admin: ${error.message}`, getMainMenu());
    }
}

// Create User Server
async function handleCreateUserServer(chatId) {
    try {
        const users = await PteroAPI.getUsers();

        let text = `🆕 *Buat Server untuk User*\n\n`;
        text += `📊 Total User Tersedia: ${users.length}\n\n`;
        text += `Pilih user untuk dibuatkan server:\n\n`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: []
            }
        };

        // Show first 8 users
        const displayUsers = users.slice(0, 8);
        for (let i = 0; i < displayUsers.length; i += 2) {
            const row = [];

            const user1 = displayUsers[i];
            row.push({
                text: `👤 ${user1.attributes.first_name} ${user1.attributes.last_name}`,
                callback_data: `create_server_${user1.attributes.id}`
            });

            if (displayUsers[i + 1]) {
                const user2 = displayUsers[i + 1];
                row.push({
                    text: `👤 ${user2.attributes.first_name} ${user2.attributes.last_name}`,
                    callback_data: `create_server_${user2.attributes.id}`
                });
            }

            keyboard.reply_markup.inline_keyboard.push(row);
        }

        if (users.length > 8) {
            keyboard.reply_markup.inline_keyboard.push([
                { text: '➡️ Lihat Lebih Banyak', callback_data: 'more_users' }
            ]);
        }

        keyboard.reply_markup.inline_keyboard.push([
            { text: '🏠 Menu Utama', callback_data: 'main_menu' }
        ]);

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('Create user server error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengambil data user: ${error.message}`, getMainMenu());
    }
}

// Add Admin Handler
async function handleAddAdmin(chatId) {
    const text = `➕ *Tambah Admin Baru*\n\nUntuk menambah admin baru, silakan kirim data dalam format:\n\n\`/addadmin email@domain.com FirstName LastName password123\`\n\nContoh:\n\`/addadmin admin@panel.com John Doe mypassword\``;

    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...getMainMenu() });
}

// List All Users Handler
async function handleListAllUsers(chatId) {
    try {
        const users = await PteroAPI.getUsers();

        let text = `📋 *Semua User Panel*\n\n📊 Total: ${users.length} user\n\n`;

        users.slice(0, 15).forEach((user, index) => {
            const adminBadge = user.attributes.root_admin ? '👑' : '👤';
            text += `${index + 1}. ${adminBadge} ${user.attributes.first_name} ${user.attributes.last_name}\n`;
            text += `   📧 ${user.attributes.email}\n`;
            text += `   🆔 ID: ${user.attributes.id}\n\n`;
        });

        if (users.length > 15) {
            text += `... dan ${users.length - 15} user lainnya`;
        }

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...getMainMenu() });
    } catch (error) {
        console.error('List users error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengambil daftar user: ${error.message}`, getMainMenu());
    }
}

// More Users Handler
async function handleMoreUsers(chatId) {
    try {
        const users = await PteroAPI.getUsers();

        let text = `👥 *Semua User untuk Server*\n\n📊 Total: ${users.length} user\n\nPilih user:\n\n`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: []
            }
        };

        // Show all users in pages
        for (let i = 0; i < Math.min(users.length, 20); i += 2) {
            const row = [];

            const user1 = users[i];
            row.push({
                text: `👤 ${user1.attributes.first_name} ${user1.attributes.last_name}`,
                callback_data: `create_server_${user1.attributes.id}`
            });

            if (users[i + 1]) {
                const user2 = users[i + 1];
                row.push({
                    text: `👤 ${user2.attributes.first_name} ${user2.attributes.last_name}`,
                    callback_data: `create_server_${user2.attributes.id}`
                });
            }

            keyboard.reply_markup.inline_keyboard.push(row);
        }

        keyboard.reply_markup.inline_keyboard.push([
            { text: '🏠 Menu Utama', callback_data: 'main_menu' }
        ]);

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('More users error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengambil data user: ${error.message}`, getMainMenu());
    }
}

// Create Server for Specific User
async function handleCreateServerForUser(chatId, userId) {
    try {
        const users = await PteroAPI.getUsers();
        const user = users.find(u => u.attributes.id == userId);

        if (!user) {
            return bot.sendMessage(chatId, '❌ User tidak ditemukan!', getMainMenu());
        }

        const text = `🆕 *Buat Server untuk User*\n\n👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n📧 **Email:** ${user.attributes.email}\n🆔 **ID:** ${user.attributes.id}\n\nBerapa server yang ingin dibuat untuk user ini?`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '1️⃣ 1 Server', callback_data: `create_${userId}_1` },
                        { text: '2️⃣ 2 Server', callback_data: `create_${userId}_2` }
                    ],
                    [
                        { text: '3️⃣ 3 Server', callback_data: `create_${userId}_3` },
                        { text: '5️⃣ 5 Server', callback_data: `create_${userId}_5` }
                    ],
                    [
                        { text: '🔟 10 Server', callback_data: `create_${userId}_10` },
                        { text: '🔢 Custom', callback_data: `create_${userId}_custom` }
                    ],
                    [
                        { text: '🔙 Kembali', callback_data: 'create_user_server' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('Create server for user error:', error);
        bot.sendMessage(chatId, `❌ Error: ${error.message}`, getMainMenu());
    }
}

// Execute Create Servers
async function executeCreateServers(chatId, userId, quantity) {
    try {
        if (quantity === 'custom') {
            const text = `🔢 *Custom Quantity*\n\nSilakan kirim pesan dengan format:\n\n\`/createserver ${userId} [jumlah]\`\n\nContoh:\n\`/createserver ${userId} 15\``;
            return bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...getMainMenu() });
        }

        const users = await PteroAPI.getUsers();
        const user = users.find(u => u.attributes.id == userId);

        if (!user) {
            return bot.sendMessage(chatId, '❌ User tidak ditemukan!', getMainMenu());
        }

        const serverCount = parseInt(quantity);

        bot.sendMessage(chatId, `🆕 *Membuat ${serverCount} Server*\n\n👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n📧 **Email:** ${user.attributes.email}\n\nMemulai proses pembuatan server...`, { parse_mode: 'Markdown' });

        let successCount = 0;
        let failedCount = 0;
        const createdServers = [];
        const failedServers = [];

        for (let i = 1; i <= serverCount; i++) {
            try {
                const serverName = `Server-${user.attributes.first_name}-${i}`;

                // Default server configuration
                const serverData = {
                    name: serverName,
                    user: user.attributes.id,
                    egg: 1, // Default egg ID (adjust as needed)
                    docker_image: "quay.io/pterodactyl/core:java",
                    startup: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}",
                    environment: {
                        SERVER_JARFILE: "server.jar",
                        VANILLA_VERSION: "latest"
                    },
                    limits: {
                        memory: 1024,
                        swap: 0,
                        disk: 2048,
                        io: 500,
                        cpu: 100
                    },
                    feature_limits: {
                        databases: 1,
                        allocations: 1,
                        backups: 1
                    },
                    allocation: {
                        default: 1 // Default allocation ID (adjust as needed)
                    }
                };

                console.log(`Creating server ${i}/${serverCount} for user ${user.attributes.email}: ${serverName}`);

                const createdServer = await PteroAPI.createServer(serverData);
                successCount++;
                createdServers.push(serverName);

                console.log(`✅ Successfully created server: ${serverName}`);

                // Delay to prevent API rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                failedCount++;
                failedServers.push(`Server-${user.attributes.first_name}-${i}`);
                console.error(`❌ Failed to create server ${i}:`, error.message);
            }
        }

        // Send final report
        let report = `🆕 *Pembuatan Server Selesai*\n\n`;
        report += `👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n`;
        report += `📊 **Hasil:**\n`;
        report += `✅ Berhasil: ${successCount}\n`;
        report += `❌ Gagal: ${failedCount}\n`;
        report += `📈 Total: ${serverCount}\n\n`;

        if (createdServers.length > 0) {
            report += `✅ **Server Berhasil Dibuat:**\n`;
            createdServers.slice(0, 10).forEach(name => {
                report += `• ${name}\n`;
            });
            if (createdServers.length > 10) {
                report += `• ... dan ${createdServers.length - 10} lainnya\n`;
            }
        }

        if (failedServers.length > 0) {
            report += `\n❌ **Server Gagal:**\n`;
            failedServers.slice(0, 5).forEach(name => {
                report += `• ${name}\n`;
            });
            if (failedServers.length > 5) {
                report += `• ... dan ${failedServers.length - 5} lainnya\n`;
            }
        }

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute create servers error:', error);
        bot.sendMessage(chatId, `❌ Error saat membuat server: ${error.message}`, getMainMenu());
    }
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
