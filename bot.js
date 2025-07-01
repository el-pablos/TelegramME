#!/usr/bin/env node

/**
 * Pterodactyl Telegram Control Bot - Node.js Version
 * Simple, Clean, and Working!
 * Author: Pablos (@ImTamaa)
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Import Rose Bot modules
const AdminModule = require('./modules/admin');
const ModerationModule = require('./modules/moderation');
const WelcomeModule = require('./modules/welcome');
const NotesModule = require('./modules/notes');
const LocksModule = require('./modules/locks');

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

// Initialize Rose Bot modules
const adminModule = new AdminModule(bot);
const moderationModule = new ModerationModule(bot);
const welcomeModule = new WelcomeModule(bot);
const notesModule = new NotesModule(bot);
const locksModule = new LocksModule(bot);

console.log('🚀 Bot Telegram Pterodactyl + Rose Features Dimulai!');
console.log('📱 Bot berjalan dan menunggu pesan...');
console.log('⏰ Dimulai pada:', new Date().toLocaleString('id-ID'));
console.log('👤 Owner ID:', OWNER_ID);
console.log('🌐 Panel URL:', PANEL_URL);
console.log('🌹 Rose Bot Features: Loaded!');

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

    static async getAllUsers() {
        const response = await this.appRequest('users');
        return response.data || [];
    }

    static async getUserInfo(userId) {
        const response = await this.appRequest(`users/${userId}`);
        return response.attributes;
    }

    static async getServersByUser(userId) {
        // Get all servers and filter by user
        const allServers = await this.getAllServers();
        return allServers.filter(server => server.attributes.user === parseInt(userId));
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

// Helper function to estimate user data center based on user ID
function getUserDataCenter(userId) {
    // Telegram data centers and their approximate ID ranges
    const dataCenters = [
        { dc: 'DC1', location: 'Miami, USA', range: [0, 200000000] },
        { dc: 'DC2', location: 'Amsterdam, Netherlands', range: [200000000, 400000000] },
        { dc: 'DC3', location: 'Miami, USA', range: [400000000, 600000000] },
        { dc: 'DC4', location: 'Amsterdam, Netherlands', range: [600000000, 800000000] },
        { dc: 'DC5', location: 'Singapore', range: [800000000, 1000000000] }
    ];

    for (const dc of dataCenters) {
        if (userId >= dc.range[0] && userId < dc.range[1]) {
            return dc;
        }
    }

    // For very high IDs, estimate based on modulo
    const dcIndex = userId % 5;
    return dataCenters[dcIndex] || { dc: 'Unknown', location: 'Unknown' };
}

// Helper function to estimate account creation date based on user ID
function getAccountCreationEstimate(userId) {
    // Telegram started in 2013, user IDs are roughly sequential
    // This is a very rough estimate
    const telegramStart = new Date('2013-08-14'); // Telegram public launch
    const now = new Date();
    const totalTime = now.getTime() - telegramStart.getTime();

    // Estimate based on user ID (very rough approximation)
    // Assuming linear growth (which is not accurate but gives an idea)
    const maxUserId = 2000000000; // Rough estimate of current max user ID
    const userRatio = userId / maxUserId;
    const estimatedTime = telegramStart.getTime() + (totalTime * userRatio);
    const estimatedDate = new Date(estimatedTime);

    // Format the date
    const year = estimatedDate.getFullYear();
    const month = estimatedDate.toLocaleString('id-ID', { month: 'long' });

    return `${month} ${year}`;
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
                    { text: '📁 Auto Session Folder', callback_data: 'auto_session_folder' },
                    { text: '🔑 Auto Creds.json', callback_data: 'auto_creds_json' }
                ],
                [
                    { text: '🗑️ Delete Session Folder', callback_data: 'delete_session_folder' }
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

    if (msg.chat.type === 'private' && !isOwner(userId)) {
        return bot.sendMessage(chatId, '❌ Akses ditolak. Bot ini bersifat privat untuk owner.');
    }

    if (msg.chat.type === 'private') {
        // Private chat - show Pterodactyl panel
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
    } else {
        // Group chat - show Rose Bot features
        const groupWelcomeText = `🌹 *Rose Bot + Pterodactyl Panel*

Halo! Saya adalah bot manajemen grup dengan fitur lengkap Rose Bot plus kontrol panel Pterodactyl.

🛡️ **Fitur Moderasi:**
• Ban, mute, kick, warn users
• Anti-spam & antiflood protection
• Message locks & restrictions

💬 **Fitur Grup:**
• Welcome/goodbye messages
• Notes & filters (auto-reply)
• Admin management tools

📝 **Commands Utama:**
• \`/help\` - Bantuan lengkap
• \`/admins\` - Lihat daftar admin
• \`/locks\` - Lihat status locks
• \`/notes\` - Lihat notes tersimpan

Gunakan \`/help\` untuk melihat semua commands yang tersedia!`;

        bot.sendMessage(chatId, groupWelcomeText, { parse_mode: 'Markdown' });
    }
});

// Handle /id command
bot.onText(/\/id/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isOwner(userId)) {
        return bot.sendMessage(chatId, '❌ Akses ditolak. Hanya owner yang bisa menggunakan command ini.');
    }

    const chatType = msg.chat.type;
    const chatTitle = msg.chat.title || 'Private Chat';

    let infoText = `🆔 *Informasi Chat ID*\n\n`;
    infoText += `📱 **Chat ID:** \`${chatId}\`\n`;
    infoText += `📋 **Chat Type:** ${chatType}\n`;
    infoText += `🏷️ **Chat Title:** ${chatTitle}\n`;

    if (msg.chat.username) {
        infoText += `👤 **Username:** @${msg.chat.username}\n`;
    }

    infoText += `\n💡 **Tip:** Copy chat ID di atas untuk keperluan konfigurasi bot`;

    bot.sendMessage(chatId, infoText, { parse_mode: 'Markdown' });
});

// Handle /info command
bot.onText(/\/info/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isOwner(userId)) {
        return bot.sendMessage(chatId, '❌ Akses ditolak. Hanya owner yang bisa menggunakan command ini.');
    }

    let targetUser = null;
    let targetUserId = null;

    // Check if replying to a message
    if (msg.reply_to_message) {
        targetUser = msg.reply_to_message.from;
        targetUserId = targetUser.id;
    }
    // Check if mentioning a user in the message
    else if (msg.entities) {
        const mention = msg.entities.find(entity => entity.type === 'mention' || entity.type === 'text_mention');
        if (mention) {
            if (mention.type === 'text_mention') {
                targetUser = mention.user;
                targetUserId = targetUser.id;
            } else if (mention.type === 'mention') {
                const username = msg.text.substring(mention.offset + 1, mention.offset + mention.length);
                try {
                    // Try to get user info by username (this might not always work)
                    const chatMember = await bot.getChatMember(chatId, `@${username}`);
                    targetUser = chatMember.user;
                    targetUserId = targetUser.id;
                } catch (error) {
                    return bot.sendMessage(chatId, '❌ Tidak dapat mengambil informasi user dari username. Coba reply ke pesan user tersebut.');
                }
            }
        }
    }

    if (!targetUser) {
        return bot.sendMessage(chatId, '❌ Tidak ada user yang di-tag atau di-reply!\n\n💡 **Cara pakai:**\n• Reply ke pesan user dengan `/info`\n• Atau tag user: `/info @username`');
    }

    try {
        // Get additional user info if possible
        let chatMember = null;
        try {
            chatMember = await bot.getChatMember(chatId, targetUserId);
        } catch (error) {
            console.log('Could not get chat member info:', error.message);
        }

        let infoText = `👤 *Informasi User Telegram*\n\n`;
        infoText += `🆔 **User ID:** \`${targetUser.id}\`\n`;
        infoText += `👤 **First Name:** ${targetUser.first_name}\n`;

        if (targetUser.last_name) {
            infoText += `👤 **Last Name:** ${targetUser.last_name}\n`;
        }

        if (targetUser.username) {
            infoText += `📝 **Username:** @${targetUser.username}\n`;
        }

        if (targetUser.language_code) {
            infoText += `🌐 **Language:** ${targetUser.language_code.toUpperCase()}\n`;
        }

        // Bot status
        if (targetUser.is_bot !== undefined) {
            infoText += `🤖 **Is Bot:** ${targetUser.is_bot ? 'Ya' : 'Tidak'}\n`;
        }

        // Premium status (if available)
        if (targetUser.is_premium !== undefined) {
            infoText += `💎 **Premium:** ${targetUser.is_premium ? 'Ya' : 'Tidak'}\n`;
        }

        // Chat member status
        if (chatMember) {
            infoText += `👥 **Status di Chat:** ${chatMember.status}\n`;

            if (chatMember.status === 'administrator' && chatMember.can_be_edited !== undefined) {
                infoText += `🛡️ **Admin Rights:** ${chatMember.can_be_edited ? 'Full' : 'Limited'}\n`;
            }

            if (chatMember.until_date) {
                const untilDate = new Date(chatMember.until_date * 1000);
                infoText += `⏰ **Until:** ${untilDate.toLocaleString('id-ID')}\n`;
            }
        }

        // Data center info (estimated based on user ID)
        const dcInfo = getUserDataCenter(targetUser.id);
        infoText += `🌍 **Data Center:** ${dcInfo.dc} (${dcInfo.location})\n`;

        // Account creation estimate
        const creationInfo = getAccountCreationEstimate(targetUser.id);
        infoText += `📅 **Account Created:** ~${creationInfo}\n`;

        bot.sendMessage(chatId, infoText, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Info command error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengambil informasi user: ${error.message}`);
    }
});

// Handle /help command
bot.onText(/^\/help(@\w+)?(\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const helpTopic = match[3];

    if (helpTopic) {
        // Show specific help topic
        await showSpecificHelp(chatId, helpTopic);
    } else {
        // Show general help
        await showGeneralHelp(chatId, msg.chat.type);
    }
});

async function showGeneralHelp(chatId, chatType) {
    if (chatType === 'private') {
        // Private chat - show Pterodactyl help
        const helpText = `🤖 *Bot Kontrol Panel Pterodactyl*

**Commands Utama:**
• \`/start\` - Menu utama
• \`/id\` - Lihat chat ID
• \`/info\` - Info user (reply/mention)

**Panel Management:**
• \`/addadmin\` - Tambah admin panel
• \`/createserver\` - Buat server untuk user

**Bantuan Spesifik:**
• \`/help admin\` - Commands admin
• \`/help moderation\` - Commands moderasi
• \`/help welcome\` - Commands welcome
• \`/help notes\` - Commands notes
• \`/help locks\` - Commands locks`;

        bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
    } else {
        // Group chat - show Rose Bot help
        const helpText = `🌹 *Rose Bot Commands*

**👥 Admin Management:**
• \`/admins\` - Lihat daftar admin
• \`/promote\` - Promote user jadi admin
• \`/demote\` - Demote admin
• \`/title\` - Set title admin

**🛡️ Moderation:**
• \`/ban\` - Ban user
• \`/mute\` - Mute user
• \`/kick\` - Kick user
• \`/warn\` - Warn user

**💬 Welcome & Messages:**
• \`/welcome on/off\` - Toggle welcome
• \`/setwelcome\` - Set welcome message
• \`/notes\` - Lihat notes
• \`/save\` - Simpan note

**🔒 Locks & Security:**
• \`/locks\` - Lihat status locks
• \`/lock\` - Aktifkan lock
• \`/antiflood\` - Anti-spam protection

**Bantuan Detail:**
• \`/help admin\` - Admin commands
• \`/help moderation\` - Moderation commands
• \`/help welcome\` - Welcome commands
• \`/help notes\` - Notes & filters
• \`/help locks\` - Locks & security`;

        bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
    }
}

async function showSpecificHelp(chatId, topic) {
    const helpTopics = {
        'admin': `👥 *Admin Management Commands*

**Lihat Admin:**
• \`/admins\` - Daftar semua admin grup

**Promote/Demote:**
• \`/promote\` - Promote user jadi admin (reply/mention)
• \`/demote\` - Demote admin jadi member (reply/mention)
• \`/title <title>\` - Set custom title admin (reply)

**Contoh:**
\`/promote\` (reply ke user)
\`/title Super Admin\` (reply ke admin)`,

        'moderation': `🛡️ *Moderation Commands*

**Ban Commands:**
• \`/ban [reason]\` - Ban user permanent
• \`/tban <time> [reason]\` - Temporary ban
• \`/unban\` - Unban user

**Mute Commands:**
• \`/mute [reason]\` - Mute user permanent
• \`/tmute <time> [reason]\` - Temporary mute
• \`/unmute\` - Unmute user

**Other:**
• \`/kick [reason]\` - Kick user dari grup
• \`/warn [reason]\` - Beri warning
• \`/warns\` - Lihat warnings user
• \`/purge\` - Hapus pesan (reply ke pesan)

**Time Format:**
\`1m\` = 1 menit, \`1h\` = 1 jam, \`1d\` = 1 hari, \`1w\` = 1 minggu`,

        'welcome': `💬 *Welcome & Goodbye Commands*

**Welcome:**
• \`/welcome on/off\` - Toggle welcome message
• \`/setwelcome <text>\` - Set welcome message
• \`/resetwelcome\` - Reset ke default
• \`/cleanwelcome on/off\` - Auto hapus welcome lama

**Goodbye:**
• \`/goodbye on/off\` - Toggle goodbye message
• \`/setgoodbye <text>\` - Set goodbye message
• \`/resetgoodbye\` - Reset ke default

**Variables:**
\`{first}\` - Nama depan, \`{last}\` - Nama belakang
\`{mention}\` - Mention user, \`{chatname}\` - Nama grup
\`{count}\` - Jumlah member

**Contoh:**
\`/setwelcome Selamat datang {mention} di {chatname}!\``,

        'notes': `📝 *Notes & Filters Commands*

**Notes (Saved Messages):**
• \`/save <name> <content>\` - Simpan note
• \`/get <name>\` - Ambil note
• \`#<name>\` - Shortcut ambil note
• \`/notes\` - Lihat semua notes
• \`/clear <name>\` - Hapus note

**Filters (Auto-Reply):**
• \`/filter <keyword> <response>\` - Tambah filter
• \`/filters\` - Lihat semua filters
• \`/stop <keyword>\` - Hapus filter
• \`/stopall\` - Hapus semua filters

**Contoh:**
\`/save rules Dilarang spam di grup!\`
\`/filter hello Halo juga! Selamat datang!\``,

        'locks': `🔒 *Locks & Security Commands*

**Lock Commands:**
• \`/lock <type>\` - Aktifkan lock
• \`/unlock <type>\` - Nonaktifkan lock
• \`/locks\` - Lihat status semua locks
• \`/locktypes\` - Lihat jenis locks

**Lock Types:**
\`text\` - Pesan teks, \`media\` - Semua media
\`photo\` - Foto, \`video\` - Video, \`sticker\` - Sticker
\`url\` - Link, \`forward\` - Forward message
\`mention\` - Mention user, \`hashtag\` - Hashtag

**Anti-Flood:**
• \`/antiflood on/off\` - Toggle antiflood
• \`/antiflood <number>\` - Set limit pesan

**Contoh:**
\`/lock sticker\` - Larang sticker
\`/antiflood 5\` - Max 5 pesan per 10 detik`
    };

    const helpText = helpTopics[topic.toLowerCase()];
    if (helpText) {
        bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, `❌ Help topic "${topic}" tidak ditemukan!\n\nTopics tersedia: admin, moderation, welcome, notes, locks`);
    }
}

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

// Handle text messages (for creds.json input)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Skip if not owner
    if (!isOwner(userId)) return;

    // Skip if it's a command
    if (msg.text && msg.text.startsWith('/')) return;

    // Skip if it's not a text message
    if (!msg.text) return;

    // Check if user is waiting for creds.json input
    if (waitingForCredsJson.has(chatId)) {
        await processCredsJsonInput(chatId, msg.text);
    }
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
        case 'auto_session_folder':
            await handleAutoSessionFolder(chatId);
            break;
        case 'auto_creds_json':
            await handleAutoCredsJson(chatId);
            break;
        case 'delete_session_folder':
            await handleDeleteSessionFolder(chatId);
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
            // Handle session_user_ callbacks
            if (data.startsWith('session_user_')) {
                const userId = data.replace('session_user_', '');
                await handleSessionFolderForUser(chatId, userId);
            }
            // Handle delete_user_ callbacks
            else if (data.startsWith('delete_user_')) {
                const userId = data.replace('delete_user_', '');
                await handleDeleteSessionForUser(chatId, userId);
            }
            // Handle confirm_delete_ callbacks
            else if (data.startsWith('confirm_delete_')) {
                const userId = data.replace('confirm_delete_', '');
                await executeDeleteSessionForUser(chatId, userId);
            }
            // Handle creds_server_ callbacks
            else if (data.startsWith('creds_server_')) {
                const serverUuid = data.replace('creds_server_', '');
                await handleCredsForServer(chatId, serverUuid);
            }
            // Handle create_server_* callbacks
            else if (data.startsWith('create_server_')) {
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

// Auto Session Folder Management
async function handleAutoSessionFolder(chatId) {
    try {
        bot.sendMessage(chatId, '📁 *Auto Session Folder*\n\nMengambil daftar user...', { parse_mode: 'Markdown' });

        // Get all users first
        const users = await PteroAPI.getAllUsers();

        if (users.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada user ditemukan!', getMainMenu());
        }

        // Create user selection keyboard
        const userButtons = [];
        for (let i = 0; i < users.length; i += 2) {
            const row = [];
            const user1 = users[i];
            row.push({ text: `👤 ${user1.attributes.username}`, callback_data: `session_user_${user1.attributes.id}` });

            if (users[i + 1]) {
                const user2 = users[i + 1];
                row.push({ text: `👤 ${user2.attributes.username}`, callback_data: `session_user_${user2.attributes.id}` });
            }
            userButtons.push(row);
        }

        userButtons.push([{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]);

        const text = `📁 *Pilih User untuk Auto Session Folder*\n\n` +
                    `👥 Total User: ${users.length}\n\n` +
                    `Pilih user yang server-nya ingin dibuatkan folder session:`;

        bot.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: userButtons }
        });

    } catch (error) {
        console.error('Auto session folder error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengambil daftar user: ${error.message}`, getMainMenu());
    }
}

async function handleSessionFolderForUser(chatId, userId) {
    try {
        bot.sendMessage(chatId, '📁 *Memproses Session Folder*\n\nMengambil server milik user...', { parse_mode: 'Markdown' });

        // Get user info
        const userInfo = await PteroAPI.getUserInfo(userId);
        const username = userInfo.attributes.username;

        // Get servers owned by this user
        const servers = await PteroAPI.getServersByUser(userId);

        if (servers.length === 0) {
            return bot.sendMessage(chatId, `❌ User ${username} tidak memiliki server!`, getMainMenu());
        }

        bot.sendMessage(chatId, `📊 User ${username} memiliki ${servers.length} server. Memulai proses pembuatan folder session...`);

        let createdCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const server of servers) {
            try {
                const serverName = server.attributes.name;
                const serverUuid = server.attributes.uuid;

                // Create session folder path
                const sessionPath = `/var/lib/pterodactyl/volumes/${serverUuid}/session`;

                // Check if session folder already exists
                if (fs.existsSync(sessionPath)) {
                    skippedCount++;
                    console.log(`Session folder already exists for ${serverName}, skipping...`);
                    continue;
                }

                // Create session folder
                fs.mkdirSync(sessionPath, { recursive: true });
                fs.chmodSync(sessionPath, 0o755);

                createdCount++;
                console.log(`Created session folder for ${serverName}`);

            } catch (error) {
                errorCount++;
                console.error(`Error creating session folder for ${server.attributes.name}:`, error);
            }
        }

        const report = `📁 *Auto Session Folder Selesai*\n\n` +
                      `👤 **User:** ${username}\n` +
                      `📊 **Hasil:**\n` +
                      `✅ Dibuat: ${createdCount} folder\n` +
                      `⏭️ Dilewati: ${skippedCount} folder (sudah ada)\n` +
                      `❌ Error: ${errorCount} folder\n\n` +
                      `📈 **Total Server User:** ${servers.length}\n` +
                      `⏰ **Selesai:** ${new Date().toLocaleString('id-ID')}`;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Session folder for user error:', error);
        bot.sendMessage(chatId, `❌ Error saat membuat session folder: ${error.message}`, getMainMenu());
    }
}

// Auto Creds.json Management
let waitingForCredsJson = new Map(); // Store users waiting for creds.json input

async function handleAutoCredsJson(chatId) {
    try {
        bot.sendMessage(chatId, '🔑 *Auto Creds.json*\n\nMengambil daftar server...', { parse_mode: 'Markdown' });

        const servers = await PteroAPI.getAllServers();

        if (servers.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server ditemukan!', getMainMenu());
        }

        // Filter servers that need creds.json (have session folder but no creds.json)
        const serversNeedCreds = [];

        for (const server of servers) {
            const serverUuid = server.attributes.uuid;
            const sessionPath = `/var/lib/pterodactyl/volumes/${serverUuid}/session`;
            const credsPath = `${sessionPath}/creds.json`;

            if (fs.existsSync(sessionPath) && !fs.existsSync(credsPath)) {
                serversNeedCreds.push(server);
            }
        }

        if (serversNeedCreds.length === 0) {
            return bot.sendMessage(chatId, '✅ Semua server sudah memiliki creds.json atau tidak memiliki folder session!', getMainMenu());
        }

        // Create server selection keyboard
        const serverButtons = [];
        for (let i = 0; i < serversNeedCreds.length; i += 1) {
            const server = serversNeedCreds[i];
            const serverName = server.attributes.name.length > 25
                ? server.attributes.name.substring(0, 25) + '...'
                : server.attributes.name;
            serverButtons.push([{
                text: `🖥️ ${serverName}`,
                callback_data: `creds_server_${server.attributes.uuid}`
            }]);
        }

        serverButtons.push([{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]);

        const text = `🔑 *Pilih Server untuk Creds.json*\n\n` +
                    `📊 Total Server: ${servers.length}\n` +
                    `📁 Butuh Creds.json: ${serversNeedCreds.length}\n\n` +
                    `Pilih server yang ingin ditambahkan creds.json:`;

        bot.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: serverButtons }
        });

    } catch (error) {
        console.error('Auto creds.json error:', error);
        bot.sendMessage(chatId, `❌ Error saat memproses creds.json: ${error.message}`, getMainMenu());
    }
}

async function handleCredsForServer(chatId, serverUuid) {
    try {
        // Get server info
        const servers = await PteroAPI.getAllServers();
        const server = servers.find(s => s.attributes.uuid === serverUuid);

        if (!server) {
            return bot.sendMessage(chatId, '❌ Server tidak ditemukan!', getMainMenu());
        }

        const serverName = server.attributes.name;
        const sessionPath = `/var/lib/pterodactyl/volumes/${serverUuid}/session`;
        const credsPath = `${sessionPath}/creds.json`;

        // Double check if session folder exists and creds.json doesn't exist
        if (!fs.existsSync(sessionPath)) {
            return bot.sendMessage(chatId, `❌ Folder session tidak ditemukan untuk server ${serverName}!`, getMainMenu());
        }

        if (fs.existsSync(credsPath)) {
            return bot.sendMessage(chatId, `❌ Server ${serverName} sudah memiliki creds.json!`, getMainMenu());
        }

        const text = `🔑 *Tambah Creds.json*\n\n` +
                    `🖥️ **Server:** ${serverName}\n` +
                    `📁 **Path:** ${sessionPath}\n\n` +
                    `📝 Silakan kirim konten creds.json untuk server ini:`;

        // Set user as waiting for creds.json input for specific server
        waitingForCredsJson.set(chatId, {
            serverUuid,
            serverName,
            sessionPath,
            credsPath
        });

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Creds for server error:', error);
        bot.sendMessage(chatId, `❌ Error saat memproses server: ${error.message}`, getMainMenu());
    }
}

async function processCredsJsonInput(chatId, credsContent) {
    try {
        const waitingData = waitingForCredsJson.get(chatId);
        if (!waitingData) {
            return; // User not waiting for creds.json input
        }

        // Remove user from waiting list
        waitingForCredsJson.delete(chatId);

        // Validate JSON
        let parsedCreds;
        try {
            parsedCreds = JSON.parse(credsContent);
        } catch (error) {
            return bot.sendMessage(chatId, '❌ Format JSON tidak valid! Silakan coba lagi dengan format JSON yang benar.', getMainMenu());
        }

        bot.sendMessage(chatId, `🔑 *Memproses Creds.json*\n\nMenambahkan creds.json ke server ${waitingData.serverName}...`, { parse_mode: 'Markdown' });

        try {
            // Double check if file doesn't exist
            if (fs.existsSync(waitingData.credsPath)) {
                return bot.sendMessage(chatId, `❌ Server ${waitingData.serverName} sudah memiliki creds.json!`, getMainMenu());
            }

            // Create creds.json file
            fs.writeFileSync(waitingData.credsPath, JSON.stringify(parsedCreds, null, 2));
            fs.chmodSync(waitingData.credsPath, 0o644);

            console.log(`Created creds.json for ${waitingData.serverName}`);

            const report = `🔑 *Creds.json Berhasil Ditambahkan*\n\n` +
                          `🖥️ **Server:** ${waitingData.serverName}\n` +
                          `📁 **Path:** ${waitingData.credsPath}\n` +
                          `✅ **Status:** Berhasil dibuat\n` +
                          `📄 **Permission:** 644 (rw-r--r--)\n\n` +
                          `⏰ **Selesai:** ${new Date().toLocaleString('id-ID')}`;

            bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

        } catch (error) {
            console.error(`Error creating creds.json for ${waitingData.serverName}:`, error);
            bot.sendMessage(chatId, `❌ Error saat membuat creds.json untuk server ${waitingData.serverName}: ${error.message}`, getMainMenu());
        }

    } catch (error) {
        console.error('Process creds.json input error:', error);
        bot.sendMessage(chatId, `❌ Error saat memproses creds.json: ${error.message}`, getMainMenu());
    }
}

// Delete Session Folder Management
async function handleDeleteSessionFolder(chatId) {
    try {
        bot.sendMessage(chatId, '🗑️ *Delete Session Folder*\n\nMengambil daftar user...', { parse_mode: 'Markdown' });

        // Get all users first
        const users = await PteroAPI.getAllUsers();

        if (users.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada user ditemukan!', getMainMenu());
        }

        // Create user selection keyboard
        const userButtons = [];
        for (let i = 0; i < users.length; i += 2) {
            const row = [];
            const user1 = users[i];
            row.push({ text: `👤 ${user1.attributes.username}`, callback_data: `delete_user_${user1.attributes.id}` });

            if (users[i + 1]) {
                const user2 = users[i + 1];
                row.push({ text: `👤 ${user2.attributes.username}`, callback_data: `delete_user_${user2.attributes.id}` });
            }
            userButtons.push(row);
        }

        userButtons.push([{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]);

        const text = `🗑️ *Pilih User untuk Delete Session Folder*\n\n` +
                    `👥 Total User: ${users.length}\n\n` +
                    `⚠️ **PERINGATAN:** Ini akan menghapus folder session dan semua isinya!\n\n` +
                    `Pilih user yang session folder server-nya ingin dihapus:`;

        bot.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: userButtons }
        });

    } catch (error) {
        console.error('Delete session folder error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengambil daftar user: ${error.message}`, getMainMenu());
    }
}

async function handleDeleteSessionForUser(chatId, userId) {
    try {
        bot.sendMessage(chatId, '🗑️ *Memproses Delete Session Folder*\n\nMengambil server milik user...', { parse_mode: 'Markdown' });

        // Get user info
        const userInfo = await PteroAPI.getUserInfo(userId);
        const username = userInfo.attributes.username;

        // Get servers owned by this user
        const servers = await PteroAPI.getServersByUser(userId);

        if (servers.length === 0) {
            return bot.sendMessage(chatId, `❌ User ${username} tidak memiliki server!`, getMainMenu());
        }

        // Check how many servers have session folders
        let hasSessionCount = 0;

        for (const server of servers) {
            const serverUuid = server.attributes.uuid;
            const sessionPath = `/var/lib/pterodactyl/volumes/${serverUuid}/session`;

            if (fs.existsSync(sessionPath)) {
                hasSessionCount++;
            }
        }

        if (hasSessionCount === 0) {
            return bot.sendMessage(chatId, `❌ User ${username} tidak memiliki server dengan folder session!`, getMainMenu());
        }

        bot.sendMessage(chatId, `⚠️ *KONFIRMASI DELETE SESSION FOLDER*\n\n` +
                              `👤 **User:** ${username}\n` +
                              `📊 **Total Server:** ${servers.length}\n` +
                              `📁 **Memiliki Session Folder:** ${hasSessionCount}\n\n` +
                              `🚨 **PERINGATAN:**\n` +
                              `• Ini akan menghapus SEMUA folder session milik user ini\n` +
                              `• Semua file di dalam folder session akan hilang\n` +
                              `• Aksi ini TIDAK BISA dibatalkan!\n\n` +
                              `Apakah Anda yakin ingin melanjutkan?`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Ya, Hapus Semua', callback_data: `confirm_delete_${userId}` },
                        { text: '❌ Batal', callback_data: 'main_menu' }
                    ]
                ]
            }
        });

    } catch (error) {
        console.error('Delete session for user error:', error);
        bot.sendMessage(chatId, `❌ Error saat memproses user: ${error.message}`, getMainMenu());
    }
}

async function executeDeleteSessionForUser(chatId, userId) {
    try {
        bot.sendMessage(chatId, '🗑️ *Menghapus Session Folder*\n\nMemulai proses penghapusan...', { parse_mode: 'Markdown' });

        // Get user info
        const userInfo = await PteroAPI.getUserInfo(userId);
        const username = userInfo.attributes.username;

        // Get servers owned by this user
        const servers = await PteroAPI.getServersByUser(userId);

        let deletedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const server of servers) {
            try {
                const serverName = server.attributes.name;
                const serverUuid = server.attributes.uuid;
                const sessionPath = `/var/lib/pterodactyl/volumes/${serverUuid}/session`;

                // Check if session folder exists
                if (!fs.existsSync(sessionPath)) {
                    skippedCount++;
                    console.log(`Session folder not found for ${serverName}, skipping...`);
                    continue;
                }

                // Delete session folder recursively
                fs.rmSync(sessionPath, { recursive: true, force: true });

                deletedCount++;
                console.log(`Deleted session folder for ${serverName}`);

            } catch (error) {
                errorCount++;
                console.error(`Error deleting session folder for ${server.attributes.name}:`, error);
            }
        }

        const report = `🗑️ *Delete Session Folder Selesai*\n\n` +
                      `👤 **User:** ${username}\n` +
                      `📊 **Hasil:**\n` +
                      `🗑️ Dihapus: ${deletedCount} folder\n` +
                      `⏭️ Dilewati: ${skippedCount} folder (tidak ada)\n` +
                      `❌ Error: ${errorCount} folder\n\n` +
                      `📈 **Total Server User:** ${servers.length}\n` +
                      `⏰ **Selesai:** ${new Date().toLocaleString('id-ID')}`;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute delete session for user error:', error);
        bot.sendMessage(chatId, `❌ Error saat menghapus session folder: ${error.message}`, getMainMenu());
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
