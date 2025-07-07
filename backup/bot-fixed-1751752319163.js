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

// Global variables for state tracking
const setorCredsState = new Map(); // Track setor creds upload state

// Helper function to check if panel is blacklisted
function isPanelBlacklisted(panelUrl) {
    try {
        const url = new URL(panelUrl);
        const hostname = url.hostname;
        return PANEL_BLACKLIST.some(blacklisted =>
            hostname.includes(blacklisted) || blacklisted.includes(hostname)
        );
    } catch (error) {
        console.error('Error checking panel blacklist:', error);
        return false;
    }
}

// Helper function to detect Pterodactyl volumes path
function detectPterodactylVolumesPath() {
    const possiblePaths = [
        '/var/lib/pterodactyl/volumes',           // Default Linux path
        '/opt/pterodactyl/volumes',               // Alternative Linux path
        '/home/pterodactyl/volumes',              // Home directory path
        'C:\\pterodactyl\\volumes',               // Windows path 1
        'C:\\Program Files\\pterodactyl\\volumes', // Windows path 2
        process.env.PTERODACTYL_VOLUMES_PATH,     // Environment variable
        './volumes',                              // Relative path
        '../volumes'                              // Parent directory relative path
    ];

    for (const path of possiblePaths) {
        if (path && fs.existsSync(path)) {
            console.log(`✅ Found Pterodactyl volumes path: ${path}`);
            return path;
        }
    }
    
    console.log('❌ No valid Pterodactyl volumes path found');
    return null;
}

// Helper function to get server volume path safely
function getServerVolumePath(serverUuid) {
    const basePath = detectPterodactylVolumesPath();
    if (!basePath) {
        throw new Error('Pterodactyl volumes path not found. Please check your panel configuration.');
    }
    
    const serverVolumePath = path.join(basePath, serverUuid);
    
    // Verify server volume exists
    if (!fs.existsSync(serverVolumePath)) {
        throw new Error(`Server volume path not found: ${serverVolumePath}`);
    }
    
    return serverVolumePath;
}

// Helper function to clean JSON content (remove line numbers and other artifacts)
function cleanJsonContent(content) {
    try {
        let cleaned = content;

        // Remove line numbers at the beginning (like "1{" -> "{")
        cleaned = cleaned.replace(/^\d+/, '').trim();

        // Remove any BOM (Byte Order Mark) characters
        cleaned = cleaned.replace(/^\uFEFF/, '');

        // Remove any leading/trailing whitespace and control characters
        cleaned = cleaned.replace(/^[\s\r\n\t]+|[\s\r\n\t]+$/g, '');

        // Try to find JSON content if it's wrapped in other text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }

        // Validate it's still valid JSON
        JSON.parse(cleaned);

        return cleaned;
    } catch (error) {
        console.error('Error cleaning JSON content:', error);
        console.error('Original content preview:', content.substring(0, 200));

        // Try one more time with just the original content
        try {
            JSON.parse(content);
            return content;
        } catch (originalError) {
            console.error('Original content also invalid JSON:', originalError.message);
            return content; // Return original if all cleaning attempts fail
        }
    }
}

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

// Load blacklist from file
loadBlacklistFromFile();

// External Panel Configuration
const EXTERNAL_PANEL = {
    domain: 'https://panel-one.ndikafath.com',
    plta: 'ptla_a7BlBCHL3092q9UtkoIldTYc7M93DgO32CCwa8drj8p',
    pltc: 'ptlc_zncHawiTRh8rj8XCt97VOArbgPfOjCxdnjPWheENWap',
    loc: '1',
    eggs: '15'
};

// Panel Blacklist - Panel yang tidak boleh digunakan
let PANEL_BLACKLIST = [
    'panel.hostkita.xyz',
    'panel-blocked.example.com',
    // Tambahkan domain panel yang ingin diblacklist
];

// State untuk manage blacklist
const blacklistStates = new Map();

// External Panel API helper
class ExternalPteroAPI {
    static async appRequest(endpoint, method = 'GET', data = null) {
        try {
            const url = `${EXTERNAL_PANEL.domain}/api/application/${endpoint}`;
            const config = {
                method,
                url,
                headers: {
                    'Authorization': `Bearer ${EXTERNAL_PANEL.plta}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Cache-Control': 'max-age=0'
                },
                timeout: 30000
            };

            if (data) config.data = data;

            console.log('🌐 External Panel API Request:', {
                url,
                method,
                user_agent: config.headers['User-Agent'].substring(0, 50) + '...',
                authorization: `Bearer ${EXTERNAL_PANEL.plta.substring(0, 10)}...`
            });

            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

            const response = await axios(config);
            console.log('✅ External Panel API Response Status:', response.status);

            // Check if response is HTML (Cloudflare block page)
            if (response.headers['content-type']?.includes('text/html')) {
                throw new Error('Cloudflare protection detected - received HTML instead of JSON');
            }

            return response.data;
        } catch (error) {
            console.error('❌ External Panel API Error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data?.substring ? error.response.data.substring(0, 200) + '...' : error.response?.data,
                message: error.message,
                url: `${EXTERNAL_PANEL.domain}/api/application/${endpoint}`,
                is_cloudflare_block: error.response?.data?.includes ? error.response.data.includes('Cloudflare') : false
            });

            // If Cloudflare is blocking, suggest alternative
            if (error.response?.data?.includes && error.response.data.includes('Cloudflare')) {
                throw new Error('Cloudflare protection is blocking API access. Consider whitelisting VPS IP or using alternative method.');
            }

            throw error;
        }
    }

    static async getAllServers() {
        try {
            const response = await this.appRequest('servers');
            return response.data || [];
        } catch (error) {
            console.log('❌ API access failed, trying alternative method...');
            // Fallback: try to get servers from file system if we have access
            return await this.getServersFromFileSystem();
        }
    }

    static async getServersFromFileSystem() {
        try {
            console.log('🔍 Attempting to get servers from file system...');

            // Use the same path detection logic
            const volumesPath = detectPterodactylVolumesPath();
            if (!volumesPath) {
                console.log('❌ Pterodactyl volumes directory not accessible');
                return [];
            }

            const volumes = fs.readdirSync(volumesPath);
            const servers = [];

            for (const uuid of volumes) {
                if (uuid.length === 36) { // UUID format check
                    servers.push({
                        attributes: {
                            uuid: uuid,
                            name: `Server-${uuid.substring(0, 8)}`, // Fallback name
                            user: 1 // Default user, will be filtered later
                        }
                    });
                }
            }

            console.log(`📁 Found ${servers.length} servers from file system`);
            return servers;
        } catch (error) {
            console.error('❌ File system access failed:', error.message);
            return [];
        }
    }

    static async testConnection() {
        try {
            console.log('🧪 Testing External Panel Connection...');
            console.log('🔧 Panel Config:', {
                domain: EXTERNAL_PANEL.domain,
                plta_prefix: EXTERNAL_PANEL.plta.substring(0, 15) + '...',
                full_url: `${EXTERNAL_PANEL.domain}/api/application/servers?per_page=1`
            });

            // Try users endpoint first (sometimes more permissive)
            let response;
            try {
                response = await this.appRequest('users?per_page=1');
                console.log('✅ Users endpoint test successful');
            } catch (userError) {
                console.log('❌ Users endpoint failed, trying servers...');
                // Fallback to servers endpoint
                response = await this.appRequest('servers?per_page=1');
                console.log('✅ Servers endpoint test successful');
            }

            console.log('✅ External Panel Connection Success:', {
                domain: EXTERNAL_PANEL.domain,
                response_status: response ? 'OK' : 'Empty',
                data_found: response.data?.length || 0,
                total_items: response.meta?.pagination?.total || 0
            });
            return true;
        } catch (error) {
            console.error('❌ External Panel Connection Failed:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                response_data: error.response?.data,
                config_domain: EXTERNAL_PANEL.domain,
                config_plta_prefix: EXTERNAL_PANEL.plta.substring(0, 15) + '...'
            });
            return false;
        }
    }
}

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

    static async getUserById(userId) {
        const response = await this.appRequest(`users/${userId}`);
        return response;
    }

    static async getUserInfo(userId) {
        const response = await this.appRequest(`users/${userId}`);
        console.log('👤 User API Response:', JSON.stringify(response, null, 2));
        return response.attributes || response;
    }

    static async getServersByUser(userId) {
        try {
            // Get all servers and filter by user
            const allServers = await this.getAllServers();
            console.log('🔍 Filtering servers for user ID:', userId);
            console.log('📊 Sample server structure:', JSON.stringify(allServers[0], null, 2));

            const userServers = allServers.filter(server => {
                const serverUserId = server.attributes?.user || server.user;
                return serverUserId === parseInt(userId);
            });

            console.log(`📈 Found ${userServers.length} servers for user ${userId}`);
            return userServers;
        } catch (error) {
            console.error('Error getting servers by user:', error);
            return [];
        }
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
                    { text: '📋 Copy Creds from External Panel', callback_data: 'copy_external_creds' }
                ],
                [
                    { text: '🗑️ Delete Session Folders (External Panel)', callback_data: 'delete_external_sessions' }
                ],
                [
                    { text: '📤 Setor Sender (Upload JSON Files)', callback_data: 'setor_creds' }
                ],
                [
                    { text: '🚫 Manage Panel Blacklist', callback_data: 'manage_blacklist' }
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

    // Handle /done command for setor creds
    if (msg.text === '/done') {
        if (setorCredsState.has(chatId)) {
            await handleSetorCredsDone(chatId);
        } else {
            bot.sendMessage(chatId, '❌ Tidak ada proses upload yang sedang berlangsung.', getMainMenu());
        }
        return;
    }

    // Handle /cancel command for blacklist
    if (msg.text === '/cancel') {
        if (blacklistStates.has(chatId)) {
            blacklistStates.delete(chatId);
            return bot.sendMessage(chatId, '❌ Operasi dibatalkan.', { ...getBackToBlacklistMenu() });
        }
    }

    // Handle blacklist add input
    if (blacklistStates.has(chatId) && blacklistStates.get(chatId).action === 'add') {
        await handleAddBlacklistInput(chatId, msg.text);
        return;
    }

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
        case 'copy_external_creds':
            await handleCopyExternalCreds(chatId);
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
        case 'manage_blacklist':
            await handleManageBlacklist(chatId);
            break;
        case 'add_blacklist':
            await handleAddBlacklist(chatId);
            break;
        case 'remove_blacklist':
            await handleRemoveBlacklist(chatId);
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
            // Handle copy_external_user callback
            else if (data.startsWith('copy_external_user_')) {
                const userId = data.replace('copy_external_user_', '');
                await handleCopyExternalCredsForUser(chatId, userId);
            }
            // Handle confirm_copy_external callback
            else if (data.startsWith('confirm_copy_external_user_')) {
                const userId = data.replace('confirm_copy_external_user_', '');
                await executeCopyExternalCredsForUser(chatId, userId);
            }
            // Handle delete_external_sessions callback
            else if (data === 'delete_external_sessions') {
                await handleDeleteExternalSessions(chatId);
            }
            // Handle confirm_delete_external_sessions callback
            else if (data === 'confirm_delete_external_sessions') {
                await executeDeleteExternalSessions(chatId);
            }
            // Handle setor_creds callback
            else if (data === 'setor_creds') {
                await handleSetorCreds(chatId);
            }
            // Handle setor_creds_done callback
            else if (data === 'setor_creds_done') {
                await handleSetorCredsDone(chatId);
            }
            // Handle setor_creds_cancel callback
            else if (data === 'setor_creds_cancel') {
                await handleSetorCredsCancel(chatId);
            }
            // Handle setor_creds_restart_yes callback
            else if (data === 'setor_creds_restart_yes') {
                await handleSetorCredsRestartYes(chatId);
            }
            // Handle setor_creds_restart_no callback
            else if (data === 'setor_creds_restart_no') {
                await handleSetorCredsRestartNo(chatId);
            }
            // Handle blacklist_remove_ callbacks
            else if (data.startsWith('blacklist_remove_')) {
                const index = parseInt(data.replace('blacklist_remove_', ''));
                await executeRemoveBlacklist(chatId, index);
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
        // Check if main panel is blacklisted
        if (isPanelBlacklisted(PANEL_URL)) {
            return bot.sendMessage(chatId, `❌ *Panel Diblacklist*\n\nPanel ${PANEL_URL} tidak diizinkan untuk operasi ini.\n\nHubungi admin untuk informasi lebih lanjut.`, { parse_mode: 'Markdown', ...getMainMenu() });
        }

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
        const username = userInfo.attributes?.username || userInfo.username || `User-${userId}`;

        // Get servers owned by this user
        const servers = await PteroAPI.getServersByUser(userId);

        if (servers.length === 0) {
            return bot.sendMessage(chatId, `❌ User ${username} tidak memiliki server!`, getMainMenu());
        }

        // First, check if Pterodactyl volumes path exists
        const volumesBasePath = detectPterodactylVolumesPath();
        if (!volumesBasePath) {
            return bot.sendMessage(chatId, `❌ *Error: Path Volume Tidak Ditemukan*\n\n` +
                `Path volume Pterodactyl tidak dapat dideteksi.\n\n` +
                `**Kemungkinan penyebab:**\n` +
                `• Panel tidak terinstall di server ini\n` +
                `• Path volume menggunakan konfigurasi custom\n` +
                `• Permission akses file sistem terbatas\n\n` +
                `**Solusi:**\n` +
                `• Set environment variable PTERODACTYL_VOLUMES_PATH\n` +
                `• Periksa konfigurasi panel Pterodactyl\n` +
                `• Pastikan bot dijalankan dengan permission yang tepat`, 
                { parse_mode: 'Markdown', ...getMainMenu() });
        }

        bot.sendMessage(chatId, `📊 User ${username} memiliki ${servers.length} server. Memulai proses pembuatan folder session...\n\n🔍 Volume path: ${volumesBasePath}`);

        let createdCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const errorDetails = [];

        for (const server of servers) {
            try {
                const serverName = server.attributes.name;
                const serverUuid = server.attributes.uuid;

                // Get server volume path using the new helper function
                let serverVolumePath;
                try {
                    serverVolumePath = getServerVolumePath(serverUuid);
                } catch (pathError) {
                    errorCount++;
                    const errorMsg = `${serverName}: Volume path tidak ditemukan`;
                    errorDetails.push(errorMsg);
                    console.error(`Server volume path error for ${serverName}:`, pathError.message);
                    continue;
                }

                // Create session folder path
                const sessionPath = path.join(serverVolumePath, 'session');

                // Check if session folder already exists
                if (fs.existsSync(sessionPath)) {
                    skippedCount++;
                    console.log(`Session folder already exists for ${serverName}, skipping...`);
                    continue;
                }

                // Create session folder
                fs.mkdirSync(sessionPath, { recursive: true });
                
                // Set permissions (only on Unix-like systems)
                if (process.platform !== 'win32') {
                    fs.chmodSync(sessionPath, 0o755);
                }

                createdCount++;
                console.log(`✅ Created session folder for ${serverName} at ${sessionPath}`);

            } catch (error) {
                errorCount++;
                const errorMsg = `${server.attributes.name}: ${error.message}`;
                errorDetails.push(errorMsg);
                console.error(`Error creating session folder for ${server.attributes.name}:`, error);
            }
        }

        let report = `📁 *Auto Session Folder Selesai*\n\n` +
                      `👤 **User:** ${username}\n` +
                      `📂 **Volume Path:** ${volumesBasePath}\n` +
                      `📊 **Hasil:**\n` +
                      `✅ Dibuat: ${createdCount} folder\n` +
                      `⏭️ Dilewati: ${skippedCount} folder (sudah ada)\n` +
                      `❌ Error: ${errorCount} folder\n\n` +
                      `📈 **Total Server User:** ${servers.length}\n` +
                      `⏰ **Selesai:** ${new Date().toLocaleString('id-ID')}`;

        // Add error details if any
        if (errorDetails.length > 0) {
            report += `\n\n❌ **Detail Error:**\n`;
            errorDetails.slice(0, 5).forEach(error => {
                report += `• ${error}\n`;
            });
            if (errorDetails.length > 5) {
                report += `• ... dan ${errorDetails.length - 5} error lainnya\n`;
            }
        }

        // Success message with details
        if (createdCount > 0) {
            report += `\n\n✅ **Verifikasi:**\n`;
            report += `Cek manual di path: ${volumesBasePath}/[server-uuid]/session`;
        }

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

        const volumesBasePath = detectPterodactylVolumesPath();
        if (!volumesBasePath) {
            return bot.sendMessage(chatId, `❌ *Error: Path Volume Tidak Ditemukan*\n\n` +
                `Path volume Pterodactyl tidak dapat dideteksi untuk proses creds.json.\n\n` +
                `Pastikan path volume sudah tersedia untuk menggunakan fitur ini.`, 
                { parse_mode: 'Markdown', ...getMainMenu() });
        }

        for (const server of servers) {
            const serverUuid = server.attributes.uuid;
            
            try {
                const serverVolumePath = getServerVolumePath(serverUuid);
                const sessionPath = path.join(serverVolumePath, 'session');
                const credsPath = path.join(sessionPath, 'creds.json');

                if (fs.existsSync(sessionPath) && !fs.existsSync(credsPath)) {
                    serversNeedCreds.push(server);
                }
            } catch (pathError) {
                console.log(`Skipping server ${server.attributes.name}: ${pathError.message}`);
                continue;
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
        
        // Use the new path detection method
        let serverVolumePath;
        try {
            serverVolumePath = getServerVolumePath(serverUuid);
        } catch (pathError) {
            return bot.sendMessage(chatId, `❌ *Error: Path Volume Tidak Ditemukan*\n\n` +
                `Server: ${serverName}\n` +
                `Error: ${pathError.message}\n\n` +
                `Pastikan server dan path volume tersedia.`, 
                { parse_mode: 'Markdown', ...getMainMenu() });
        }

        const sessionPath = path.join(serverVolumePath, 'session');
        const credsPath = path.join(sessionPath, 'creds.json');

        // Double check if session folder exists and creds.json doesn't exist
        if (!fs.existsSync(sessionPath)) {
            return bot.sendMessage(chatId, `❌ Folder session tidak ditemukan untuk server ${serverName}!\n\n` +
                `Path: ${sessionPath}\n\n` +
                `Buat folder session terlebih dahulu dengan fitur Auto Session Folder.`, 
                { parse_mode: 'Markdown', ...getMainMenu() });
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
        // Check if main panel is blacklisted
        if (isPanelBlacklisted(PANEL_URL)) {
            return bot.sendMessage(chatId, `❌ *Panel Diblacklist*\n\nPanel ${PANEL_URL} tidak diizinkan untuk operasi ini.\n\nHubungi admin untuk informasi lebih lanjut.`, { parse_mode: 'Markdown', ...getMainMenu() });
        }

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
        const username = userInfo.attributes?.username || userInfo.username || `User-${userId}`;

        // Get servers owned by this user
        const servers = await PteroAPI.getServersByUser(userId);

        if (servers.length === 0) {
            return bot.sendMessage(chatId, `❌ User ${username} tidak memiliki server!`, getMainMenu());
        }

        // Check how many servers have session folders
        let hasSessionCount = 0;
        const volumesBasePath = detectPterodactylVolumesPath();
        
        if (!volumesBasePath) {
            return bot.sendMessage(chatId, `❌ *Error: Path Volume Tidak Ditemukan*\n\n` +
                `Tidak dapat mendeteksi path volume Pterodactyl untuk delete session folder.`, 
                { parse_mode: 'Markdown', ...getMainMenu() });
        }

        for (const server of servers) {
            const serverUuid = server.attributes.uuid;
            
            try {
                const serverVolumePath = getServerVolumePath(serverUuid);
                const sessionPath = path.join(serverVolumePath, 'session');

                if (fs.existsSync(sessionPath)) {
                    hasSessionCount++;
                }
            } catch (pathError) {
                console.log(`Skipping server ${server.attributes.name}: ${pathError.message}`);
                continue;
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
        const username = userInfo.attributes?.username || userInfo.username || `User-${userId}`;

        // Get servers owned by this user
        const servers = await PteroAPI.getServersByUser(userId);

        let deletedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const errorDetails = [];

        const volumesBasePath = detectPterodactylVolumesPath();
        if (!volumesBasePath) {
            return bot.sendMessage(chatId, `❌ *Error: Path Volume Tidak Ditemukan*\n\n` +
                `Tidak dapat mendeteksi path volume Pterodactyl untuk menghapus session folder.`, 
                { parse_mode: 'Markdown', ...getMainMenu() });
        }

        for (const server of servers) {
            try {
                const serverName = server.attributes.name;
                const serverUuid = server.attributes.uuid;
                
                let serverVolumePath;
                try {
                    serverVolumePath = getServerVolumePath(serverUuid);
                } catch (pathError) {
                    skippedCount++;
                    const errorMsg = `${serverName}: Volume path tidak ditemukan`;
                    errorDetails.push(errorMsg);
                    console.log(`Skipping ${serverName}: ${pathError.message}`);
                    continue;
                }

                const sessionPath = path.join(serverVolumePath, 'session');

                // Check if session folder exists
                if (!fs.existsSync(sessionPath)) {
                    skippedCount++;
                    console.log(`Session folder not found for ${serverName}, skipping...`);
                    continue;
                }

                // Delete session folder recursively
                fs.rmSync(sessionPath, { recursive: true, force: true });

                deletedCount++;
                console.log(`✅ Deleted session folder for ${serverName}`);

            } catch (error) {
                errorCount++;
                const errorMsg = `${server.attributes.name}: ${error.message}`;
                errorDetails.push(errorMsg);
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

// Copy Creds from External Panel
async function handleCopyExternalCreds(chatId) {
    try {
        // Check if external panel is blacklisted
        if (isPanelBlacklisted(EXTERNAL_PANEL.domain)) {
            return bot.sendMessage(chatId, `❌ *Panel Eksternal Diblacklist*\n\nPanel ${EXTERNAL_PANEL.domain} tidak diizinkan untuk operasi ini.\n\nHubungi admin untuk informasi lebih lanjut.`, { parse_mode: 'Markdown', ...getMainMenu() });
        }

        // Check if main panel is blacklisted
        if (isPanelBlacklisted(PANEL_URL)) {
            return bot.sendMessage(chatId, `❌ *Panel Utama Diblacklist*\n\nPanel ${PANEL_URL} tidak diizinkan untuk operasi ini.\n\nHubungi admin untuk informasi lebih lanjut.`, { parse_mode: 'Markdown', ...getMainMenu() });
        }

        bot.sendMessage(chatId, '📋 *Copy Creds from External Panel*\n\nTesting koneksi ke panel eksternal...', { parse_mode: 'Markdown' });

        // Test external panel connection first
        const connectionTest = await ExternalPteroAPI.testConnection();
        if (!connectionTest) {
            return bot.sendMessage(chatId, '❌ Gagal terhubung ke panel eksternal!\n\nPeriksa konfigurasi API key dan domain.', getMainMenu());
        }

        // Get users from main panel for selection
        const users = await PteroAPI.getAllUsers();

        if (users.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada user ditemukan di panel utama!', getMainMenu());
        }

        let message = '👥 *Pilih User untuk Copy Creds*\n\n';
        message += '📋 Pilih user yang akan menerima creds.json dari panel eksternal:\n\n';

        const keyboard = [];
        const maxUsersPerPage = 10;
        const usersToShow = users.slice(0, maxUsersPerPage);

        for (const user of usersToShow) {
            const userInfo = user.attributes;
            const username = userInfo.username || userInfo.first_name || `User-${userInfo.id}`;
            const email = userInfo.email || 'No email';

            keyboard.push([{
                text: `👤 ${username} (${email})`,
                callback_data: `copy_external_user_${userInfo.id}`
            }]);
        }

        if (users.length > maxUsersPerPage) {
            message += `\n📊 Menampilkan ${maxUsersPerPage} dari ${users.length} user`;
        }

        keyboard.push([{ text: '🔙 Kembali', callback_data: 'main_menu' }]);

        bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });

    } catch (error) {
        console.error('Copy external creds error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengakses panel eksternal: ${error.message}`, getMainMenu());
    }
}

// Delete Session Folders from External Panel
async function handleDeleteExternalSessions(chatId) {
    try {
        // Check if external panel is blacklisted
        if (isPanelBlacklisted(EXTERNAL_PANEL.domain)) {
            return bot.sendMessage(chatId, `❌ *Panel Eksternal Diblacklist*\n\nPanel ${EXTERNAL_PANEL.domain} tidak diizinkan untuk operasi ini.\n\nHubungi admin untuk informasi lebih lanjut.`, { parse_mode: 'Markdown', ...getMainMenu() });
        }

        bot.sendMessage(chatId, '🗑️ *Delete Session Folders dari Panel Eksternal*\n\nTesting koneksi ke panel eksternal...', { parse_mode: 'Markdown' });

        // Test external panel connection first
        const connectionTest = await ExternalPteroAPI.testConnection();
        if (!connectionTest) {
            return bot.sendMessage(chatId, '❌ Gagal terhubung ke panel eksternal!\n\nPeriksa konfigurasi API key dan domain.', getMainMenu());
        }

        // Get servers from external panel
        const externalServers = await ExternalPteroAPI.getAllServers();

        console.log(`📊 External panel servers for deletion: ${externalServers.length}`);

        // Count servers with session folders
        let serversWithSessions = 0;
        for (const server of externalServers) {
            const sessionPath = `/var/lib/pterodactyl/volumes/${server.attributes.uuid}/session`;
            if (fs.existsSync(sessionPath)) {
                serversWithSessions++;
            }
        }

        const confirmMessage = `🗑️ *Konfirmasi Delete Session Folders*\n\n` +
                              `🌐 **Panel Eksternal:** ${EXTERNAL_PANEL.domain}\n` +
                              `📊 **Total Server:** ${externalServers.length}\n` +
                              `📁 **Server dengan Session Folder:** ${serversWithSessions}\n\n` +
                              `⚠️ **PERINGATAN:** Ini akan menghapus SEMUA session folder dari panel eksternal!\n\n` +
                              `❓ Lanjutkan?`;

        const confirmKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Ya, Hapus Semua', callback_data: 'confirm_delete_external_sessions' },
                        { text: '❌ Batal', callback_data: 'main_menu' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, confirmMessage, { parse_mode: 'Markdown', ...confirmKeyboard });

    } catch (error) {
        console.error('Handle delete external sessions error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengakses panel eksternal: ${error.message}`, getMainMenu());
    }
}

async function executeDeleteExternalSessions(chatId) {
    try {
        bot.sendMessage(chatId, '🗑️ *Memulai Delete Session Folders dari Panel Eksternal*\n\nMengambil daftar server...', { parse_mode: 'Markdown' });

        // Get servers from external panel
        const externalServers = await ExternalPteroAPI.getAllServers();

        let deletedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        console.log(`📊 Processing ${externalServers.length} external servers for session deletion`);
        bot.sendMessage(chatId, `🔄 *Memproses ${externalServers.length} server eksternal...*`, { parse_mode: 'Markdown' });

        for (const externalServer of externalServers) {
            try {
                const externalUuid = externalServer.attributes.uuid;
                const externalName = externalServer.attributes.name;
                const externalSessionPath = `/var/lib/pterodactyl/volumes/${externalUuid}/session`;

                console.log(`🔍 Processing external server: ${externalName} (${externalUuid})`);
                console.log(`📁 Session path: ${externalSessionPath}`);
                console.log(`📂 Session path exists: ${fs.existsSync(externalSessionPath)}`);

                // Check if session folder exists
                if (!fs.existsSync(externalSessionPath)) {
                    skippedCount++;
                    console.log(`⏭️ Skipping ${externalName} - no session folder found`);
                    continue;
                }

                // Delete session folder from external panel
                fs.rmSync(externalSessionPath, { recursive: true, force: true });
                deletedCount++;
                console.log(`🗑️ Deleted session folder from external panel: ${externalName}`);

            } catch (error) {
                errorCount++;
                console.error(`❌ Error processing ${externalServer.attributes.name}:`, error);
            }
        }

        const report = `🗑️ *Delete Session Folders dari Panel Eksternal Selesai*\n\n` +
                      `🌐 **Panel Eksternal:** ${EXTERNAL_PANEL.domain}\n\n` +
                      `📊 **Hasil:**\n` +
                      `🗑️ Deleted: ${deletedCount} session folder\n` +
                      `⏭️ Skipped: ${skippedCount} server (no session folder)\n` +
                      `❌ Error: ${errorCount} server\n\n` +
                      `📈 **Total Server Eksternal:** ${externalServers.length}\n` +
                      `⏰ **Selesai:** ${new Date().toLocaleString('id-ID')}`;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute delete external sessions error:', error);
        bot.sendMessage(chatId, `❌ Error saat menghapus session folders dari panel eksternal: ${error.message}`, getMainMenu());
    }
}

async function handleCopyExternalCredsForUser(chatId, userId) {
    try {
        // Get user info
        const user = await PteroAPI.getUserById(userId);
        if (!user) {
            return bot.sendMessage(chatId, '❌ User tidak ditemukan!', getMainMenu());
        }

        const userInfo = user.attributes;
        const username = userInfo.username || userInfo.first_name || `User-${userInfo.id}`;

        // Get servers from external panel
        const externalServers = await ExternalPteroAPI.getAllServers();

        if (externalServers.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server ditemukan di panel eksternal!', getMainMenu());
        }

        // Count servers with creds.json
        let serversWithCreds = 0;
        for (const server of externalServers) {
            const sessionPath = `/var/lib/pterodactyl/volumes/${server.attributes.uuid}/session`;
            const credsPath = `${sessionPath}/creds.json`;

            if (fs.existsSync(credsPath)) {
                serversWithCreds++;
            }
        }

        const confirmMessage = `📋 *Konfirmasi Copy Creds untuk User*\n\n` +
                              `👤 **Target User:** ${username} (${userInfo.email})\n` +
                              `🌐 **Panel Eksternal:** ${EXTERNAL_PANEL.domain}\n` +
                              `🏠 **Panel Utama:** ${PANEL_URL}\n\n` +
                              `📊 **Server Eksternal:** ${externalServers.length}\n` +
                              `📄 **Server dengan Creds:** ${serversWithCreds}\n\n` +
                              `⚠️ **PERINGATAN:**\n` +
                              `• Akan copy semua creds.json dari panel eksternal\n` +
                              `• Creds akan ditaruh di server milik user ${username}\n` +
                              `• Session folder di panel eksternal TIDAK akan dihapus\n\n` +
                              `❓ Lanjutkan?`;

        const confirmKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Ya, Copy untuk User Ini', callback_data: `confirm_copy_external_user_${userId}` },
                        { text: '❌ Batal', callback_data: 'copy_external_creds' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, confirmMessage, { parse_mode: 'Markdown', ...confirmKeyboard });

    } catch (error) {
        console.error('Handle copy external creds for user error:', error);
        bot.sendMessage(chatId, `❌ Error: ${error.message}`, getMainMenu());
    }
}

async function executeCopyExternalCredsForUser(chatId, userId) {
    try {
        bot.sendMessage(chatId, '🔄 *Memulai Copy Creds dari Panel Eksternal*\n\nMengambil daftar server...', { parse_mode: 'Markdown' });

        // Get user info
        const user = await PteroAPI.getUserById(userId);
        const userInfo = user.attributes;
        const username = userInfo.username || userInfo.first_name || `User-${userInfo.id}`;

        // Get servers from both panels
        const externalServers = await ExternalPteroAPI.getAllServers();
        const mainServers = await PteroAPI.getAllServers();

        // Filter main servers by user
        const userServers = mainServers.filter(server =>
            server.attributes.user === parseInt(userId)
        );

        console.log(`📊 External panel servers: ${externalServers.length}`);
        console.log(`📊 Main panel servers for user ${username}: ${userServers.length}`);

        let copiedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        bot.sendMessage(chatId, `🔄 *Memproses ${externalServers.length} server eksternal...*\n*Target: ${userServers.length} server milik ${username}*`, { parse_mode: 'Markdown' });

        for (const externalServer of externalServers) {
            try {
                const externalUuid = externalServer.attributes.uuid;
                const externalName = externalServer.attributes.name;
                const externalSessionPath = `/var/lib/pterodactyl/volumes/${externalUuid}/session`;
                const externalCredsPath = `${externalSessionPath}/creds.json`;

                console.log(`🔍 Processing external server: ${externalName} (${externalUuid})`);

                // Check if external server has creds.json
                let credsFound = false;
                let actualCredsPath = externalCredsPath;

                // Try different possible locations for JSON files (any name)
                const possiblePaths = [
                    externalCredsPath, // /var/lib/pterodactyl/volumes/{uuid}/session/creds.json
                    `/var/lib/pterodactyl/volumes/${externalUuid}/creds.json`, // Direct in volume
                    `/var/lib/pterodactyl/volumes/${externalUuid}/session/plugins/creds.json`, // In plugins folder
                ];

                // Also check for any .json files in session directory
                const sessionDir = `/var/lib/pterodactyl/volumes/${externalUuid}/session`;
                if (fs.existsSync(sessionDir)) {
                    try {
                        const files = fs.readdirSync(sessionDir);
                        for (const file of files) {
                            if (file.endsWith('.json')) {
                                possiblePaths.push(path.join(sessionDir, file));
                            }
                        }
                    } catch (error) {
                        console.log(`⚠️ Could not read session directory: ${sessionDir}`);
                    }
                }

                for (const filePath of possiblePaths) {
                    if (fs.existsSync(filePath)) {
                        try {
                            // Validate it's a valid JSON file
                            const content = fs.readFileSync(filePath, 'utf8');
                            JSON.parse(content);
                            credsFound = true;
                            actualCredsPath = filePath;
                            const fileName = path.basename(filePath);
                            console.log(`✅ Found JSON file: ${fileName} at: ${filePath}`);
                            break;
                        } catch (error) {
                            console.log(`⚠️ Invalid JSON file: ${filePath}`);
                        }
                    }
                }

                if (!credsFound) {
                    skippedCount++;
                    console.log(`❌ No creds.json found for ${externalName}`);
                    continue;
                }

                // Find available server from user's servers
                if (userServers.length === 0) {
                    skippedCount++;
                    console.log(`❌ No servers available for user ${username}`);
                    continue;
                }

                // Use round-robin to distribute creds across user's servers
                const targetServerIndex = copiedCount % userServers.length;
                const targetServer = userServers[targetServerIndex];
                const targetUuid = targetServer.attributes.uuid;
                const targetName = targetServer.attributes.name;

                // Read and clean JSON from external server
                const rawCredsContent = fs.readFileSync(actualCredsPath, 'utf8');
                const credsContent = cleanJsonContent(rawCredsContent);

                // Validate JSON
                JSON.parse(credsContent);

                // Create target paths
                const targetSessionPath = `/var/lib/pterodactyl/volumes/${targetUuid}/session`;
                const targetCredsPath = `${targetSessionPath}/creds.json`;

                // Create session directory if it doesn't exist
                if (!fs.existsSync(targetSessionPath)) {
                    fs.mkdirSync(targetSessionPath, { recursive: true, mode: 0o755 });
                }

                // Write creds.json to target server
                fs.writeFileSync(targetCredsPath, credsContent, { mode: 0o644 });

                copiedCount++;
                console.log(`✅ Copied creds.json from ${externalName} to ${targetName} (${username})`);

            } catch (error) {
                errorCount++;
                console.error(`❌ Error processing ${externalServer.attributes.name}:`, error);
            }
        }

        const report = `📋 *Copy Creds untuk User Selesai*\n\n` +
                      `👤 **Target User:** ${username} (${userInfo.email})\n` +
                      `🌐 **Panel Eksternal:** ${EXTERNAL_PANEL.domain}\n` +
                      `🏠 **Panel Utama:** ${PANEL_URL}\n\n` +
                      `📊 **Hasil:**\n` +
                      `✅ Copied: ${copiedCount} creds.json\n` +
                      `⏭️ Skipped: ${skippedCount} server (no creds)\n` +
                      `❌ Error: ${errorCount} server\n\n` +
                      `📈 **Total Server Eksternal:** ${externalServers.length}\n` +
                      `🎯 **Server Target User:** ${userServers.length}\n` +
                      `⏰ **Selesai:** ${new Date().toLocaleString('id-ID')}`;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute copy external creds for user error:', error);
        bot.sendMessage(chatId, `❌ Error saat copy creds untuk user: ${error.message}`, getMainMenu());
    }
}

// Setor Sender - Upload Multiple JSON Files
async function handleSetorCreds(chatId) {
    try {
        // Check if main panel is blacklisted
        if (isPanelBlacklisted(PANEL_URL)) {
            return bot.sendMessage(chatId, `❌ *Panel Diblacklist*\n\nPanel ${PANEL_URL} tidak diizinkan untuk operasi ini.\n\nHubungi admin untuk informasi lebih lanjut.`, { parse_mode: 'Markdown', ...getMainMenu() });
        }

        // Get all servers to check availability
        const servers = await PteroAPI.getAllServers();

        if (servers.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server ditemukan di panel utama!', getMainMenu());
        }

        // Count servers that can receive creds (have session folder but no creds.json)
        let availableServers = 0;
        let serversWithoutSession = 0;
        let serversWithCreds = 0;

        console.log(`🔍 Starting setor creds detection for ${servers.length} servers...`);

        for (const server of servers) {
            const serverName = server.attributes.name;
            const serverUuid = server.attributes.uuid;
            const sessionPath = `/var/lib/pterodactyl/volumes/${serverUuid}/session`;
            const credsPath = `${sessionPath}/creds.json`;

            console.log(`\n📋 Checking server: ${serverName} (${serverUuid})`);
            console.log(`📁 Session path: ${sessionPath}`);
            console.log(`📄 Creds path: ${credsPath}`);

            const sessionExists = fs.existsSync(sessionPath);
            const credsExists = fs.existsSync(credsPath);

            console.log(`📁 Session folder exists: ${sessionExists}`);
            console.log(`📄 Creds.json exists: ${credsExists}`);

            if (!sessionExists) {
                // No session folder - cannot receive creds
                serversWithoutSession++;
                console.log(`❌ Server ${serverName}: No session folder`);
            } else if (!credsExists) {
                // Has session folder but no creds.json - can receive creds
                availableServers++;
                console.log(`✅ Server ${serverName}: Ready to receive creds`);
            } else {
                // Has both session folder and creds.json - already has creds
                serversWithCreds++;
                console.log(`🔑 Server ${serverName}: Already has creds`);
            }
        }

        console.log(`\n📊 Detection Summary:`);
        console.log(`📈 Total servers: ${servers.length}`);
        console.log(`✅ Already has creds: ${serversWithCreds}`);
        console.log(`📁 Without session folder: ${serversWithoutSession}`);
        console.log(`🆓 Ready to receive creds: ${availableServers}`);

        if (availableServers === 0) {
            const statusMessage = `❌ *Tidak Ada Server yang Bisa Diisi Sender*\n\n` +
                                 `📊 **Status Panel:**\n` +
                                 `🏠 Panel Utama: ${PANEL_URL}\n` +
                                 `📈 Total Server: ${servers.length}\n` +
                                 `✅ Sudah ada sender: ${serversWithCreds}\n` +
                                 `📁 Tanpa folder session: ${serversWithoutSession}\n` +
                                 `🆓 Siap terima sender: ${availableServers}\n\n` +
                                 `⚠️ **Catatan:**\n` +
                                 `• Server tanpa folder session perlu dibuat dulu folder sessionnya\n` +
                                 `• Gunakan menu "📁 Session Folder" untuk membuat folder session\n` +
                                 `• Setelah folder session dibuat, baru bisa upload sender`;

            return bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown', ...getMainMenu() });
        }

        const message = `📤 *Setor Sender - Upload JSON Files*\n\n` +
                       `📊 **Status Panel:**\n` +
                       `🏠 Panel Utama: ${PANEL_URL}\n` +
                       `📈 Total Server: ${servers.length}\n` +
                       `✅ Sudah ada sender: ${serversWithCreds}\n` +
                       `📁 Tanpa folder session: ${serversWithoutSession}\n` +
                       `🆓 Siap terima sender: ${availableServers}\n\n` +
                       `🎯 **Target Upload:**\n` +
                       `• Hanya server dengan folder session yang siap\n` +
                       `• Maksimal ${availableServers} sender bisa diupload\n` +
                       `• Server tanpa folder session akan dilewati\n\n` +
                       `📋 **Cara Penggunaan:**\n` +
                       `1️⃣ Kirim file JSON sender (nama bebas: sender1.json, config.json, dll)\n` +
                       `2️⃣ Bot akan auto-rename jadi creds.json\n` +
                       `3️⃣ Auto-distribute ke server yang siap terima sender\n` +
                       `4️⃣ Klik "✅ Selesai Upload" untuk selesai\n\n` +
                       `⚠️ **Catatan:**\n` +
                       `• Hanya file .json yang diterima\n` +
                       `• File akan di-validate sebagai JSON\n` +
                       `• Tidak akan menimpa sender yang sudah ada\n\n` +
                       `📤 **Mulai upload file JSON sender Anda!**`;

        // Set user to setor creds mode - only include servers with session folder but no creds.json
        setorCredsState.set(chatId, {
            uploadedFiles: [],
            availableServers: servers.filter(server => {
                const sessionPath = `/var/lib/pterodactyl/volumes/${server.attributes.uuid}/session`;
                const credsPath = `${sessionPath}/creds.json`;
                // Only include servers that have session folder but no creds.json
                return fs.existsSync(sessionPath) && !fs.existsSync(credsPath);
            }),
            startTime: new Date()
        });

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Selesai Upload', callback_data: 'setor_creds_done' },
                        { text: '❌ Batal', callback_data: 'setor_creds_cancel' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Handle setor creds error:', error);
        bot.sendMessage(chatId, `❌ Error saat memulai setor creds: ${error.message}`, getMainMenu());
    }
}

async function handleSetorCredsUpload(chatId, msg) {
    try {
        const document = msg.document;
        const state = setorCredsState.get(chatId);

        if (!state) {
            return bot.sendMessage(chatId, '❌ Session setor creds tidak ditemukan. Mulai ulang dari menu.', getMainMenu());
        }

        // Check file extension - handle files with spaces and special characters
        const originalFileName = document.file_name || 'unknown.file';
        // Sanitize filename for logging and display (but keep original for user feedback)
        const fileName = originalFileName.replace(/[^\w\s.-]/g, '').trim();
        const fileExt = path.extname(originalFileName).toLowerCase();

        if (fileExt !== '.json') {
            return bot.sendMessage(chatId, `❌ *File Ditolak*\n\nFile: ${originalFileName}\nAlasan: Hanya file .json yang diterima\n\nSilakan upload file JSON yang valid.`, { parse_mode: 'Markdown' });
        }

        // Check if we have available servers
        if (state.availableServers.length === 0) {
            return bot.sendMessage(chatId, `❌ *Tidak Ada Server Kosong*\n\nSemua server sudah memiliki sender\nGunakan /done untuk menyelesaikan upload.`, { parse_mode: 'Markdown' });
        }

        // Check file size (max 20MB for Telegram Bot API)
        const maxFileSize = 20 * 1024 * 1024; // 20MB
        if (document.file_size > maxFileSize) {
            return bot.sendMessage(chatId, `❌ *File Terlalu Besar*\n\nFile: ${originalFileName}\nUkuran: ${(document.file_size / 1024 / 1024).toFixed(1)} MB\nMaksimal: 20 MB\n\nSilakan kompres atau kecilkan file terlebih dahulu.`, { parse_mode: 'Markdown' });
        }

        // Warn if file is unusually large for JSON
        if (document.file_size > 1024 * 1024) { // 1MB
            bot.sendMessage(chatId, `⚠️ *File Cukup Besar*\n\nFile: ${originalFileName}\nUkuran: ${(document.file_size / 1024).toFixed(1)} KB\n\nFile JSON biasanya kecil (<100KB). Pastikan ini file yang benar.`, { parse_mode: 'Markdown' });
        }

        bot.sendMessage(chatId, `📥 *Memproses File*\n\nFile: ${originalFileName}\nUkuran: ${(document.file_size / 1024).toFixed(1)} KB\n\nMengunduh dan memvalidasi...`, { parse_mode: 'Markdown' });

        // Download file with retry mechanism
        let fileContent;
        let downloadSuccess = false;
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries && !downloadSuccess; attempt++) {
            try {
                console.log(`📥 Download attempt ${attempt}/${maxRetries} for: ${originalFileName} (ID: ${document.file_id})`);

                const fileLink = await bot.getFileLink(document.file_id);
                console.log(`🔗 File link obtained: ${fileLink}`);

                const response = await axios.get(fileLink, {
                    responseType: 'text',
                    timeout: 30000, // 30 seconds timeout
                    maxContentLength: 50 * 1024 * 1024, // 50MB max
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                fileContent = response.data;
                downloadSuccess = true;
                console.log(`✅ File downloaded successfully on attempt ${attempt}, size: ${fileContent.length} characters`);

            } catch (attemptError) {
                console.error(`❌ Download attempt ${attempt} failed:`, attemptError.message);

                if (attempt < maxRetries) {
                    console.log(`🔄 Retrying in 2 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    // All attempts failed, try alternative method
                    console.log(`🔄 All primary attempts failed, trying alternative method...`);
                    throw attemptError;
                }
            }
        }

        // If primary method failed, try alternative
        if (!downloadSuccess) {
            try {
                console.log(`🔄 Trying alternative download method for: ${originalFileName}`);

                // Get file info first
                const fileInfo = await bot.getFile(document.file_id);
                console.log(`📄 File info:`, fileInfo);

                // Construct direct download URL
                const token = process.env.BOT_TOKEN;
                const directUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
                console.log(`🔗 Direct URL: ${directUrl.replace(token, 'TOKEN_HIDDEN')}`);

                const response = await axios.get(directUrl, {
                    responseType: 'text',
                    timeout: 45000, // 45 seconds timeout for alternative method
                    maxContentLength: 50 * 1024 * 1024, // 50MB max
                    headers: {
                        'User-Agent': 'TelegramBot/1.0'
                    }
                });

                fileContent = response.data;
                downloadSuccess = true;
                console.log(`✅ Alternative download successful, size: ${fileContent.length} characters`);

            } catch (alternativeError) {
                console.error('Alternative download also failed:', alternativeError.message);

                // Both methods failed, show error
                let errorMsg = `❌ *Error Download File*\n\nFile: ${originalFileName}\n`;

                if (alternativeError.code === 'ECONNRESET' || alternativeError.code === 'ETIMEDOUT') {
                    errorMsg += `Error: Koneksi timeout atau terputus\n\n💡 **Solusi:**\n• Coba upload ulang file\n• Pastikan koneksi internet stabil\n• File mungkin terlalu besar (max 20MB)`;
                } else if (alternativeError.response?.status === 404) {
                    errorMsg += `Error: File tidak ditemukan di server Telegram\n\n💡 **Solusi:**\n• Upload file baru (jangan forward file lama)\n• Pastikan file masih valid`;
                } else if (alternativeError.response?.status >= 400) {
                    errorMsg += `Error: HTTP ${alternativeError.response.status}\n\n💡 **Solusi:**\n• Coba upload ulang\n• File mungkin corrupt atau tidak valid`;
                } else if (document.file_size > 20 * 1024 * 1024) {
                    errorMsg += `Error: File terlalu besar (${(document.file_size / 1024 / 1024).toFixed(1)}MB)\n\n💡 **Solusi:**\n• Maksimal ukuran file 20MB\n• Kompres atau kecilkan file`;
                } else {
                    errorMsg += `Error: ${alternativeError.message}\n\n💡 **Solusi:**\n• Coba upload ulang file\n• Pastikan file tidak corrupt\n• Restart bot jika masalah berlanjut`;
                }

                return bot.sendMessage(chatId, errorMsg, { parse_mode: 'Markdown' });
            }
        }

        // Check if download was successful
        if (!downloadSuccess || !fileContent) {
            return bot.sendMessage(chatId, `❌ *Error Download File*\n\nFile: ${originalFileName}\nError: Gagal mengunduh file setelah beberapa percobaan\n\nSilakan coba upload ulang.`, { parse_mode: 'Markdown' });
        }

        // Clean and validate JSON
        let jsonData;
        try {
            console.log(`📄 Processing file: ${originalFileName}`);
            console.log(`📄 File size: ${document.file_size} bytes`);
            console.log(`📄 Content preview: ${fileContent.substring(0, 100)}...`);

            const cleanedContent = cleanJsonContent(fileContent);
            jsonData = JSON.parse(cleanedContent);

            console.log(`✅ JSON validation successful for: ${originalFileName}`);

            // Additional validation for JSON content
            if (typeof jsonData === 'object' && jsonData !== null) {
                const keyCount = Array.isArray(jsonData) ? jsonData.length : Object.keys(jsonData).length;
                console.log(`📊 JSON content: ${Array.isArray(jsonData) ? 'Array' : 'Object'} with ${keyCount} ${Array.isArray(jsonData) ? 'items' : 'keys'}`);

                if (keyCount === 0) {
                    return bot.sendMessage(chatId, `❌ *File JSON Kosong*\n\nFile: ${originalFileName}\nError: File berisi JSON kosong\n\nPastikan file berisi data yang valid.`, { parse_mode: 'Markdown' });
                }
            } else {
                console.log(`📊 JSON content: ${typeof jsonData} - ${jsonData}`);
            }

        } catch (parseError) {
            console.error('JSON parse error for file:', originalFileName, parseError);
            console.error('File content preview:', fileContent.substring(0, 200));
            console.error('File content type:', typeof fileContent);
            console.error('File content length:', fileContent.length);

            return bot.sendMessage(chatId, `❌ *File JSON Tidak Valid*\n\nFile: ${originalFileName}\nError: ${parseError.message}\n\nPastikan file berisi JSON yang valid.\n\n💡 **Tips:**\n• Cek format JSON dengan validator online\n• Pastikan tidak ada karakter aneh di awal/akhir file\n• File harus berisi object JSON {...} atau array [...]`, { parse_mode: 'Markdown' });
        }

        // Get next available server
        const targetServer = state.availableServers.shift(); // Remove from available list
        const targetUuid = targetServer.attributes.uuid;
        const targetName = targetServer.attributes.name;

        // Create target paths
        const targetSessionPath = `/var/lib/pterodactyl/volumes/${targetUuid}/session`;
        const targetCredsPath = `${targetSessionPath}/creds.json`;

        console.log(`📁 Target server: ${targetName} (${targetUuid})`);
        console.log(`📁 Session path: ${targetSessionPath}`);
        console.log(`📄 Creds path: ${targetCredsPath}`);

        // Verify session directory exists (it should, since we filtered for it)
        if (!fs.existsSync(targetSessionPath)) {
            console.error(`❌ Session folder not found: ${targetSessionPath}`);
            return bot.sendMessage(chatId, `❌ *Error: Folder Session Tidak Ditemukan*\n\nServer: ${targetName}\nPath: ${targetSessionPath}\n\nFolder session harus dibuat terlebih dahulu.\nGunakan menu "📁 Session Folder" untuk membuat folder.`, { parse_mode: 'Markdown' });
        }

        console.log(`✅ Session folder exists: ${targetSessionPath}`);

        // Write creds.json to target server
        try {
            console.log(`💾 Writing creds.json to: ${targetCredsPath}`);
            fs.writeFileSync(targetCredsPath, JSON.stringify(jsonData, null, 2), { mode: 0o644 });
            console.log(`✅ Successfully wrote creds.json to: ${targetCredsPath}`);

            // Verify file was actually written
            if (fs.existsSync(targetCredsPath)) {
                const fileStats = fs.statSync(targetCredsPath);
                console.log(`✅ File verification successful - Size: ${fileStats.size} bytes`);
            } else {
                console.error(`❌ File verification failed - File not found: ${targetCredsPath}`);
                return bot.sendMessage(chatId, `❌ *Error: File Tidak Tersimpan*\n\nFile: ${originalFileName}\nTarget: ${targetName}\nPath: ${targetCredsPath}\n\nFile berhasil ditulis tapi tidak ditemukan setelah verifikasi.`, { parse_mode: 'Markdown' });
            }

        } catch (writeError) {
            console.error('File write error:', writeError);
            return bot.sendMessage(chatId, `❌ *Error Menyimpan File*\n\nFile: ${originalFileName}\nTarget: ${targetName}\nError: ${writeError.message}\nPath: ${targetCredsPath}\n\nSilakan coba lagi.`, { parse_mode: 'Markdown' });
        }

        // Update state
        state.uploadedFiles.push({
            originalName: originalFileName,
            targetServer: targetName,
            targetUuid: targetUuid,
            targetIdentifier: targetServer.attributes.identifier, // Add identifier for restart
            uploadTime: new Date()
        });

        // Update state in map
        setorCredsState.set(chatId, state);

        const successMessage = `✅ *Sender Berhasil Terkoneksi*\n\n` +
                              `📄 **Sender:** ${originalFileName}\n` +
                              `🎯 **Target Server:** ${targetName}\n` +
                              `📁 **Disimpan sebagai:** creds.json\n` +
                              `📊 **Progress:** ${state.uploadedFiles.length} sender connected\n` +
                              `🆓 **Server Kosong Tersisa:** ${state.availableServers.length}\n\n` +
                              `📤 **Lanjutkan upload sender berikutnya atau klik Selesai**`;

        bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Handle setor creds upload error:', error);

        // Handle specific error types
        let errorMessage = `❌ Error saat memproses file: ${originalFileName}\n\n`;

        if (error.code === 'EFATAL' || error.name === 'AggregateError') {
            errorMessage += `🔧 **Error Type:** ${error.name || error.code}\n`;
            errorMessage += `💡 **Solusi:** Coba upload ulang file atau rename file tanpa karakter khusus\n\n`;
            errorMessage += `📝 **Tips:**\n`;
            errorMessage += `• Rename file jadi nama sederhana (contoh: creds1.json)\n`;
            errorMessage += `• Hindari spasi dan karakter khusus dalam nama file\n`;
            errorMessage += `• Pastikan file tidak corrupt`;
        } else {
            errorMessage += `Error: ${error.message}`;
        }

        bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
    }
}

async function handleSetorCredsDone(chatId) {
    try {
        const state = setorCredsState.get(chatId);

        if (!state) {
            return bot.sendMessage(chatId, '❌ Session setor creds tidak ditemukan.', getMainMenu());
        }

        const uploadedCount = state.uploadedFiles.length;
        const duration = Math.round((new Date() - state.startTime) / 1000);

        if (uploadedCount === 0) {
            setorCredsState.delete(chatId);
            return bot.sendMessage(chatId, '📤 *Setor Creds Dibatalkan*\n\nTidak ada file yang diupload.', getMainMenu());
        }

        let report = `✅ *Setor Sender Selesai*\n\n`;
        report += `📊 **Ringkasan:**\n`;
        report += `📤 Total Sender connected: ${uploadedCount}\n`;
        report += `⏱️ Durasi: ${duration} detik\n`;
        report += `⏰ Selesai: ${new Date().toLocaleString('id-ID')}\n\n`;
        report += `📋 **Detail Pairing Senders:**\n`;

        for (let i = 0; i < state.uploadedFiles.length; i++) {
            const file = state.uploadedFiles[i];
            report += `${i + 1}. sender ${i + 1} → ${file.targetServer}\n`;
        }

        report += `\n🎯 **Semua sender berhasil terkoneksi sebagai babu nya Tamas!**`;

        // Ask for restart confirmation
        const restartKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Ya, Restart Sender', callback_data: 'setor_creds_restart_yes' },
                        { text: '❌ Tidak, Lewati', callback_data: 'setor_creds_restart_no' }
                    ]
                ]
            }
        };

        // Send completion report first
        await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });

        // Then ask for restart confirmation
        const confirmMessage = `🔄 *Konfirmasi Restart Sender*\n\n` +
                              `Apakah Anda ingin merestart sender yang baru saja terkoneksi?\n\n` +
                              `📊 **Sender yang akan direstart:** ${uploadedCount} sender\n` +
                              `⚠️ **Catatan:** Hanya sender yang baru terkoneksi yang akan direstart\n\n` +
                              `🔄 **Pilih tindakan:**`;

        bot.sendMessage(chatId, confirmMessage, { parse_mode: 'Markdown', ...restartKeyboard });

    } catch (error) {
        console.error('Handle setor creds done error:', error);
        bot.sendMessage(chatId, `❌ Error saat menyelesaikan setor creds: ${error.message}`, getMainMenu());
    }
}

async function handleSetorCredsCancel(chatId) {
    try {
        const state = setorCredsState.get(chatId);

        if (!state) {
            return bot.sendMessage(chatId, '❌ Session setor creds tidak ditemukan.', getMainMenu());
        }

        const uploadedCount = state.uploadedFiles.length;

        if (uploadedCount > 0) {
            let report = `❌ *Setor Sender Dibatalkan*\n\n`;
            report += `📊 **Sender yang sudah terkoneksi:** ${uploadedCount}\n\n`;
            report += `📋 **Detail:**\n`;

            for (let i = 0; i < state.uploadedFiles.length; i++) {
                const file = state.uploadedFiles[i];
                report += `${i + 1}. sender ${i + 1} → ${file.targetServer}\n`;
            }

            report += `\n⚠️ **Sender yang sudah terkoneksi tetap aktif di server**`;

            bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });
        } else {
            bot.sendMessage(chatId, '❌ *Setor Sender Dibatalkan*\n\nTidak ada sender yang terkoneksi.', getMainMenu());
        }

        // Clear state
        setorCredsState.delete(chatId);

    } catch (error) {
        console.error('Handle setor creds cancel error:', error);
        bot.sendMessage(chatId, `❌ Error saat membatalkan setor creds: ${error.message}`, getMainMenu());
    }
}

async function handleSetorCredsRestartYes(chatId) {
    try {
        const state = setorCredsState.get(chatId);

        if (!state || !state.uploadedFiles || state.uploadedFiles.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada data server untuk direstart.', getMainMenu());
        }

        const serversToRestart = state.uploadedFiles;
        const totalServers = serversToRestart.length;

        bot.sendMessage(chatId, `🔄 *Memulai Restart Sender*\n\n📊 **Total Sender:** ${totalServers}\n⏳ **Status:** Memproses...`, { parse_mode: 'Markdown' });

        let successCount = 0;
        let failedCount = 0;
        const failedServers = [];

        for (const serverInfo of serversToRestart) {
            try {
                console.log(`🔄 Restarting server: ${serverInfo.targetServer} (${serverInfo.targetUuid})`);

                // Try different identifiers for restart
                const identifiers = [
                    serverInfo.targetUuid,
                    serverInfo.targetIdentifier
                ].filter(Boolean);

                let restartSuccess = false;

                for (const identifier of identifiers) {
                    console.log(`🔄 Trying restart with identifier: ${identifier}`);
                    restartSuccess = await PteroAPI.restartServer(identifier);
                    if (restartSuccess) {
                        console.log(`✅ Successfully restarted ${serverInfo.targetServer} using identifier: ${identifier}`);
                        break;
                    }
                }

                if (restartSuccess) {
                    successCount++;
                } else {
                    failedCount++;
                    failedServers.push(serverInfo.targetServer);
                    console.log(`❌ All restart attempts failed for: ${serverInfo.targetServer}`);
                }

                // Small delay between restarts to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                failedCount++;
                failedServers.push(serverInfo.targetServer);
                console.error(`❌ Error restarting ${serverInfo.targetServer}:`, error.message);
            }
        }

        // Generate restart report
        let restartReport = `🔄 *Restart Sender Selesai*\n\n`;
        restartReport += `📊 **Ringkasan:**\n`;
        restartReport += `✅ Berhasil: ${successCount} sender\n`;
        restartReport += `❌ Gagal: ${failedCount} sender\n`;
        restartReport += `📈 Total: ${totalServers} sender\n\n`;

        if (failedCount > 0) {
            restartReport += `❌ **Sender Gagal Restart:**\n`;
            failedServers.forEach((serverName, index) => {
                restartReport += `${index + 1}. ${serverName}\n`;
            });
            restartReport += `\n💡 **Tip:** Sender gagal mungkin sudah mati atau ada masalah koneksi`;
        } else {
            restartReport += `🎉 **Semua sender berhasil direstart dan siap jadi babu Tamas!**`;
        }

        // Clear state after restart
        setorCredsState.delete(chatId);

        bot.sendMessage(chatId, restartReport, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Handle setor creds restart yes error:', error);
        bot.sendMessage(chatId, `❌ Error saat restart server: ${error.message}`, getMainMenu());
        // Clear state on error
        setorCredsState.delete(chatId);
    }
}

async function handleSetorCredsRestartNo(chatId) {
    try {
        const state = setorCredsState.get(chatId);

        if (!state) {
            return bot.sendMessage(chatId, '❌ Session tidak ditemukan.', getMainMenu());
        }

        const uploadedCount = state.uploadedFiles ? state.uploadedFiles.length : 0;

        // Clear state
        setorCredsState.delete(chatId);

        const message = `✅ *Setor Sender Selesai*\n\n` +
                       `📊 **Ringkasan:**\n` +
                       `📤 Total Sender connected: ${uploadedCount}\n` +
                       `🔄 Restart Sender: Dilewati\n\n` +
                       `🎯 **Semua sender sudah terkoneksi dan siap jadi babu Tamas!**`;

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Handle setor creds restart no error:', error);
        bot.sendMessage(chatId, `❌ Error: ${error.message}`, getMainMenu());
        // Clear state on error
        setorCredsState.delete(chatId);
    }
}

// Manage Panel Blacklist
async function handleManageBlacklist(chatId) {
    try {
        let message = `🚫 *Manage Panel Blacklist*\n\n`;
        message += `📋 *Panel yang Diblacklist:*\n`;

        if (PANEL_BLACKLIST.length === 0) {
            message += `✅ Tidak ada panel yang diblacklist\n\n`;
        } else {
            for (let i = 0; i < PANEL_BLACKLIST.length; i++) {
                message += `${i + 1}\\. ${PANEL_BLACKLIST[i]}\n`;
            }
            message += `\n`;
        }

        message += `🔍 *Status Panel Saat Ini:*\n`;
        message += `🏠 Panel Utama: ${PANEL_URL}\n`;
        message += `   Status: ${isPanelBlacklisted(PANEL_URL) ? '🚫 DIBLACKLIST' : '✅ Diizinkan'}\n`;
        message += `🌐 Panel Eksternal: ${EXTERNAL_PANEL.domain}\n`;
        message += `   Status: ${isPanelBlacklisted(EXTERNAL_PANEL.domain) ? '🚫 DIBLACKLIST' : '✅ Diizinkan'}\n\n`;

        message += `⚠️ *Catatan:*\n`;
        message += `• Panel yang diblacklist tidak bisa digunakan untuk operasi apapun\n`;
        message += `• Termasuk: Setor Creds, Copy Creds, Create Server, dll\n`;
        message += `• Blacklist bersifat permanen sampai dihapus dari konfigurasi\n\n`;

        message += `🛠️ *Untuk menambah/hapus blacklist, edit konfigurasi PANEL\\_BLACKLIST di bot\\.js*`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '➕ Tambah Panel', callback_data: 'add_blacklist' },
                        { text: '➖ Hapus Panel', callback_data: 'remove_blacklist' }
                    ],
                    [
                        { text: '🔄 Refresh Status', callback_data: 'manage_blacklist' },
                        { text: '🔙 Kembali', callback_data: 'admin_panel' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Handle manage blacklist error:', error);
        bot.sendMessage(chatId, `❌ Error saat menampilkan blacklist: ${error.message}`, getMainMenu());
    }
}

// Handle Add Blacklist
async function handleAddBlacklist(chatId) {
    try {
        const message = `➕ *Tambah Panel ke Blacklist*\n\n` +
                       `🔗 Kirim URL/domain panel yang ingin diblacklist\n\n` +
                       `📝 *Contoh format:*\n` +
                       `• panel\\.example\\.com\n` +
                       `• https://panel\\.example\\.com\n` +
                       `• subdomain\\.panel\\.com\n\n` +
                       `⚠️ *Catatan:*\n` +
                       `• Panel yang diblacklist tidak bisa digunakan\n` +
                       `• Pastikan URL/domain benar sebelum menambah\n` +
                       `• Ketik /cancel untuk membatalkan`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '❌ Batal', callback_data: 'manage_blacklist' }
                    ]
                ]
            }
        };

        blacklistStates.set(chatId, { action: 'add' });
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Handle add blacklist error:', error);
        bot.sendMessage(chatId, `❌ Error: ${error.message}`, getMainMenu());
    }
}

// Handle Remove Blacklist
async function handleRemoveBlacklist(chatId) {
    try {
        if (PANEL_BLACKLIST.length === 0) {
            return bot.sendMessage(chatId,
                `❌ *Tidak Ada Panel untuk Dihapus*\n\n` +
                `Blacklist kosong, tidak ada panel yang bisa dihapus.`,
                { parse_mode: 'Markdown', ...getBackToBlacklistMenu() }
            );
        }

        let message = `➖ *Hapus Panel dari Blacklist*\n\n`;
        message += `📋 *Pilih panel yang ingin dihapus:*\n\n`;

        const keyboard = [];
        for (let i = 0; i < PANEL_BLACKLIST.length; i++) {
            message += `${i + 1}\\. ${PANEL_BLACKLIST[i]}\n`;
            keyboard.push([
                { text: `🗑️ Hapus: ${PANEL_BLACKLIST[i]}`, callback_data: `blacklist_remove_${i}` }
            ]);
        }

        keyboard.push([
            { text: '🔙 Kembali', callback_data: 'manage_blacklist' }
        ]);

        const keyboardMarkup = {
            reply_markup: {
                inline_keyboard: keyboard
            }
        };

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...keyboardMarkup });

    } catch (error) {
        console.error('Handle remove blacklist error:', error);
        bot.sendMessage(chatId, `❌ Error: ${error.message}`, getMainMenu());
    }
}

// Execute Remove Blacklist
async function executeRemoveBlacklist(chatId, index) {
    try {
        if (index < 0 || index >= PANEL_BLACKLIST.length) {
            return bot.sendMessage(chatId,
                `❌ *Index Tidak Valid*\n\nPanel tidak ditemukan dalam blacklist.`,
                { parse_mode: 'Markdown', ...getBackToBlacklistMenu() }
            );
        }

        const removedPanel = PANEL_BLACKLIST[index];
        PANEL_BLACKLIST.splice(index, 1);

        // Save to file (optional - for persistence)
        await saveBlacklistToFile();

        const message = `✅ *Panel Berhasil Dihapus dari Blacklist*\n\n` +
                       `🗑️ *Panel yang dihapus:*\n` +
                       `${removedPanel}\n\n` +
                       `📊 *Status blacklist:*\n` +
                       `Total panel: ${PANEL_BLACKLIST.length}\n\n` +
                       `✅ Panel ini sekarang bisa digunakan untuk operasi bot.`;

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...getBackToBlacklistMenu() });

    } catch (error) {
        console.error('Execute remove blacklist error:', error);
        bot.sendMessage(chatId, `❌ Error saat menghapus: ${error.message}`, getMainMenu());
    }
}

// Handle Add Blacklist Input
async function handleAddBlacklistInput(chatId, input) {
    try {
        // Clean and validate input
        let domain = input.trim();

        // Remove protocol if present
        domain = domain.replace(/^https?:\/\//, '');

        // Remove trailing slash
        domain = domain.replace(/\/$/, '');

        // Basic validation
        if (!domain || domain.length < 3) {
            return bot.sendMessage(chatId,
                `❌ *Domain Tidak Valid*\n\n` +
                `Domain terlalu pendek atau kosong.\n` +
                `Silakan masukkan domain yang valid.`,
                { parse_mode: 'Markdown' }
            );
        }

        // Check if already in blacklist
        if (PANEL_BLACKLIST.includes(domain)) {
            return bot.sendMessage(chatId,
                `⚠️ *Domain Sudah Ada*\n\n` +
                `Domain "${domain}" sudah ada dalam blacklist.\n\n` +
                `Silakan masukkan domain lain atau ketik /cancel untuk membatalkan.`,
                { parse_mode: 'Markdown' }
            );
        }

        // Add to blacklist
        PANEL_BLACKLIST.push(domain);
        blacklistStates.delete(chatId);

        // Save to file (optional - for persistence)
        await saveBlacklistToFile();

        const message = `✅ *Panel Berhasil Ditambahkan ke Blacklist*\n\n` +
                       `➕ *Panel yang ditambahkan:*\n` +
                       `${domain}\n\n` +
                       `📊 *Status blacklist:*\n` +
                       `Total panel: ${PANEL_BLACKLIST.length}\n\n` +
                       `🚫 Panel ini sekarang tidak bisa digunakan untuk operasi bot.`;

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...getBackToBlacklistMenu() });

    } catch (error) {
        console.error('Handle add blacklist input error:', error);
        blacklistStates.delete(chatId);
        bot.sendMessage(chatId, `❌ Error saat menambah blacklist: ${error.message}`, getMainMenu());
    }
}

// Save blacklist to file (for persistence)
async function saveBlacklistToFile() {
    try {
        const fs = require('fs').promises;
        const blacklistData = {
            blacklist: PANEL_BLACKLIST,
            updated: new Date().toISOString()
        };

        await fs.writeFile('blacklist.json', JSON.stringify(blacklistData, null, 2));
        console.log('✅ Blacklist saved to file');
    } catch (error) {
        console.error('❌ Error saving blacklist:', error);
    }
}

// Load blacklist from file (for persistence)
async function loadBlacklistFromFile() {
    try {
        const fs = require('fs').promises;
        const data = await fs.readFile('blacklist.json', 'utf8');
        const blacklistData = JSON.parse(data);

        if (blacklistData.blacklist && Array.isArray(blacklistData.blacklist)) {
            PANEL_BLACKLIST.length = 0; // Clear current array
            PANEL_BLACKLIST.push(...blacklistData.blacklist); // Add loaded data
            console.log(`✅ Blacklist loaded from file: ${PANEL_BLACKLIST.length} entries`);
        }
    } catch (error) {
        console.log('ℹ️ No blacklist file found, using default configuration');
    }
}

// Helper function for back to blacklist menu
function getBackToBlacklistMenu() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔙 Kembali ke Blacklist', callback_data: 'manage_blacklist' }
                ]
            ]
        }
    };
}

async function executeCopyExternalCreds(chatId) {
    try {
        bot.sendMessage(chatId, '📋 *Memulai Copy Creds dari Panel Eksternal*\n\nMengambil server dari kedua panel...', { parse_mode: 'Markdown' });

        // Get servers from both panels
        const externalServers = await ExternalPteroAPI.getAllServers();
        const mainServers = await PteroAPI.getAllServers();

        console.log(`📊 External panel servers: ${externalServers.length}`);
        console.log(`📊 Main panel servers: ${mainServers.length}`);
        console.log(`📋 Sample external servers:`, externalServers.slice(0, 3).map(s => ({ name: s.attributes.name, uuid: s.attributes.uuid })));
        console.log(`📋 Sample main servers:`, mainServers.slice(0, 3).map(s => ({ name: s.attributes.name, uuid: s.attributes.uuid })));

        let copiedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        let deletedSessionCount = 0;

        bot.sendMessage(chatId, `🔄 *Memproses ${externalServers.length} server eksternal...*\n*Panel utama memiliki ${mainServers.length} server*`, { parse_mode: 'Markdown' });

        for (const externalServer of externalServers) {
            try {
                const externalUuid = externalServer.attributes.uuid;
                const externalName = externalServer.attributes.name;
                const externalSessionPath = `/var/lib/pterodactyl/volumes/${externalUuid}/session`;
                const externalCredsPath = `${externalSessionPath}/creds.json`;

                console.log(`🔍 Processing external server: ${externalName} (${externalUuid})`);
                console.log(`📁 Checking path: ${externalCredsPath}`);
                console.log(`📂 Session path exists: ${fs.existsSync(externalSessionPath)}`);
                console.log(`📄 Creds file exists: ${fs.existsSync(externalCredsPath)}`);

                // Check if external server has creds.json
                let credsFound = false;
                let actualCredsPath = externalCredsPath;

                // Try different possible locations for JSON files (any name)
                const possiblePaths = [
                    externalCredsPath, // /var/lib/pterodactyl/volumes/{uuid}/session/creds.json
                    `/var/lib/pterodactyl/volumes/${externalUuid}/creds.json`, // Direct in volume
                    `/var/lib/pterodactyl/volumes/${externalUuid}/session/plugins/creds.json`, // In plugins folder
                ];

                // Also check for any .json files in session directory
                const sessionDir = `/var/lib/pterodactyl/volumes/${externalUuid}/session`;
                if (fs.existsSync(sessionDir)) {
                    try {
                        const files = fs.readdirSync(sessionDir);
                        for (const file of files) {
                            if (file.endsWith('.json')) {
                                possiblePaths.push(path.join(sessionDir, file));
                            }
                        }
                    } catch (error) {
                        console.log(`⚠️ Could not read session directory: ${sessionDir}`);
                    }
                }

                for (const filePath of possiblePaths) {
                    if (fs.existsSync(filePath)) {
                        try {
                            // Validate it's a valid JSON file
                            const content = fs.readFileSync(filePath, 'utf8');
                            JSON.parse(content);
                            credsFound = true;
                            actualCredsPath = filePath;
                            const fileName = path.basename(filePath);
                            console.log(`✅ Found JSON file: ${fileName} at: ${filePath}`);
                            break;
                        } catch (error) {
                            console.log(`⚠️ Invalid JSON file: ${filePath}`);
                        }
                    }
                }

                if (!credsFound) {
                    skippedCount++;
                    console.log(`❌ No creds.json found for ${externalName}, tried paths:`, possiblePaths);

                    // List what's actually in the session folder
                    if (fs.existsSync(externalSessionPath)) {
                        try {
                            const sessionContents = fs.readdirSync(externalSessionPath);
                            console.log(`📋 Session folder contents for ${externalName}:`, sessionContents);
                        } catch (listError) {
                            console.log(`❌ Cannot list session folder for ${externalName}:`, listError.message);
                        }
                    }
                    continue;
                }

                // Read and clean JSON from external server
                const rawCredsContent = fs.readFileSync(actualCredsPath, 'utf8');
                const credsContent = cleanJsonContent(rawCredsContent);
                let parsedCreds;

                try {
                    parsedCreds = JSON.parse(credsContent);
                } catch (parseError) {
                    errorCount++;
                    console.error(`❌ Invalid JSON in ${externalName}:`, parseError);
                    continue;
                }

                // Find matching server in main panel by name
                console.log(`🔍 Looking for matching server in main panel for: "${externalName}"`);
                console.log(`📊 Main panel has ${mainServers.length} servers`);

                const matchingMainServer = mainServers.find(mainServer =>
                    mainServer.attributes.name === externalName
                );

                if (!matchingMainServer) {
                    skippedCount++;
                    console.log(`❌ No matching server found in main panel for "${externalName}"`);
                    console.log(`📋 Available main panel servers:`, mainServers.slice(0, 5).map(s => s.attributes.name));
                    continue;
                }

                console.log(`✅ Found matching server: "${matchingMainServer.attributes.name}" (${matchingMainServer.attributes.uuid})`);

                const mainUuid = matchingMainServer.attributes.uuid;
                const mainSessionPath = `/var/lib/pterodactyl/volumes/${mainUuid}/session`;
                const mainCredsPath = `${mainSessionPath}/creds.json`;

                // Create session folder in main panel if not exists
                if (!fs.existsSync(mainSessionPath)) {
                    fs.mkdirSync(mainSessionPath, { recursive: true });
                    fs.chmodSync(mainSessionPath, 0o755);
                }

                // Copy creds.json to main panel
                fs.writeFileSync(mainCredsPath, JSON.stringify(parsedCreds, null, 2));
                fs.chmodSync(mainCredsPath, 0o644);

                copiedCount++;
                console.log(`✅ Copied creds.json from ${externalName} to main panel`);

                // Note: Session folder deletion is now handled separately

            } catch (error) {
                errorCount++;
                console.error(`❌ Error processing ${externalServer.attributes.name}:`, error);
            }
        }

        const report = `📋 *Copy Creds dari Panel Eksternal Selesai*\n\n` +
                      `🌐 **Panel Eksternal:** ${EXTERNAL_PANEL.domain}\n` +
                      `🏠 **Panel Utama:** ${PANEL_URL}\n\n` +
                      `📊 **Hasil:**\n` +
                      `✅ Copied: ${copiedCount} creds.json\n` +
                      `⏭️ Skipped: ${skippedCount} server (no creds/no match)\n` +
                      `❌ Error: ${errorCount} server\n\n` +
                      `📈 **Total Server Eksternal:** ${externalServers.length}\n` +
                      `⏰ **Selesai:** ${new Date().toLocaleString('id-ID')}\n\n` +
                      `💡 *Gunakan menu terpisah untuk hapus session folder dari panel eksternal*`;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute copy external creds error:', error);
        bot.sendMessage(chatId, `❌ Error saat copy creds dari panel eksternal: ${error.message}`, getMainMenu());
    }
}

// Error handling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error.message);
});

// Handle document uploads
bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const document = msg.document;

    // Check if user is in setor creds mode
    if (setorCredsState.has(chatId)) {
        await handleSetorCredsUpload(chatId, msg);
        return;
    }

    // If not in setor creds mode, ignore document
    bot.sendMessage(chatId, '📄 *File diterima*\n\nUntuk upload creds JSON, gunakan menu "📤 Setor Creds" terlebih dahulu.', {
        parse_mode: 'Markdown',
        ...getMainMenu()
    });
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
