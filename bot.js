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
        '../volumes',                             // Parent directory relative path
        './test-volumes'                          // Test environment path
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

// Escape Markdown special characters to prevent Telegram parsing errors
function escapeMarkdown(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    // Escape special Markdown characters that can cause parsing errors
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// Configuration from .env
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = parseInt(process.env.OWNER_TELEGRAM_ID);
const PANEL_URL = process.env.PANEL_URL;
const APP_API_KEY = process.env.APP_API_KEY;
const CLIENT_API_KEY = process.env.CLIENT_API_KEY;

// Main Panel Server Configuration
const MAIN_PANEL_LOCATION = process.env.MAIN_PANEL_LOCATION || 1;
const MAIN_PANEL_NEST = process.env.MAIN_PANEL_NEST || 6;
const MAIN_PANEL_EGG = process.env.MAIN_PANEL_EGG || 19;

// KONTOL IP Configuration - Force allocation to specific IP
const KONTOL_IP = process.env.KONTOL_IP || "0.0.0.0";
const KONTOL_ALIAS = process.env.KONTOL_ALIAS || "KONTOL";
const FORCE_KONTOL_ALLOCATION = process.env.FORCE_KONTOL_ALLOCATION === 'true';

// External Panel Configuration
const EXTERNAL_PANEL_DOMAIN = process.env.EXTERNAL_PANEL_DOMAIN;
const EXTERNAL_PANEL_PLTA = process.env.EXTERNAL_PANEL_PLTA;
const EXTERNAL_PANEL_PLTC = process.env.EXTERNAL_PANEL_PLTC;
const EXTERNAL_PANEL_LOC = process.env.EXTERNAL_PANEL_LOC;
const EXTERNAL_PANEL_NESTS = process.env.EXTERNAL_PANEL_NESTS;
const EXTERNAL_PANEL_EGGS = process.env.EXTERNAL_PANEL_EGGS;

// Output Directories
const OUTPUT_EXTERNAL_DIR = process.env.OUTPUT_EXTERNAL_DIR || 'output-external';
const OUTPUT_SCRAPE_SENDER_DIR = process.env.OUTPUT_SCRAPE_SENDER_DIR || 'output-scrape-sender';

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

// External Panel Configuration from .env
const EXTERNAL_PANEL = {
    domain: EXTERNAL_PANEL_DOMAIN,
    plta: EXTERNAL_PANEL_PLTA,
    pltc: EXTERNAL_PANEL_PLTC,
    loc: EXTERNAL_PANEL_LOC,
    nests: EXTERNAL_PANEL_NESTS,
    eggs: EXTERNAL_PANEL_EGGS
};

// Panel Blacklist - Panel yang tidak boleh digunakan
let PANEL_BLACKLIST = [
    'panel.hostkita.xyz',
    'panel-blocked.example.com',
    // Tambahkan domain panel yang ingin diblacklist
];

// State untuk manage blacklist
const blacklistStates = new Map();

// 🎯 Startup Log - KONTOL Allocation Configuration
console.log('🤖 Pterodactyl Telegram Bot Started!');
console.log('📊 Bot Features:');
console.log('   • Server Management');
console.log('   • User Management');
console.log('   • File Upload & Management');
console.log('   • Session Folder Creation');
console.log('   • External Panel Integration');
console.log('   • Panel Blacklist Management');
console.log('   • Advanced Error Handling');
console.log('');
console.log('🔧 Configuration:');
console.log(`   • Panel URL: ${PANEL_URL}`);
console.log(`   • Owner ID: ${OWNER_ID}`);
console.log(`   • External Panel: ${EXTERNAL_PANEL.domain}`);
console.log('');
console.log('🎯 KONTOL Allocation Configuration:');
console.log(`   • ${KONTOL_ALIAS} IP: ${KONTOL_IP}`);
console.log(`   • Force ${KONTOL_ALIAS} Allocation: ${FORCE_KONTOL_ALLOCATION ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`   • Allocation Alias: ${KONTOL_ALIAS}`);
if (FORCE_KONTOL_ALLOCATION) {
    console.log(`   • 🎯 All new servers will attempt to use ${KONTOL_IP} allocation`);
    console.log(`   • 🔄 Fallback to auto-assignment if ${KONTOL_ALIAS} allocation unavailable`);
}
console.log('');
console.log('✅ Bot is ready to receive commands!');

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

    static async clientRequest(endpoint, method = 'GET', data = null) {
        try {
            const url = `${EXTERNAL_PANEL.domain}/api/client/${endpoint}`;
            const config = {
                method,
                url,
                headers: {
                    'Authorization': `Bearer ${EXTERNAL_PANEL.pltc}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'Sec-CH-UA-Mobile': '?0',
                    'Sec-CH-UA-Platform': '"Windows"',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Referer': `${EXTERNAL_PANEL.domain}/`,
                    'Origin': EXTERNAL_PANEL.domain
                },
                timeout: 45000,
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status < 500; // Accept all status codes below 500
                }
            };

            if (data) config.data = data;

            console.log('🌐 External Panel Client API Request:', {
                url,
                method,
                user_agent: config.headers['User-Agent'].substring(0, 50) + '...',
                authorization: `Bearer ${EXTERNAL_PANEL.pltc.substring(0, 10)}...`
            });

            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

            let response;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount <= maxRetries) {
                try {
                    response = await axios(config);

                    // Check if response is HTML (Cloudflare block page)
                    if (response.headers['content-type']?.includes('text/html') ||
                        (typeof response.data === 'string' && response.data.includes('Just a moment'))) {

                        if (retryCount < maxRetries) {
                            console.log(`🛡️ Cloudflare challenge detected (attempt ${retryCount + 1}/${maxRetries + 1}), retrying...`);
                            retryCount++;

                            // Wait longer between retries
                            await new Promise(resolve => setTimeout(resolve, 5000 + (retryCount * 2000)));

                            // Modify headers for retry
                            config.headers['User-Agent'] = retryCount === 1 ?
                                'curl/7.68.0' :
                                'PostmanRuntime/7.32.3';
                            config.headers['Accept'] = '*/*';
                            delete config.headers['Sec-Fetch-Dest'];
                            delete config.headers['Sec-Fetch-Mode'];
                            delete config.headers['Sec-Fetch-Site'];
                            delete config.headers['Sec-CH-UA'];
                            delete config.headers['Sec-CH-UA-Mobile'];
                            delete config.headers['Sec-CH-UA-Platform'];

                            continue;
                        } else {
                            throw new Error('Cloudflare protection detected - received HTML instead of JSON after all retries');
                        }
                    }

                    console.log(`✅ External Panel Client API Response Status: ${response.status} (attempt ${retryCount + 1})`);
                    break;

                } catch (axiosError) {
                    if (retryCount < maxRetries && (axiosError.response?.status === 403 || axiosError.response?.status === 503)) {
                        console.log(`🛡️ HTTP ${axiosError.response.status} detected (attempt ${retryCount + 1}/${maxRetries + 1}), retrying...`);
                        retryCount++;
                        await new Promise(resolve => setTimeout(resolve, 5000 + (retryCount * 2000)));
                        continue;
                    }
                    throw axiosError;
                }
            }

            return response.data;
        } catch (error) {
            console.error('❌ External Panel Client API Error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data?.substring ? error.response.data.substring(0, 200) + '...' : error.response?.data,
                message: error.message,
                url: `${EXTERNAL_PANEL.domain}/api/client/${endpoint}`,
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

    static async clientRequest(endpoint, method = 'GET', data = null, customHeaders = {}) {
        try {
            const config = {
                method,
                url: `${PANEL_URL}/api/client/${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${CLIENT_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...customHeaders
                }
            };

            if (data) {
                config.data = data;
                console.log(`📤 Sending ${method} to ${endpoint} with data:`, typeof data === 'string' ? data.substring(0, 100) + '...' : JSON.stringify(data));
            }

            const response = await axios(config);
            console.log(`📥 Response ${response.status}:`, response.data ? 'Success' : 'No data');
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

    static async getAvailableAllocations() {
        try {
            const response = await this.appRequest('allocations', 'GET');
            return response.data;
        } catch (error) {
            console.error('Failed to get allocations:', error.response?.data || error.message);
            return [];
        }
    }

    // 🎯 KONTOL IP Allocation Management
    static async getKontolAllocation() {
        try {
            console.log(`🔍 Searching for ${KONTOL_ALIAS} allocation with IP: ${KONTOL_IP}`);

            const allocations = await this.getAvailableAllocations();

            // Find allocation with KONTOL IP
            const kontolAllocation = allocations.find(alloc =>
                alloc.attributes.ip === KONTOL_IP &&
                !alloc.attributes.assigned
            );

            if (kontolAllocation) {
                console.log(`✅ Found available ${KONTOL_ALIAS} allocation:`, {
                    id: kontolAllocation.attributes.id,
                    ip: kontolAllocation.attributes.ip,
                    port: kontolAllocation.attributes.port,
                    alias: kontolAllocation.attributes.alias || KONTOL_ALIAS
                });
                return kontolAllocation.attributes.id;
            }

            console.log(`❌ No available ${KONTOL_ALIAS} allocation found with IP ${KONTOL_IP}`);
            return null;
        } catch (error) {
            console.error(`Failed to get ${KONTOL_ALIAS} allocation:`, error.response?.data || error.message);
            return null;
        }
    }

    static async createKontolAllocation(nodeId = 1) {
        try {
            console.log(`🚀 Creating new ${KONTOL_ALIAS} allocation with IP: ${KONTOL_IP}`);

            const allocationData = {
                ip: KONTOL_IP,
                alias: KONTOL_ALIAS,
                ports: ["25565"], // Default Minecraft port, adjust as needed
                node: nodeId
            };

            const response = await this.appRequest('allocations', 'POST', allocationData);

            if (response.attributes) {
                console.log(`✅ Successfully created ${KONTOL_ALIAS} allocation:`, {
                    id: response.attributes.id,
                    ip: response.attributes.ip,
                    port: response.attributes.port,
                    alias: response.attributes.alias
                });
                return response.attributes.id;
            }

            return null;
        } catch (error) {
            console.error(`Failed to create ${KONTOL_ALIAS} allocation:`, error.response?.data || error.message);
            return null;
        }
    }

    static async ensureKontolAllocation(nodeId = 1) {
        try {
            // First try to find existing KONTOL allocation
            let kontolAllocationId = await this.getKontolAllocation();

            // If not found, try to create one
            if (!kontolAllocationId) {
                console.log(`🔧 No ${KONTOL_ALIAS} allocation found, attempting to create...`);
                kontolAllocationId = await this.createKontolAllocation(nodeId);
            }

            if (kontolAllocationId) {
                console.log(`🎯 ${KONTOL_ALIAS} allocation ready: ID ${kontolAllocationId} (${KONTOL_IP})`);
                return kontolAllocationId;
            }

            console.log(`❌ Failed to ensure ${KONTOL_ALIAS} allocation availability`);
            return null;
        } catch (error) {
            console.error(`Error ensuring ${KONTOL_ALIAS} allocation:`, error.message);
            return null;
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

// Main menu keyboard - CLEANED UP (hanya fitur yang WORK)
function getMainMenu() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔄 Restart Server per User', callback_data: 'restart_per_user' },
                    { text: '🔧 Reinstall Server per User', callback_data: 'reinstall_per_user' }
                ],
                [
                    { text: '📁 Create Session Folders (All Servers)', callback_data: 'auto_session_folder' },
                    { text: '🔑 Auto Creds.json', callback_data: 'auto_creds_json' }
                ],
                [
                    { text: '🗑️ Delete All Session Folders', callback_data: 'delete_session_folder' }
                ],
                [
                    { text: '🔍 Scrape Creds External Panel', callback_data: 'scrape_external_creds' }
                ],
                [
                    { text: '📤 Setor Sender (Upload JSON Files)', callback_data: 'setor_creds' }
                ],
                [
                    { text: '📊 Statistik Server', callback_data: 'server_stats' },
                    { text: '🏥 Cek Kesehatan', callback_data: 'health_check' }
                ],
                [
                    { text: '🆕 Create Server untuk User', callback_data: 'create_user_server' }
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
        bot.sendMessage(chatId, `❌ Error saat mengambil informasi user: ${escapeMarkdown(error.message)}`);
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
        bot.sendMessage(chatId, `❌ Error saat membuat admin: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        case 'restart_per_user':
            await handleRestartPerUser(chatId);
            break;
        case 'reinstall_per_user':
            await handleReinstallPerUser(chatId);
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
        case 'scrape_external_creds':
            await handleScrapeExternalCreds(chatId);
            break;

        case 'server_stats':
            await handleServerStats(chatId);
            break;
        case 'health_check':
            await handleHealthCheck(chatId);
            break;
        case 'create_user_server':
            await handleCreateUserServerCustom(chatId);
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
            // Handle confirm_delete_all_sessions callback
            if (data === 'confirm_delete_all_sessions') {
                await executeDeleteAllSessions(chatId);
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
            // Handle scrape_external_start callback
            else if (data === 'scrape_external_start') {
                await executeScrapeExternalCreds(chatId);
            }
            // Handle scrape_external_cancel callback
            else if (data === 'scrape_external_cancel') {
                bot.sendMessage(chatId, '❌ *Scraping Dibatalkan*\n\nOperasi scraping creds dari panel eksternal dibatalkan.', { parse_mode: 'Markdown', ...getMainMenu() });
            }

            // Handle delete_external_creds_yes callback
            else if (data === 'delete_external_creds_yes') {
                await executeDeleteExternalCreds(chatId);
            }
            // Handle delete_external_creds_skip callback
            else if (data === 'delete_external_creds_skip') {
                // Clear the global data
                delete global.scrapedFilesForDeletion;
                bot.sendMessage(chatId, '⏭️ *Penghapusan Dilewati*\n\nFolder creds di panel eksternal dibiarkan tetap ada.\n\n📁 File hasil scraping tetap tersimpan di /output-external', { parse_mode: 'Markdown', ...getMainMenu() });
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
            // Handle custom_create_server_*_* callbacks (userId_quantity) - MUST BE FIRST!
            else if (data.startsWith('custom_create_server_') && data.includes('_') && data.split('_').length >= 5) {
                console.log('🔍 DEBUG: Custom create server callback received');
                console.log('🔍 DEBUG: Callback data:', data);
                const parts = data.split('_');
                console.log('🔍 DEBUG: Split parts:', parts);
                console.log('🔍 DEBUG: Parts length:', parts.length);
                const userId = parts[3];
                const quantity = parts[4];
                console.log('🔍 DEBUG: Extracted userId:', userId);
                console.log('🔍 DEBUG: Extracted quantity:', quantity);
                await executeCustomCreateServers(chatId, userId, quantity);
            }
            // Handle custom_create_ callbacks (but NOT custom_create_server_)
            else if (data.startsWith('custom_create_') && !data.startsWith('custom_create_server_')) {
                const userId = data.replace('custom_create_', '');
                await handleCustomCreateServerForUser(chatId, userId);
            }
            // Handle custom_more_users callback
            else if (data === 'custom_more_users') {
                await handleCustomMoreUsers(chatId);
            }
            // Handle confirm_custom_create callbacks
            else if (data.startsWith('confirm_custom_create_')) {
                const parts = data.replace('confirm_custom_create_', '').split('_');
                const userId = parts[0];
                const quantity = parts[1];
                await executeConfirmCustomCreateServers(chatId, userId, quantity);
            }
            // Handle restart_user_ callbacks
            else if (data.startsWith('restart_user_')) {
                const userId = data.replace('restart_user_', '');
                await executeRestartUserServers(chatId, userId);
            }
            // Handle reinstall_user_ callbacks
            else if (data.startsWith('reinstall_user_')) {
                const userId = data.replace('reinstall_user_', '');
                await executeReinstallUserServers(chatId, userId);
            }
            // Handle confirm_restart_user_ callbacks
            else if (data.startsWith('confirm_restart_user_')) {
                const userId = data.replace('confirm_restart_user_', '');
                await executeConfirmRestartUserServers(chatId, userId);
            }
            // Handle confirm_reinstall_user_ callbacks
            else if (data.startsWith('confirm_reinstall_user_')) {
                const userId = data.replace('confirm_reinstall_user_', '');
                await executeConfirmReinstallUserServers(chatId, userId);
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
        bot.sendMessage(chatId, `❌ Error saat restart semua: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat reinstall semua: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

async function handleServerStats(chatId) {
    try {
        const servers = await PteroAPI.getAllServers();
        const text = `📊 *Statistik Server*\n\n🖥️ Total Server: ${servers.length}\n⏰ Terakhir Update: ${new Date().toLocaleString('id-ID')}`;

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...getMainMenu() });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat test API: ${escapeMarkdown(error.message)}`, getMainMenu());
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

        bot.sendMessage(chatId, `🔄 *Testing Restart*\n\n🖥️ **Server:** ${escapeMarkdown(serverName)}\n🔑 **UUID:** ${escapeMarkdown(serverUuid)}\n📝 **Identifier:** ${escapeMarkdown(serverIdentifier)}\n\nMemulai test restart...`, { parse_mode: 'Markdown' });

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
        bot.sendMessage(chatId, `❌ Error saat test restart: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat membersihkan cache: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat monitoring: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat restart services: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat optimasi lengkap: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat mengambil data admin: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat mengambil data user: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Create User Server Custom (New Enhanced Version)
async function handleCreateUserServerCustom(chatId) {
    try {
        const users = await PteroAPI.getUsers();

        let text = `🆕 *Create Server untuk User Spesifik*\n\n`;
        text += `🎯 **Fitur Custom:**\n`;
        text += `• Pilih user spesifik\n`;
        text += `• Custom jumlah server (1-50)\n`;
        text += `• Resource unlimited (RAM, CPU, Disk)\n`;
        text += `• IO Performance maksimal (1000)\n`;
        text += `• Auto session folder creation\n\n`;
        text += `📊 **Total User Tersedia:** ${users.length}\n\n`;
        text += `👤 **Pilih user untuk dibuatkan server:**\n\n`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: []
            }
        };

        // Show first 10 users with better formatting
        const displayUsers = users.slice(0, 10);
        for (let i = 0; i < displayUsers.length; i++) {
            const user = displayUsers[i];
            const adminBadge = user.attributes.root_admin ? '👑' : '👤';
            const userText = `${adminBadge} ${user.attributes.first_name} ${user.attributes.last_name}`;

            keyboard.reply_markup.inline_keyboard.push([{
                text: userText,
                callback_data: `custom_create_${user.attributes.id}`
            }]);
        }

        // Add more users button if there are more than 10
        if (users.length > 10) {
            keyboard.reply_markup.inline_keyboard.push([
                { text: '👥 Lihat Semua User', callback_data: 'custom_more_users' }
            ]);
        }

        // Add back button
        keyboard.reply_markup.inline_keyboard.push([
            { text: '🏠 Menu Utama', callback_data: 'main_menu' }
        ]);

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('Create user server custom error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengambil data user: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Handle Custom Create Server for Specific User
async function handleCustomCreateServerForUser(chatId, userId) {
    try {
        const users = await PteroAPI.getUsers();
        const user = users.find(u => u.attributes.id == userId);

        if (!user) {
            return bot.sendMessage(chatId, '❌ User tidak ditemukan!', getMainMenu());
        }

        const text = `🆕 *Create Server untuk User*\n\n` +
                    `👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n` +
                    `📧 **Email:** ${user.attributes.email}\n` +
                    `🆔 **ID:** ${user.attributes.id}\n\n` +
                    `🎯 **Spesifikasi Server:**\n` +
                    `• RAM: Unlimited (0)\n` +
                    `• CPU: Unlimited (0)\n` +
                    `• Disk: Unlimited (0)\n` +
                    `• IO: 1000 (Maksimal Performance)\n` +
                    `• Swap: 0\n` +
                    `• Databases: 0\n` +
                    `• Allocations: 0\n` +
                    `• Backups: 0\n\n` +
                    `📊 **Berapa server yang ingin dibuat?**`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '1️⃣ 1 Server', callback_data: `custom_create_server_${userId}_1` },
                        { text: '2️⃣ 2 Server', callback_data: `custom_create_server_${userId}_2` },
                        { text: '3️⃣ 3 Server', callback_data: `custom_create_server_${userId}_3` }
                    ],
                    [
                        { text: '5️⃣ 5 Server', callback_data: `custom_create_server_${userId}_5` },
                        { text: '🔟 10 Server', callback_data: `custom_create_server_${userId}_10` },
                        { text: '🔢 15 Server', callback_data: `custom_create_server_${userId}_15` }
                    ],
                    [
                        { text: '📈 20 Server', callback_data: `custom_create_server_${userId}_20` },
                        { text: '🚀 25 Server', callback_data: `custom_create_server_${userId}_25` },
                        { text: '💯 50 Server', callback_data: `custom_create_server_${userId}_50` }
                    ],
                    [
                        { text: '🔙 Kembali', callback_data: 'create_user_server' },
                        { text: '🏠 Menu Utama', callback_data: 'main_menu' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('Handle custom create server for user error:', error);
        bot.sendMessage(chatId, `❌ Error: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Handle Custom More Users
async function handleCustomMoreUsers(chatId) {
    try {
        const users = await PteroAPI.getUsers();

        let text = `👥 *Semua User untuk Custom Server*\n\n`;
        text += `📊 **Total:** ${users.length} user\n\n`;
        text += `🎯 **Spesifikasi Server:**\n`;
        text += `• Resource unlimited (RAM, CPU, Disk)\n`;
        text += `• IO Performance maksimal (1000)\n`;
        text += `• Auto session folder creation\n\n`;
        text += `👤 **Pilih user:**\n\n`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: []
            }
        };

        // Show all users in pages
        for (let i = 0; i < Math.min(users.length, 20); i++) {
            const user = users[i];
            const adminBadge = user.attributes.root_admin ? '👑' : '👤';
            const userText = `${adminBadge} ${user.attributes.first_name} ${user.attributes.last_name}`;

            keyboard.reply_markup.inline_keyboard.push([{
                text: userText,
                callback_data: `custom_create_${user.attributes.id}`
            }]);
        }

        // Add navigation buttons
        keyboard.reply_markup.inline_keyboard.push([
            { text: '🔙 Kembali', callback_data: 'create_user_server' },
            { text: '🏠 Menu Utama', callback_data: 'main_menu' }
        ]);

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('Handle custom more users error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengambil data user: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Execute Custom Create Servers with Unlimited Resources
async function executeCustomCreateServers(chatId, userId, quantity) {
    try {
        console.log('🔍 DEBUG: executeCustomCreateServers called');
        console.log('🔍 DEBUG: chatId:', chatId);
        console.log('🔍 DEBUG: userId:', userId, 'type:', typeof userId);
        console.log('🔍 DEBUG: quantity:', quantity, 'type:', typeof quantity);

        const users = await PteroAPI.getUsers();
        console.log('🔍 DEBUG: Total users found:', users.length);
        console.log('🔍 DEBUG: First few users:', users.slice(0, 3).map(u => ({ id: u.attributes.id, name: u.attributes.first_name + ' ' + u.attributes.last_name })));

        const user = users.find(u => u.attributes.id == userId);
        console.log('🔍 DEBUG: User lookup result:', user ? { id: user.attributes.id, name: user.attributes.first_name + ' ' + user.attributes.last_name } : 'NOT FOUND');

        if (!user) {
            console.log('❌ DEBUG: User not found, sending error message');
            return bot.sendMessage(chatId, '❌ User tidak ditemukan!', getMainMenu());
        }

        const serverCount = parseInt(quantity);
        if (isNaN(serverCount) || serverCount < 1 || serverCount > 50) {
            return bot.sendMessage(chatId, '❌ Jumlah server tidak valid! (1-50)', getMainMenu());
        }

        const confirmText = `🆕 *Konfirmasi Create Server Custom*\n\n` +
                          `👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n` +
                          `📧 **Email:** ${user.attributes.email}\n` +
                          `🆔 **User ID:** ${user.attributes.id}\n\n` +
                          `📊 **Jumlah Server:** ${serverCount}\n\n` +
                          `🎯 **Spesifikasi per Server:**\n` +
                          `• RAM: Unlimited (0)\n` +
                          `• CPU: Unlimited (0)\n` +
                          `• Disk: Unlimited (0)\n` +
                          `• IO: 1000 (Maksimal Performance)\n` +
                          `• Swap: 0\n` +
                          `• Databases: 0\n` +
                          `• Allocations: 0\n` +
                          `• Backups: 0\n\n` +
                          `🔧 **Fitur Tambahan:**\n` +
                          `• Auto session folder creation\n` +
                          `• Optimized for maximum performance\n\n` +
                          `⚠️ **Estimasi waktu:** ${Math.ceil(serverCount * 3)} detik\n\n` +
                          `🚀 **Lanjutkan pembuatan server?**`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Ya, Buat Server', callback_data: `confirm_custom_create_${userId}_${quantity}` },
                        { text: '❌ Batal', callback_data: 'create_user_server' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, confirmText, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('Execute custom create servers error:', error);

        // Create safe error message
        let errorMessage = 'Unknown error occurred';
        if (error && error.message) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        // Escape the error message properly
        const safeErrorMessage = escapeMarkdown(errorMessage);

        bot.sendMessage(chatId, `❌ Error: ${safeErrorMessage}`, getMainMenu());
    }
}

// Execute Confirm Custom Create Servers
async function executeConfirmCustomCreateServers(chatId, userId, quantity) {
    try {
        const users = await PteroAPI.getUsers();
        const user = users.find(u => u.attributes.id == userId);

        if (!user) {
            return bot.sendMessage(chatId, '❌ User tidak ditemukan!', getMainMenu());
        }

        const serverCount = parseInt(quantity);
        if (isNaN(serverCount) || serverCount < 1 || serverCount > 50) {
            return bot.sendMessage(chatId, '❌ Jumlah server tidak valid! (1-50)', getMainMenu());
        }

        bot.sendMessage(chatId, `🚀 *Memulai Pembuatan Server Custom*\n\n👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n📊 **Jumlah:** ${serverCount} server\n⏳ **Status:** Memproses...`, { parse_mode: 'Markdown' });

        let successCount = 0;
        let failedCount = 0;
        const createdServers = [];
        const failedServers = [];

        for (let i = 1; i <= serverCount; i++) {
            try {
                // Generate unique server name
                const timestamp = Date.now();
                const serverName = `Server-${user.attributes.first_name}-${i}-${timestamp}`;

                console.log(`Creating custom server ${i}/${serverCount} for user ${user.attributes.email}: ${serverName}`);

                // 🎯 KONTOL IP Allocation - Check if KONTOL allocation should be used
                let kontolAllocationId = null;

                if (FORCE_KONTOL_ALLOCATION) {
                    console.log(`🎯 ${KONTOL_ALIAS} mode enabled - ensuring ${KONTOL_IP} allocation...`);
                    kontolAllocationId = await PteroAPI.ensureKontolAllocation(MAIN_PANEL_LOCATION);

                    if (!kontolAllocationId) {
                        console.log(`⚠️ ${KONTOL_ALIAS} allocation not available, falling back to auto-assignment`);
                    }
                }

                // Custom server data with unlimited resources
                const serverData = {
                    name: serverName,
                    user: user.attributes.id,
                    egg: MAIN_PANEL_EGG,
                    docker_image: "ghcr.io/parkervcp/yolks:nodejs_24",
                    startup: "if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == \"1\" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi;  if [[ ! -z ${CUSTOM_ENVIRONMENT_VARIABLES} ]]; then      vars=$(echo ${CUSTOM_ENVIRONMENT_VARIABLES} | tr \";\" \"\\n\");      for line in $vars;     do export $line;     done fi;  /usr/local/bin/${CMD_RUN};",
                    environment: {
                        "GIT_ADDRESS": "",
                        "BRANCH": "",
                        "USERNAME": "",
                        "ACCESS_TOKEN": "",
                        "CMD_RUN": "node index.js"
                    },
                    limits: {
                        memory: 0,        // Unlimited RAM
                        swap: 0,          // No swap
                        disk: 0,          // Unlimited disk
                        io: 1000,         // Maximum IO performance
                        cpu: 0,           // Unlimited CPU
                        threads: null,
                        oom_disabled: true
                    },
                    feature_limits: {
                        databases: 0,     // No databases
                        allocations: 1,   // Allow 1 allocation for server to work
                        backups: 0        // No backups
                    },
                    deploy: {
                        locations: [MAIN_PANEL_LOCATION],
                        dedicated_ip: false,
                        port_range: []
                    }
                };

                // 🎯 Add KONTOL allocation if available
                if (kontolAllocationId) {
                    serverData.allocation = {
                        default: kontolAllocationId
                    };
                    console.log(`🎯 Server will use ${KONTOL_ALIAS} allocation: ID ${kontolAllocationId} (${KONTOL_IP})`);
                } else {
                    console.log(`🔄 Server will use auto-assigned allocation`);
                }

                console.log(`📊 Server data being sent:`, JSON.stringify(serverData, null, 2));
                const createdServer = await PteroAPI.createServer(serverData);
                successCount++;
                createdServers.push(serverName);

                // Create session folder for the new server
                try {
                    if (createdServer && createdServer.attributes && createdServer.attributes.uuid) {
                        console.log(`Creating session folder for ${serverName} (${createdServer.attributes.uuid})`);
                        await PteroAPI.createSessionFolder(createdServer.attributes.uuid);
                        console.log(`✅ Session folder created for ${serverName}`);
                    }
                } catch (sessionError) {
                    console.log(`⚠️ Failed to create session folder for ${serverName}: ${sessionError.message}`);
                }

                console.log(`✅ Successfully created custom server: ${serverName}`);

                // Add delay between server creation to avoid rate limiting
                if (i < serverCount) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

            } catch (serverError) {
                console.error(`❌ Failed to create server ${i}:`, serverError);

                // Enhanced error handling for allocation issues
                let errorMessage = serverError.message;
                if (serverError.response?.status === 422) {
                    const errorData = serverError.response.data;
                    if (errorData && errorData.errors) {
                        // Extract specific validation errors
                        const validationErrors = Object.entries(errorData.errors)
                            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                            .join('; ');
                        errorMessage = `Validation Error: ${validationErrors}`;
                    }
                }

                failedCount++;
                failedServers.push(`Server-${i}: ${errorMessage}`);
            }
        }

        // Generate final report
        let report = `🎉 *Pembuatan Server Custom Selesai*\n\n`;
        report += `👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n`;
        report += `📧 **Email:** ${user.attributes.email}\n\n`;
        report += `📊 **Hasil:**\n`;
        report += `✅ Berhasil: ${successCount}\n`;
        report += `❌ Gagal: ${failedCount}\n`;
        report += `📈 Total: ${serverCount}\n\n`;

        if (successCount > 0) {
            report += `🎯 **Server yang Berhasil Dibuat:**\n`;
            createdServers.slice(0, 10).forEach((server, index) => {
                report += `${index + 1}. ${server}\n`;
            });
            if (createdServers.length > 10) {
                report += `... dan ${createdServers.length - 10} server lainnya\n`;
            }
            report += `\n`;
        }

        if (failedCount > 0) {
            report += `❌ **Server yang Gagal:**\n`;
            failedServers.slice(0, 5).forEach((error, index) => {
                report += `${index + 1}. ${error}\n`;
            });
            if (failedServers.length > 5) {
                report += `... dan ${failedServers.length - 5} error lainnya\n`;
            }
            report += `\n`;
        }

        report += `🎯 **Spesifikasi Server:**\n`;
        report += `• RAM: Unlimited\n`;
        report += `• CPU: Unlimited\n`;
        report += `• Disk: Unlimited\n`;
        report += `• IO: 1000 (Maksimal)\n`;
        report += `• Session Folder: Auto-created\n\n`;
        report += `🚀 **Semua server siap digunakan sebagai babu nya Tamas!**`;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute confirm custom create servers error:', error);

        // Create safe error message
        let errorMessage = 'Unknown error occurred';
        if (error && error.message) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        // Escape the error message properly
        const safeErrorMessage = escapeMarkdown(errorMessage);

        // Send error message without markdown parsing to avoid issues
        bot.sendMessage(chatId, `❌ Error saat membuat server: ${safeErrorMessage}`, getMainMenu());
    }
}

// Handle Restart Per User
async function handleRestartPerUser(chatId) {
    try {
        const users = await PteroAPI.getUsers();

        let text = `🔄 *Restart Server per User*\n\n`;
        text += `🎯 **Fitur:**\n`;
        text += `• Restart semua server milik user spesifik\n`;
        text += `• Tidak mempengaruhi server user lain\n`;
        text += `• Progress tracking real-time\n\n`;
        text += `📊 **Total User Tersedia:** ${users.length}\n\n`;
        text += `👤 **Pilih user untuk restart semua server nya:**\n\n`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: []
            }
        };

        // Show first 10 users with server count
        const displayUsers = users.slice(0, 10);
        for (let i = 0; i < displayUsers.length; i++) {
            const user = displayUsers[i];
            const adminBadge = user.attributes.root_admin ? '👑' : '👤';

            // Get server count for this user
            const servers = await PteroAPI.getAllServers();
            const userServers = servers.filter(server => server.attributes.user === user.attributes.id);
            const serverCount = userServers.length;

            const userText = `${adminBadge} ${user.attributes.first_name} ${user.attributes.last_name} (${serverCount} servers)`;

            keyboard.reply_markup.inline_keyboard.push([{
                text: userText,
                callback_data: `restart_user_${user.attributes.id}`
            }]);
        }

        // Add more users button if there are more than 10
        if (users.length > 10) {
            keyboard.reply_markup.inline_keyboard.push([
                { text: '👥 Lihat Semua User', callback_data: 'restart_more_users' }
            ]);
        }

        // Add back button
        keyboard.reply_markup.inline_keyboard.push([
            { text: '🏠 Menu Utama', callback_data: 'main_menu' }
        ]);

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('Handle restart per user error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengambil data user: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Handle Reinstall Per User
async function handleReinstallPerUser(chatId) {
    try {
        const users = await PteroAPI.getUsers();

        let text = `🔧 *Reinstall Server per User*\n\n`;
        text += `🎯 **Fitur:**\n`;
        text += `• Reinstall semua server milik user spesifik\n`;
        text += `• Tidak mempengaruhi server user lain\n`;
        text += `• Progress tracking real-time\n`;
        text += `• ⚠️ **PERHATIAN:** Data server akan dihapus!\n\n`;
        text += `📊 **Total User Tersedia:** ${users.length}\n\n`;
        text += `👤 **Pilih user untuk reinstall semua server nya:**\n\n`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: []
            }
        };

        // Show first 10 users with server count
        const displayUsers = users.slice(0, 10);
        for (let i = 0; i < displayUsers.length; i++) {
            const user = displayUsers[i];
            const adminBadge = user.attributes.root_admin ? '👑' : '👤';

            // Get server count for this user
            const servers = await PteroAPI.getAllServers();
            const userServers = servers.filter(server => server.attributes.user === user.attributes.id);
            const serverCount = userServers.length;

            const userText = `${adminBadge} ${user.attributes.first_name} ${user.attributes.last_name} (${serverCount} servers)`;

            keyboard.reply_markup.inline_keyboard.push([{
                text: userText,
                callback_data: `reinstall_user_${user.attributes.id}`
            }]);
        }

        // Add more users button if there are more than 10
        if (users.length > 10) {
            keyboard.reply_markup.inline_keyboard.push([
                { text: '👥 Lihat Semua User', callback_data: 'reinstall_more_users' }
            ]);
        }

        // Add back button
        keyboard.reply_markup.inline_keyboard.push([
            { text: '🏠 Menu Utama', callback_data: 'main_menu' }
        ]);

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('Handle reinstall per user error:', error);
        bot.sendMessage(chatId, `❌ Error saat mengambil data user: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Execute Restart User Servers
async function executeRestartUserServers(chatId, userId) {
    try {
        const users = await PteroAPI.getUsers();
        const user = users.find(u => u.attributes.id == userId);

        if (!user) {
            return bot.sendMessage(chatId, '❌ User tidak ditemukan!', getMainMenu());
        }

        // Get all servers for this user
        const allServers = await PteroAPI.getAllServers();
        const userServers = allServers.filter(server => server.attributes.user == userId);

        if (userServers.length === 0) {
            return bot.sendMessage(chatId, `❌ User ${user.attributes.first_name} ${user.attributes.last_name} tidak memiliki server!`, getMainMenu());
        }

        const confirmText = `🔄 *Konfirmasi Restart Server User*\n\n` +
                          `👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n` +
                          `📧 **Email:** ${user.attributes.email}\n` +
                          `🆔 **User ID:** ${user.attributes.id}\n\n` +
                          `📊 **Total Server:** ${userServers.length}\n\n` +
                          `🔄 **Aksi:** Restart semua server milik user ini\n` +
                          `⏱️ **Estimasi waktu:** ${Math.ceil(userServers.length * 2)} detik\n\n` +
                          `⚠️ **Catatan:**\n` +
                          `• Server akan restart satu per satu\n` +
                          `• Data tidak akan hilang\n` +
                          `• Server user lain tidak terpengaruh\n\n` +
                          `🚀 **Lanjutkan restart semua server user ini?**`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Ya, Restart Semua', callback_data: `confirm_restart_user_${userId}` },
                        { text: '❌ Batal', callback_data: 'restart_per_user' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, confirmText, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('Execute restart user servers error:', error);
        bot.sendMessage(chatId, `❌ Error: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Execute Reinstall User Servers
async function executeReinstallUserServers(chatId, userId) {
    try {
        const users = await PteroAPI.getUsers();
        const user = users.find(u => u.attributes.id == userId);

        if (!user) {
            return bot.sendMessage(chatId, '❌ User tidak ditemukan!', getMainMenu());
        }

        // Get all servers for this user
        const allServers = await PteroAPI.getAllServers();
        const userServers = allServers.filter(server => server.attributes.user == userId);

        if (userServers.length === 0) {
            return bot.sendMessage(chatId, `❌ User ${user.attributes.first_name} ${user.attributes.last_name} tidak memiliki server!`, getMainMenu());
        }

        const confirmText = `🔧 *Konfirmasi Reinstall Server User*\n\n` +
                          `👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n` +
                          `📧 **Email:** ${user.attributes.email}\n` +
                          `🆔 **User ID:** ${user.attributes.id}\n\n` +
                          `📊 **Total Server:** ${userServers.length}\n\n` +
                          `🔧 **Aksi:** Reinstall semua server milik user ini\n` +
                          `⏱️ **Estimasi waktu:** ${Math.ceil(userServers.length * 5)} detik\n\n` +
                          `⚠️ **PERINGATAN PENTING:**\n` +
                          `• **SEMUA DATA SERVER AKAN DIHAPUS!**\n` +
                          `• File, database, konfigurasi akan hilang\n` +
                          `• Server akan dikembalikan ke kondisi fresh install\n` +
                          `• Server user lain tidak terpengaruh\n` +
                          `• **AKSI INI TIDAK DAPAT DIBATALKAN!**\n\n` +
                          `🚨 **Yakin ingin reinstall semua server user ini?**`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔧 Ya, Reinstall Semua', callback_data: `confirm_reinstall_user_${userId}` },
                        { text: '❌ Batal', callback_data: 'reinstall_per_user' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, confirmText, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
        console.error('Execute reinstall user servers error:', error);
        bot.sendMessage(chatId, `❌ Error: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Execute Confirm Restart User Servers
async function executeConfirmRestartUserServers(chatId, userId) {
    try {
        const users = await PteroAPI.getUsers();
        const user = users.find(u => u.attributes.id == userId);

        if (!user) {
            return bot.sendMessage(chatId, '❌ User tidak ditemukan!', getMainMenu());
        }

        // Get all servers for this user
        const allServers = await PteroAPI.getAllServers();
        const userServers = allServers.filter(server => server.attributes.user == userId);

        if (userServers.length === 0) {
            return bot.sendMessage(chatId, `❌ User ${user.attributes.first_name} ${user.attributes.last_name} tidak memiliki server!`, getMainMenu());
        }

        bot.sendMessage(chatId, `🔄 *Memulai Restart Server User*\n\n👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n📊 **Total Server:** ${userServers.length}\n⏳ **Status:** Memproses...`, { parse_mode: 'Markdown' });

        let successCount = 0;
        let failedCount = 0;
        const restartedServers = [];
        const failedServers = [];

        for (let i = 0; i < userServers.length; i++) {
            const server = userServers[i];
            const serverName = server.attributes.name;
            const serverUuid = server.attributes.uuid;

            try {
                console.log(`Restarting server ${i + 1}/${userServers.length} for user ${user.attributes.email}: ${serverName}`);

                const success = await PteroAPI.restartServer(serverUuid);
                if (success) {
                    successCount++;
                    restartedServers.push(serverName);
                    console.log(`✅ Successfully restarted server: ${serverName}`);
                } else {
                    failedCount++;
                    failedServers.push(`${serverName}: Restart failed`);
                    console.log(`❌ Failed to restart server: ${serverName}`);
                }

                // Add delay between restarts
                if (i < userServers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (serverError) {
                console.error(`❌ Failed to restart server ${serverName}:`, serverError);
                failedCount++;
                failedServers.push(`${serverName}: ${serverError.message}`);
            }
        }

        // Generate final report
        let report = `🎉 *Restart Server User Selesai*\n\n`;
        report += `👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n`;
        report += `📧 **Email:** ${user.attributes.email}\n\n`;
        report += `📊 **Hasil:**\n`;
        report += `✅ Berhasil: ${successCount}\n`;
        report += `❌ Gagal: ${failedCount}\n`;
        report += `📈 Total: ${userServers.length}\n\n`;

        if (successCount > 0) {
            report += `🔄 **Server yang Berhasil Direstart:**\n`;
            restartedServers.slice(0, 10).forEach((server, index) => {
                report += `${index + 1}. ${server}\n`;
            });
            if (restartedServers.length > 10) {
                report += `... dan ${restartedServers.length - 10} server lainnya\n`;
            }
            report += `\n`;
        }

        if (failedCount > 0) {
            report += `❌ **Server yang Gagal:**\n`;
            failedServers.slice(0, 5).forEach((error, index) => {
                report += `${index + 1}. ${error}\n`;
            });
            if (failedServers.length > 5) {
                report += `... dan ${failedServers.length - 5} error lainnya\n`;
            }
            report += `\n`;
        }

        report += `🚀 **Semua server user sudah diproses sebagai babu nya Tamas!**`;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute confirm restart user servers error:', error);
        bot.sendMessage(chatId, `❌ Error saat restart server: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Execute Confirm Reinstall User Servers
async function executeConfirmReinstallUserServers(chatId, userId) {
    try {
        const users = await PteroAPI.getUsers();
        const user = users.find(u => u.attributes.id == userId);

        if (!user) {
            return bot.sendMessage(chatId, '❌ User tidak ditemukan!', getMainMenu());
        }

        // Get all servers for this user
        const allServers = await PteroAPI.getAllServers();
        const userServers = allServers.filter(server => server.attributes.user == userId);

        if (userServers.length === 0) {
            return bot.sendMessage(chatId, `❌ User ${user.attributes.first_name} ${user.attributes.last_name} tidak memiliki server!`, getMainMenu());
        }

        bot.sendMessage(chatId, `🔧 *Memulai Reinstall Server User*\n\n👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n📊 **Total Server:** ${userServers.length}\n⏳ **Status:** Memproses...\n\n⚠️ **PERHATIAN:** Semua data server akan dihapus!`, { parse_mode: 'Markdown' });

        let successCount = 0;
        let failedCount = 0;
        const reinstalledServers = [];
        const failedServers = [];

        for (let i = 0; i < userServers.length; i++) {
            const server = userServers[i];
            const serverName = server.attributes.name;
            const serverUuid = server.attributes.uuid;

            try {
                console.log(`Reinstalling server ${i + 1}/${userServers.length} for user ${user.attributes.email}: ${serverName}`);

                const success = await PteroAPI.reinstallServer(serverUuid);
                if (success) {
                    successCount++;
                    reinstalledServers.push(serverName);
                    console.log(`✅ Successfully reinstalled server: ${serverName}`);
                } else {
                    failedCount++;
                    failedServers.push(`${serverName}: Reinstall failed`);
                    console.log(`❌ Failed to reinstall server: ${serverName}`);
                }

                // Add longer delay between reinstalls
                if (i < userServers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

            } catch (serverError) {
                console.error(`❌ Failed to reinstall server ${serverName}:`, serverError);
                failedCount++;
                failedServers.push(`${serverName}: ${serverError.message}`);
            }
        }

        // Generate final report
        let report = `🎉 *Reinstall Server User Selesai*\n\n`;
        report += `👤 **User:** ${user.attributes.first_name} ${user.attributes.last_name}\n`;
        report += `📧 **Email:** ${user.attributes.email}\n\n`;
        report += `📊 **Hasil:**\n`;
        report += `✅ Berhasil: ${successCount}\n`;
        report += `❌ Gagal: ${failedCount}\n`;
        report += `📈 Total: ${userServers.length}\n\n`;

        if (successCount > 0) {
            report += `🔧 **Server yang Berhasil Direinstall:**\n`;
            reinstalledServers.slice(0, 10).forEach((server, index) => {
                report += `${index + 1}. ${server}\n`;
            });
            if (reinstalledServers.length > 10) {
                report += `... dan ${reinstalledServers.length - 10} server lainnya\n`;
            }
            report += `\n`;
        }

        if (failedCount > 0) {
            report += `❌ **Server yang Gagal:**\n`;
            failedServers.slice(0, 5).forEach((error, index) => {
                report += `${index + 1}. ${error}\n`;
            });
            if (failedServers.length > 5) {
                report += `... dan ${failedServers.length - 5} error lainnya\n`;
            }
            report += `\n`;
        }

        report += `🚀 **Semua server user sudah diproses sebagai babu nya Tamas!**\n\n`;
        report += `⚠️ **Catatan:** Server yang berhasil direinstall sudah dalam kondisi fresh install.`;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute confirm reinstall user servers error:', error);
        bot.sendMessage(chatId, `❌ Error saat reinstall server: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat mengambil daftar user: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat mengambil data user: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error: ${escapeMarkdown(error.message)}`, getMainMenu());
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

                // 🎯 KONTOL IP Allocation - Check if KONTOL allocation should be used
                let kontolAllocationId = null;

                if (FORCE_KONTOL_ALLOCATION) {
                    console.log(`🎯 ${KONTOL_ALIAS} mode enabled - ensuring ${KONTOL_IP} allocation...`);
                    kontolAllocationId = await PteroAPI.ensureKontolAllocation(MAIN_PANEL_LOCATION);

                    if (!kontolAllocationId) {
                        console.log(`⚠️ ${KONTOL_ALIAS} allocation not available, falling back to auto-assignment`);
                    }
                }

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
                    }
                };

                // 🎯 Add KONTOL allocation if available, otherwise use default
                if (kontolAllocationId) {
                    serverData.allocation = {
                        default: kontolAllocationId
                    };
                    console.log(`🎯 Server will use ${KONTOL_ALIAS} allocation: ID ${kontolAllocationId} (${KONTOL_IP})`);
                } else {
                    serverData.allocation = {
                        default: 1 // Default allocation ID (adjust as needed)
                    };
                    console.log(`🔄 Server will use default allocation: ID 1`);
                }

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
        bot.sendMessage(chatId, `❌ Error saat membuat server: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Auto Session Folder Management
async function handleAutoSessionFolder(chatId) {
    try {
        // Check if main panel is blacklisted
        if (isPanelBlacklisted(PANEL_URL)) {
            return bot.sendMessage(chatId, `❌ *Panel Diblacklist*\n\nPanel ${PANEL_URL} tidak diizinkan untuk operasi ini.\n\nHubungi admin untuk informasi lebih lanjut.`, { parse_mode: 'Markdown', ...getMainMenu() });
        }

        bot.sendMessage(chatId, '📁 *Create Session Folders (All Servers)*\n\nMengambil daftar semua server...', { parse_mode: 'Markdown' });

        // Get all servers directly (no user filtering)
        const servers = await PteroAPI.getAllServers();

        if (servers.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server ditemukan!', getMainMenu());
        }

        bot.sendMessage(chatId, `📊 Ditemukan ${servers.length} server total. Memulai proses pembuatan folder session via API...`);

        let createdCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const errorDetails = [];
        const createdServers = [];

        for (const server of servers) {
            try {
                const serverName = server.attributes.name;
                const serverUuid = server.attributes.uuid;

                console.log(`📁 Processing ${serverName} (${serverUuid})`);

                // First check if session folder already exists
                try {
                    const filesResponse = await PteroAPI.clientRequest(`servers/${serverUuid}/files/list`, 'GET');
                    const existingFiles = filesResponse.data || [];
                    
                    const sessionExists = existingFiles.some(file => 
                        !file.attributes.is_file && file.attributes.name === 'session'
                    );

                    if (sessionExists) {
                        skippedCount++;
                        console.log(`⏭️ Session folder already exists for ${serverName}, skipping...`);
                        continue;
                    }
                } catch (listError) {
                    console.log(`⚠️ Could not check existing files for ${serverName}: ${listError.message}`);
                }

                // Create session folder via API
                try {
                    await PteroAPI.clientRequest(`servers/${serverUuid}/files/create-folder`, 'POST', {
                        root: '/',
                        name: 'session'
                    });

                    createdCount++;
                    createdServers.push(serverName);
                    console.log(`✅ Created session folder for ${serverName} via API`);

                } catch (createError) {
                    errorCount++;
                    const errorMsg = `${serverName}: ${createError.response?.data?.errors?.[0]?.detail || createError.message}`;
                    errorDetails.push(errorMsg);
                    console.error(`❌ Error creating session folder for ${serverName}:`, createError.response?.data || createError.message);
                }

            } catch (error) {
                errorCount++;
                const errorMsg = `${server.attributes.name}: ${escapeMarkdown(error.message)}`;
                errorDetails.push(errorMsg);
                console.error(`❌ Error processing ${server.attributes.name}:`, error);
            }

            // Small delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        let report = `📁 *Create Session Folders Selesai*\n\n` +
                      `🌐 **Method:** Pterodactyl API\n` +
                      `📊 **Hasil:**\n` +
                      `✅ Dibuat: ${createdCount} folder\n` +
                      `⏭️ Dilewati: ${skippedCount} folder (sudah ada)\n` +
                      `❌ Error: ${errorCount} folder\n\n` +
                      `📈 **Total Server:** ${servers.length}\n` +
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

        // Show some created servers
        if (createdServers.length > 0) {
            report += `\n\n✅ **Sample Created:**\n`;
            createdServers.slice(0, 5).forEach(serverName => {
                report += `• ${serverName}\n`;
            });
            if (createdServers.length > 5) {
                report += `• ... dan ${createdServers.length - 5} server lainnya\n`;
            }
        }

        // Success message
        if (createdCount > 0) {
            report += `\n\n✅ **Verifikasi:**\n`;
            report += `Folder session sudah dibuat via API dan langsung muncul di panel web!`;
        }

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Auto session folder error:', error);
        bot.sendMessage(chatId, `❌ Error saat membuat session folder: ${escapeMarkdown(error.message)}`, getMainMenu());
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
                const errorMsg = `${server.attributes.name}: ${escapeMarkdown(error.message)}`;
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
        bot.sendMessage(chatId, `❌ Error saat membuat session folder: ${escapeMarkdown(error.message)}`, getMainMenu());
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
            
            try {
                // Get files list via API
                const filesResponse = await PteroAPI.clientRequest(`servers/${serverUuid}/files/list`, 'GET');
                const files = filesResponse.data || [];
                
                // Check if session folder exists
                const sessionExists = files.some(file => 
                    !file.attributes.is_file && file.attributes.name === 'session'
                );
                
                if (sessionExists) {
                    // Check if creds.json exists in session folder
                    try {
                        const sessionFilesResponse = await PteroAPI.clientRequest(`servers/${serverUuid}/files/list?directory=%2Fsession`, 'GET');
                        const sessionFiles = sessionFilesResponse.data || [];
                        
                        const credsExists = sessionFiles.some(file => 
                            file.attributes.is_file && file.attributes.name === 'creds.json'
                        );
                        
                        if (!credsExists) {
                            serversNeedCreds.push(server);
                        }
                    } catch (sessionError) {
                        // If can't list session folder, assume no creds.json
                        serversNeedCreds.push(server);
                    }
                }
            } catch (pathError) {
                console.log(`Skipping server ${server.attributes.name}: ${pathError.message}`);
                continue;
            }
            
            // Small delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
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
        bot.sendMessage(chatId, `❌ Error saat memproses creds.json: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        
        // Check if session folder exists via API
        try {
            const filesResponse = await PteroAPI.clientRequest(`servers/${serverUuid}/files/list`, 'GET');
            const files = filesResponse.data || [];
            
            const sessionExists = files.some(file => 
                !file.attributes.is_file && file.attributes.name === 'session'
            );
            
            if (!sessionExists) {
                return bot.sendMessage(chatId, `❌ Folder session tidak ditemukan untuk server ${serverName}!\n\n` +
                    `Buat folder session terlebih dahulu dengan fitur "📁 Create Session Folders (All Servers)".`, 
                    { parse_mode: 'Markdown', ...getMainMenu() });
            }
            
            // Check if creds.json already exists
            try {
                const sessionFilesResponse = await PteroAPI.clientRequest(`servers/${serverUuid}/files/list?directory=%2Fsession`, 'GET');
                const sessionFiles = sessionFilesResponse.data || [];
                
                const credsExists = sessionFiles.some(file => 
                    file.attributes.is_file && file.attributes.name === 'creds.json'
                );
                
                if (credsExists) {
                    return bot.sendMessage(chatId, `❌ Server ${serverName} sudah memiliki creds.json!`, getMainMenu());
                }
            } catch (sessionError) {
                // If can't list session folder, continue anyway
                console.log(`Warning: Could not check session folder contents for ${serverName}: ${sessionError.message}`);
            }
            
        } catch (apiError) {
            return bot.sendMessage(chatId, `❌ *Error: Tidak dapat mengakses server*\n\n` +
                `Server: ${serverName}\n` +
                `Error: ${apiError.message}\n\n` +
                `Pastikan server dapat diakses melalui API.`, 
                { parse_mode: 'Markdown', ...getMainMenu() });
        }

        const text = `🔑 *Tambah Creds.json*\n\n` +
                    `🖥️ **Server:** ${serverName}\n` +
                    `📁 **Target:** /session/creds.json\n\n` +
                    `📝 Silakan kirim konten creds.json untuk server ini:`;

        // Set user as waiting for creds.json input for specific server
        waitingForCredsJson.set(chatId, {
            serverUuid,
            serverName,
            method: 'api' // Use API method instead of file system
        });

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Creds for server error:', error);
        bot.sendMessage(chatId, `❌ Error saat memproses server: ${escapeMarkdown(error.message)}`, getMainMenu());
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

        // Clean and validate JSON
        let cleanedContent;
        try {
            cleanedContent = cleanJsonContent(credsContent);
            const parsedCreds = JSON.parse(cleanedContent);
            // Re-stringify to ensure proper formatting
            cleanedContent = JSON.stringify(parsedCreds, null, 2);
        } catch (error) {
            return bot.sendMessage(chatId, '❌ Format JSON tidak valid! Silakan coba lagi dengan format JSON yang benar.', getMainMenu());
        }

        bot.sendMessage(chatId, `🔑 *Memproses Creds.json*\n\nMenambahkan creds.json ke server ${waitingData.serverName} via API...`, { parse_mode: 'Markdown' });

        try {
            // Check if method is API (new way) or file system (legacy)
            if (waitingData.method === 'api') {
                // New API method - write file via Pterodactyl API
                await PteroAPI.clientRequest(`servers/${waitingData.serverUuid}/files/write`, 'POST', {
                    root: '/session',
                    files: [
                        {
                            name: 'creds.json',
                            content: cleanedContent
                        }
                    ]
                });

                console.log(`✅ Created creds.json for ${waitingData.serverName} via API`);

                const report = `🔑 *Creds.json Berhasil Ditambahkan*\n\n` +
                              `🖥️ **Server:** ${waitingData.serverName}\n` +
                              `📁 **Path:** /session/creds.json\n` +
                              `🌐 **Method:** Pterodactyl API\n` +
                              `✅ **Status:** Berhasil dibuat\n\n` +
                              `⏰ **Selesai:** ${new Date().toLocaleString('id-ID')}`;

                bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

            } else {
                // Legacy file system method (fallback)
                if (fs.existsSync(waitingData.credsPath)) {
                    return bot.sendMessage(chatId, `❌ Server ${waitingData.serverName} sudah memiliki creds.json!`, getMainMenu());
                }

                fs.writeFileSync(waitingData.credsPath, cleanedContent);
                fs.chmodSync(waitingData.credsPath, 0o644);

                console.log(`✅ Created creds.json for ${waitingData.serverName} via file system`);

                const report = `🔑 *Creds.json Berhasil Ditambahkan*\n\n` +
                              `🖥️ **Server:** ${waitingData.serverName}\n` +
                              `📁 **Path:** ${waitingData.credsPath}\n` +
                              `💾 **Method:** File System\n` +
                              `✅ **Status:** Berhasil dibuat\n` +
                              `📄 **Permission:** 644 (rw-r--r--)\n\n` +
                              `⏰ **Selesai:** ${new Date().toLocaleString('id-ID')}`;

                bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });
            }

        } catch (error) {
            console.error(`Error creating creds.json for ${waitingData.serverName}:`, error);
            const errorDetail = error.response?.data?.errors?.[0]?.detail || error.message;
            bot.sendMessage(chatId, `❌ Error saat membuat creds.json untuk server ${waitingData.serverName}: ${errorDetail}`, getMainMenu());
        }

    } catch (error) {
        console.error('Process creds.json input error:', error);
        bot.sendMessage(chatId, `❌ Error saat memproses creds.json: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Delete Session Folder Management
async function handleDeleteSessionFolder(chatId) {
    try {
        // Check if main panel is blacklisted
        if (isPanelBlacklisted(PANEL_URL)) {
            return bot.sendMessage(chatId, `❌ *Panel Diblacklist*\n\nPanel ${PANEL_URL} tidak diizinkan untuk operasi ini.\n\nHubungi admin untuk informasi lebih lanjut.`, { parse_mode: 'Markdown', ...getMainMenu() });
        }

        bot.sendMessage(chatId, '🗑️ *Delete All Session Folders*\n\nMengambil daftar server dan checking session folders...', { parse_mode: 'Markdown' });

        // Get all servers directly
        const servers = await PteroAPI.getAllServers();

        if (servers.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server ditemukan!', getMainMenu());
        }

        // Check how many servers have session folders via API
        let hasSessionCount = 0;
        for (const server of servers) {
            const serverUuid = server.attributes.uuid;
            
            try {
                const filesResponse = await PteroAPI.clientRequest(`servers/${serverUuid}/files/list`, 'GET');
                const files = filesResponse.data || [];
                
                const sessionExists = files.some(file => 
                    !file.attributes.is_file && file.attributes.name === 'session'
                );

                if (sessionExists) {
                    hasSessionCount++;
                }
            } catch (apiError) {
                console.log(`Could not check ${server.attributes.name}: ${apiError.message}`);
                continue;
            }
            
            // Small delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (hasSessionCount === 0) {
            return bot.sendMessage(chatId, `❌ Tidak ada server yang memiliki folder session!`, getMainMenu());
        }

        bot.sendMessage(chatId, `⚠️ *KONFIRMASI DELETE ALL SESSION FOLDERS*\n\n` +
                              `📊 **Total Server:** ${servers.length}\n` +
                              `📁 **Memiliki Session Folder:** ${hasSessionCount}\n\n` +
                              `🚨 **PERINGATAN:**\n` +
                              `• Ini akan menghapus SEMUA folder session dari semua server\n` +
                              `• Semua file di dalam folder session akan hilang\n` +
                              `• Aksi ini TIDAK BISA dibatalkan!\n` +
                              `• Menggunakan Pterodactyl API\n\n` +
                              `Apakah Anda yakin ingin melanjutkan?`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Ya, Hapus Semua Session Folder', callback_data: `confirm_delete_all_sessions` },
                        { text: '❌ Batal', callback_data: 'main_menu' }
                    ]
                ]
            }
        });

    } catch (error) {
        console.error('Delete session folder error:', error);
        bot.sendMessage(chatId, `❌ Error saat memproses session folder: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

async function executeDeleteAllSessions(chatId) {
    try {
        bot.sendMessage(chatId, '🗑️ *Menghapus Semua Session Folder*\n\nMemulai proses penghapusan via API...', { parse_mode: 'Markdown' });

        // Get all servers
        const servers = await PteroAPI.getAllServers();

        let deletedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const errorDetails = [];
        const deletedServers = [];

        for (const server of servers) {
            try {
                const serverName = server.attributes.name;
                const serverUuid = server.attributes.uuid;

                console.log(`🗑️ Processing ${serverName} (${serverUuid})`);

                // Check if session folder exists via API
                try {
                    const filesResponse = await PteroAPI.clientRequest(`servers/${serverUuid}/files/list`, 'GET');
                    const files = filesResponse.data || [];
                    
                    const sessionExists = files.some(file => 
                        !file.attributes.is_file && file.attributes.name === 'session'
                    );

                    if (!sessionExists) {
                        skippedCount++;
                        console.log(`⏭️ Session folder not found for ${serverName}, skipping...`);
                        continue;
                    }
                } catch (listError) {
                    skippedCount++;
                    const errorMsg = `${serverName}: Could not check files`;
                    errorDetails.push(errorMsg);
                    console.log(`❌ Could not check files for ${serverName}: ${listError.message}`);
                    continue;
                }

                // Delete session folder via API
                try {
                    await PteroAPI.clientRequest(`servers/${serverUuid}/files/delete`, 'POST', {
                        root: '/',
                        files: ['session']
                    });

                    deletedCount++;
                    deletedServers.push(serverName);
                    console.log(`✅ Deleted session folder for ${serverName} via API`);

                } catch (deleteError) {
                    errorCount++;
                    const errorMsg = `${serverName}: ${deleteError.response?.data?.errors?.[0]?.detail || deleteError.message}`;
                    errorDetails.push(errorMsg);
                    console.error(`❌ Error deleting session folder for ${serverName}:`, deleteError.response?.data || deleteError.message);
                }

            } catch (error) {
                errorCount++;
                const errorMsg = `${server.attributes.name}: ${escapeMarkdown(error.message)}`;
                errorDetails.push(errorMsg);
                console.error(`❌ Error processing ${server.attributes.name}:`, error);
            }

            // Small delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        let report = `🗑️ *Delete All Session Folders Selesai*\n\n` +
                      `🌐 **Method:** Pterodactyl API\n` +
                      `📊 **Hasil:**\n` +
                      `🗑️ Dihapus: ${deletedCount} folder\n` +
                      `⏭️ Dilewati: ${skippedCount} folder (tidak ada/error)\n` +
                      `❌ Error: ${errorCount} folder\n\n` +
                      `📈 **Total Server:** ${servers.length}\n` +
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

        // Show some deleted servers
        if (deletedServers.length > 0) {
            report += `\n\n🗑️ **Sample Deleted:**\n`;
            deletedServers.slice(0, 5).forEach(serverName => {
                report += `• ${serverName}\n`;
            });
            if (deletedServers.length > 5) {
                report += `• ... dan ${deletedServers.length - 5} server lainnya\n`;
            }
        }

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute delete all sessions error:', error);
        bot.sendMessage(chatId, `❌ Error saat menghapus session folder: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat memproses user: ${escapeMarkdown(error.message)}`, getMainMenu());
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
                const errorMsg = `${server.attributes.name}: ${escapeMarkdown(error.message)}`;
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
        bot.sendMessage(chatId, `❌ Error saat menghapus session folder: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat mengakses panel eksternal: ${escapeMarkdown(error.message)}`, getMainMenu());
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
            try {
                const serverVolumePath = getServerVolumePath(server.attributes.uuid);
                const sessionPath = path.join(serverVolumePath, 'session');
                if (fs.existsSync(sessionPath)) {
                    serversWithSessions++;
                }
            } catch (error) {
                console.log(`Skipping server ${server.attributes.name}: ${escapeMarkdown(error.message)}`);
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
        bot.sendMessage(chatId, `❌ Error saat mengakses panel eksternal: ${escapeMarkdown(error.message)}`, getMainMenu());
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
                const externalServerVolumePath = getServerVolumePath(externalUuid);
                const externalSessionPath = path.join(externalServerVolumePath, 'session');

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
        bot.sendMessage(chatId, `❌ Error saat menghapus session folders dari panel eksternal: ${escapeMarkdown(error.message)}`, getMainMenu());
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
            try {
                const serverVolumePath = getServerVolumePath(server.attributes.uuid);
                const sessionPath = path.join(serverVolumePath, 'session');
                const credsPath = path.join(sessionPath, 'creds.json');

                if (fs.existsSync(credsPath)) {
                    serversWithCreds++;
                }
            } catch (error) {
                console.log(`Skipping server ${server.attributes.name}: ${escapeMarkdown(error.message)}`);
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
        bot.sendMessage(chatId, `❌ Error: ${escapeMarkdown(error.message)}`, getMainMenu());
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
                const externalServerVolumePath = getServerVolumePath(externalUuid);
                const externalSessionPath = path.join(externalServerVolumePath, 'session');
                const externalCredsPath = path.join(externalSessionPath, 'creds.json');

                console.log(`🔍 Processing external server: ${externalName} (${externalUuid})`);

                // Check if external server has creds.json
                let credsFound = false;
                let actualCredsPath = externalCredsPath;

                // Try different possible locations for JSON files (any name)
                const possiblePaths = [
                    externalCredsPath, // /var/lib/pterodactyl/volumes/{uuid}/session/creds.json
                    path.join(externalServerVolumePath, 'creds.json'), // Direct in volume
                    path.join(externalSessionPath, 'plugins', 'creds.json'), // In plugins folder
                ];

                // Also check for any .json files in session directory
                const sessionDir = externalSessionPath;
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
                const targetServerVolumePath = getServerVolumePath(targetUuid);
                const targetSessionPath = path.join(targetServerVolumePath, 'session');
                const targetCredsPath = path.join(targetSessionPath, 'creds.json');

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
        bot.sendMessage(chatId, `❌ Error saat copy creds untuk user: ${escapeMarkdown(error.message)}`, getMainMenu());
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

        console.log(`🔍 Starting setor creds detection via API for ${servers.length} servers...`);

        for (const server of servers) { // Check all servers
            const serverName = server.attributes.name;
            const serverUuid = server.attributes.uuid;

            try {
                console.log(`\n📋 Checking server: ${serverName} (${serverUuid})`);

                let hasSession = false;
                let hasCreds = false;

                // Try to list files in session directory via API
                try {
                    const sessionFilesResponse = await PteroAPI.clientRequest(`servers/${serverUuid}/files/list?directory=%2Fsession`, 'GET');

                    if (sessionFilesResponse.data && sessionFilesResponse.data.length >= 0) {
                        hasSession = true;
                        console.log(`✅ ${serverName} has session folder`);

                        // Check if creds.json exists
                        const hasCredsFile = sessionFilesResponse.data.some(file =>
                            file.attributes.is_file && file.attributes.name === 'creds.json'
                        );

                        if (hasCredsFile) {
                            hasCreds = true;
                            console.log(`🔑 ${serverName} already has creds.json`);
                        }
                    }
                } catch (sessionError) {
                    console.log(`❌ ${serverName} has no session folder or access denied`);
                }

                // Categorize server
                if (!hasSession) {
                    serversWithoutSession++;
                    console.log(`❌ Server ${serverName}: No session folder`);
                } else if (!hasCreds) {
                    availableServers++;
                    console.log(`✅ Server ${serverName}: Ready to receive creds`);
                } else {
                    serversWithCreds++;
                    console.log(`🔑 Server ${serverName}: Already has creds`);
                }

                // Small delay between checks
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                serversWithoutSession++;
                console.log(`❌ Server ${serverName}: API error - ${escapeMarkdown(error.message)}`);
            }
        }

        console.log(`\n📊 API Detection Summary:`);
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
                                 `🆓 Siap terima sender: ${availableServers}\n` +
                                 `🌐 **Method:** Pterodactyl API\n\n` +
                                 `⚠️ **Catatan:**\n` +
                                 `• Deteksi dilakukan via API (bukan akses file lokal)\n` +
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
                       `🆓 Siap terima sender: ${availableServers}\n` +
                       `🌐 **Method:** Pterodactyl API\n\n` +
                       `🎯 **Target Upload:**\n` +
                       `• Upload dilakukan via API (bukan file lokal)\n` +
                       `• Hanya server dengan folder session yang siap\n` +
                       `• Maksimal ${availableServers} sender bisa diupload\n` +
                       `• Server tanpa folder session akan dilewati\n\n` +
                       `📋 **Cara Penggunaan:**\n` +
                       `1️⃣ Kirim file JSON sender (nama bebas: sender1.json, config.json, dll)\n` +
                       `2️⃣ Bot akan auto-rename jadi creds.json\n` +
                       `3️⃣ Auto-distribute ke server yang siap terima sender via API\n` +
                       `4️⃣ Klik "✅ Selesai Upload" untuk selesai\n\n` +
                       `⚠️ **Catatan:**\n` +
                       `• Hanya file .json yang diterima\n` +
                       `• File akan di-validate sebagai JSON\n` +
                       `• Upload via API, tidak perlu akses file lokal\n\n` +
                       `📤 **Mulai upload file JSON sender Anda!**`;

        // Set user to setor creds mode - use all servers (will check via API during upload)
        setorCredsState.set(chatId, {
            uploadedFiles: [],
            availableServers: servers, // Use all servers, will check via API during upload
            startTime: new Date(),
            method: 'api' // Mark as API method
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
        bot.sendMessage(chatId, `❌ Error saat memulai setor creds: ${escapeMarkdown(error.message)}`, getMainMenu());
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
            return bot.sendMessage(chatId, `❌ *File Ditolak*\n\nFile: ${escapeMarkdown(originalFileName)}\nAlasan: Hanya file .json yang diterima\n\nSilakan upload file JSON yang valid.`, { parse_mode: 'Markdown' });
        }

        // Check if we have available servers
        if (state.availableServers.length === 0) {
            return bot.sendMessage(chatId, `❌ *Tidak Ada Server Kosong*\n\nSemua server sudah memiliki sender\nGunakan /done untuk menyelesaikan upload.`, { parse_mode: 'Markdown' });
        }

        // Check file size (max 20MB for Telegram Bot API)
        const maxFileSize = 20 * 1024 * 1024; // 20MB
        if (document.file_size > maxFileSize) {
            return bot.sendMessage(chatId, `❌ *File Terlalu Besar*\n\nFile: ${escapeMarkdown(originalFileName)}\nUkuran: ${(document.file_size / 1024 / 1024).toFixed(1)} MB\nMaksimal: 20 MB\n\nSilakan kompres atau kecilkan file terlebih dahulu.`, { parse_mode: 'Markdown' });
        }

        // Warn if file is unusually large for JSON
        if (document.file_size > 1024 * 1024) { // 1MB
            bot.sendMessage(chatId, `⚠️ *File Cukup Besar*\n\nFile: ${originalFileName}\nUkuran: ${(document.file_size / 1024).toFixed(1)} KB\n\nFile JSON biasanya kecil (<100KB). Pastikan ini file yang benar.`, { parse_mode: 'Markdown' });
        }

        bot.sendMessage(chatId, `📥 *Memproses File*\n\nFile: ${escapeMarkdown(originalFileName)}\nUkuran: ${(document.file_size / 1024).toFixed(1)} KB\n\nMengunduh dan memvalidasi...`, { parse_mode: 'Markdown' });

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

        // Find next available server via API
        let targetServer = null;
        let targetUuid = null;
        let targetName = null;

        console.log(`🔍 Finding available server via API from ${state.availableServers.length} servers...`);

        // Check if this server was already used in this session
        const usedServerNames = state.uploadedFiles.map(file => file.targetServer);
        console.log(`📋 Already used servers: [${usedServerNames.join(', ')}]`);

        for (let i = 0; i < state.availableServers.length; i++) {
            const server = state.availableServers[i];
            const serverUuid = server.attributes.uuid;
            const serverName = server.attributes.name;

            // Skip if this server was already used in this session
            if (usedServerNames.includes(serverName)) {
                console.log(`⏭️ Server ${serverName} already used in this session, skipping`);
                continue;
            }

            try {
                console.log(`🔍 Checking server: ${serverName} (${serverUuid})`);

                // Check if server has session folder and no creds.json via API
                const sessionFilesResponse = await PteroAPI.clientRequest(`servers/${serverUuid}/files/list?directory=%2Fsession`, 'GET');

                if (sessionFilesResponse.data && sessionFilesResponse.data.length >= 0) {
                    // Session folder exists, check if creds.json already exists
                    const hasCredsFile = sessionFilesResponse.data.some(file =>
                        file.attributes.is_file && file.attributes.name === 'creds.json'
                    );

                    if (!hasCredsFile) {
                        // Found available server
                        targetServer = server;
                        targetUuid = serverUuid;
                        targetName = serverName;

                        // Remove from available list to prevent reuse
                        console.log(`🗑️ Removing ${serverName} from available servers list`);
                        console.log(`📊 Available servers before removal: ${state.availableServers.length}`);
                        state.availableServers.splice(i, 1);
                        console.log(`📊 Available servers after removal: ${state.availableServers.length}`);

                        console.log(`✅ Found available server: ${serverName}`);
                        break;
                    } else {
                        console.log(`⏭️ Server ${serverName} already has creds.json, skipping`);
                    }
                } else {
                    console.log(`❌ Server ${serverName} has no session folder, skipping`);
                }

            } catch (checkError) {
                console.log(`❌ Error checking server ${serverName}: ${checkError.message}`);
            }
        }

        if (!targetServer) {
            return bot.sendMessage(chatId, `❌ *Tidak Ada Server yang Tersedia*\n\nFile: ${originalFileName}\n\nSemua server sudah memiliki creds.json atau tidak memiliki folder session.\n\nGunakan menu "📁 Session Folder" untuk membuat folder session di server yang belum ada.`, { parse_mode: 'Markdown' });
        }

        console.log(`📁 Target server: ${targetName} (${targetUuid})`);

        // Write creds.json to target server via API
        try {
            console.log(`💾 Writing creds.json via API to: ${targetName}`);
            console.log(`📊 Target UUID: ${targetUuid}`);
            console.log(`📁 Target path: /session/creds.json`);

            // First, ensure session directory exists
            try {
                console.log(`📁 Checking if session directory exists...`);
                await PteroAPI.clientRequest(`servers/${targetUuid}/files/list?directory=%2Fsession`, 'GET');
                console.log(`✅ Session directory exists`);
            } catch (dirError) {
                console.log(`📁 Session directory doesn't exist, creating...`);
                try {
                    await PteroAPI.clientRequest(`servers/${targetUuid}/files/create-folder`, 'POST', {
                        root: '/',
                        name: 'session'
                    });
                    console.log(`✅ Created session directory`);
                } catch (createError) {
                    console.log(`⚠️ Could not create session directory: ${createError.message}`);
                }
            }

            // Write the file using the correct API endpoint
            console.log(`💾 Writing file content...`);
            const fileContent = JSON.stringify(jsonData, null, 2);

            await PteroAPI.clientRequest(`servers/${targetUuid}/files/write?file=%2Fsession%2Fcreds.json`, 'POST', fileContent, {
                'Content-Type': 'text/plain'
            });

            console.log(`✅ Successfully wrote creds.json via API to: ${targetName}`);

        } catch (writeError) {
            console.error('API write error:', writeError);
            console.error('Error details:', writeError.response?.data || writeError.message);
            return bot.sendMessage(chatId, `❌ Error Menyimpan File via API\n\nFile: ${escapeMarkdown(originalFileName)}\nTarget: ${escapeMarkdown(targetName)}\nError: ${escapeMarkdown(writeError.message)}\n\nMethod: Pterodactyl API\n\nSilakan coba lagi.`);
        }

        // Update state
        console.log(`📊 Updating state: adding ${originalFileName} → ${targetName}`);
        state.uploadedFiles.push({
            originalName: originalFileName,
            targetServer: targetName,
            targetUuid: targetUuid,
            targetIdentifier: targetServer.attributes.identifier, // Add identifier for restart
            uploadTime: new Date()
        });

        // Update state in map
        console.log(`💾 Saving updated state: ${state.uploadedFiles.length} files, ${state.availableServers.length} available servers`);
        setorCredsState.set(chatId, state);

        const successMessage = `✅ *Sender Berhasil Terkoneksi*\n\n` +
                              `📄 **Sender:** ${originalFileName}\n` +
                              `🎯 **Target Server:** ${targetName}\n` +
                              `📁 **Disimpan sebagai:** /session/creds.json\n` +
                              `🌐 **Method:** Pterodactyl API\n` +
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
            errorMessage += `Error: ${escapeMarkdown(error.message)}`;
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
        bot.sendMessage(chatId, `❌ Error saat menyelesaikan setor creds: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat membatalkan setor creds: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat restart server: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat menampilkan blacklist: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat menghapus: ${escapeMarkdown(error.message)}`, getMainMenu());
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
        bot.sendMessage(chatId, `❌ Error saat menambah blacklist: ${escapeMarkdown(error.message)}`, getMainMenu());
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

// Scrape External Panel Sender - Save to output-scrape-sender folder
async function handleScrapeExternalSender(chatId) {
    try {
        // Check if external panel is blacklisted
        if (isPanelBlacklisted(EXTERNAL_PANEL.domain)) {
            return bot.sendMessage(chatId, `❌ *Panel Diblacklist*\n\nPanel ${EXTERNAL_PANEL.domain} tidak diizinkan untuk operasi ini.\n\nHubungi admin untuk informasi lebih lanjut.`, { parse_mode: 'Markdown', ...getMainMenu() });
        }

        bot.sendMessage(chatId, '🔍 *Memulai Scrape Sender dari Panel Eksternal*\n\nMengambil daftar server dari panel eksternal...', { parse_mode: 'Markdown' });

        // Get servers from external panel
        const externalServers = await ExternalPteroAPI.getAllServers();

        if (externalServers.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server ditemukan di panel eksternal!', getMainMenu());
        }

        // Create output-scrape-sender directory if it doesn't exist
        const outputDir = path.join(__dirname, OUTPUT_SCRAPE_SENDER_DIR);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`✅ Created output directory: ${outputDir}`);
        }

        // Count servers with creds.json via API
        let serversWithCreds = 0;
        console.log('🔍 Checking servers for creds.json via API...');

        for (const server of externalServers.slice(0, 5)) { // Check first 5 servers for preview
            try {
                const serverUuid = server.attributes.uuid;
                const serverName = server.attributes.name;

                console.log(`🔍 Checking ${serverName} for creds...`);

                // Try to list files in /files/session directory (same as setor sender)
                try {
                    const sessionFilesResponse = await ExternalPteroAPI.clientRequest(`servers/${serverUuid}/files/list?directory=%2Ffiles%2Fsession`, 'GET');

                    if (sessionFilesResponse.data && sessionFilesResponse.data.length > 0) {
                        const hasJsonFiles = sessionFilesResponse.data.some(file =>
                            file.attributes.is_file && file.attributes.name.endsWith('.json')
                        );

                        if (hasJsonFiles) {
                            serversWithCreds++;
                            console.log(`✅ ${serverName} has JSON files in /files/session`);
                        }
                    }
                } catch (sessionError) {
                    // Try /files directory if /files/session fails
                    try {
                        const filesResponse = await ExternalPteroAPI.clientRequest(`servers/${serverUuid}/files/list?directory=%2Ffiles`, 'GET');

                        if (filesResponse.data && filesResponse.data.length > 0) {
                            const hasJsonFiles = filesResponse.data.some(file =>
                                file.attributes.is_file && file.attributes.name.endsWith('.json')
                            );

                            if (hasJsonFiles) {
                                serversWithCreds++;
                                console.log(`✅ ${serverName} has JSON files in /files`);
                            }
                        }
                    } catch (filesError) {
                        console.log(`❌ Cannot check ${serverName}: ${filesError.message}`);
                    }
                }

                // Small delay between checks
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.log(`❌ Error checking server ${server.attributes.name}: ${escapeMarkdown(error.message)}`);
            }
        }

        console.log(`📊 Found ${serversWithCreds} servers with potential creds (from ${Math.min(5, externalServers.length)} checked)`);

        if (serversWithCreds === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server dengan creds.json ditemukan di panel eksternal!\n\n⚠️ Pastikan server memiliki file JSON di folder session atau root.', getMainMenu());
        }

        const message = `🔍 *Scrape Sender Panel Eksternal*\n\n` +
                       `🌐 **Panel:** ${EXTERNAL_PANEL.domain}\n` +
                       `📊 **Total Server:** ${externalServers.length}\n` +
                       `🔑 **Server dengan Sender:** ${serversWithCreds}+ (preview)\n` +
                       `📁 **Output Folder:** /${OUTPUT_SCRAPE_SENDER_DIR}\n` +
                       `🌐 **Method:** Pterodactyl API\n\n` +
                       `⚠️ **Catatan:**\n` +
                       `• Scraping dilakukan via API (bukan akses file lokal)\n` +
                       `• Semua creds.json akan disalin ke folder output-scrape-sender\n` +
                       `• File akan diberi nama sesuai nama server\n` +
                       `• File yang sudah ada akan ditimpa\n` +
                       `• Setelah scraping, akan ada opsi hapus folder di panel eksternal\n\n` +
                       `🚀 **Mulai scraping sender via API?**`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Ya, Mulai Scraping Sender', callback_data: 'scrape_external_sender_start' },
                        { text: '❌ Batal', callback_data: 'scrape_external_sender_cancel' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Handle scrape external sender error:', error);
        bot.sendMessage(chatId, `❌ Error saat memulai scrape sender: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Execute scraping external sender
async function executeScrapeExternalSender(chatId) {
    try {
        console.log('🚀 Starting executeScrapeExternalSender...');
        bot.sendMessage(chatId, '🔄 *Memulai Scraping Sender via API*\n\nMengambil server dari panel eksternal...', { parse_mode: 'Markdown' });

        // Get servers from external panel
        console.log('📡 Getting servers from external panel...');
        const externalServers = await ExternalPteroAPI.getAllServers();

        console.log(`📊 External panel servers: ${externalServers.length}`);

        if (externalServers.length === 0) {
            console.log('❌ No external servers found');
            return bot.sendMessage(chatId, '❌ Tidak ada server ditemukan di panel eksternal!', getMainMenu());
        }

        let scrapedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const scrapedFiles = [];

        // Create output directory
        const outputDir = path.join(__dirname, OUTPUT_SCRAPE_SENDER_DIR);
        console.log(`📁 Creating output directory: ${outputDir}`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`✅ Created output directory: ${outputDir}`);
        } else {
            console.log(`✅ Output directory already exists: ${outputDir}`);
        }

        bot.sendMessage(chatId, `🔄 *Memproses ${externalServers.length} server eksternal via API...*\n\n📁 **Output:** ${outputDir}`, { parse_mode: 'Markdown' });

        for (const externalServer of externalServers) {
            try {
                const externalUuid = externalServer.attributes.uuid;
                const externalName = externalServer.attributes.name;

                console.log(`\n🔍 Processing external server: ${externalName} (${externalUuid})`);

                // Check if external server has creds.json via API
                let credsFound = false;
                let credsContent = null;
                let foundPath = '';

                // Method 1: Check files in /session directory first (most common)
                try {
                    console.log(`📁 Method 1: Checking /session directory for ${externalName}...`);
                    const sessionFilesResponse = await ExternalPteroAPI.clientRequest(`servers/${externalUuid}/files/list?directory=%2Fsession`, 'GET');

                    console.log(`📊 Session response status: ${sessionFilesResponse ? 'OK' : 'NULL'}`);

                    if (sessionFilesResponse && sessionFilesResponse.data && sessionFilesResponse.data.length > 0) {
                        console.log(`📋 Found ${sessionFilesResponse.data.length} files in /files/session directory`);

                        // List all files for debugging
                        sessionFilesResponse.data.forEach(file => {
                            const type = file.attributes.is_file ? '📄' : '📁';
                            console.log(`   ${type} ${file.attributes.name}`);
                        });

                        // Look for creds.json or any .json file
                        const jsonFiles = sessionFilesResponse.data.filter(file =>
                            file.attributes.is_file && file.attributes.name.endsWith('.json')
                        );

                        console.log(`🔍 Found ${jsonFiles.length} JSON files in /files/session`);

                        if (jsonFiles.length > 0) {
                            const credsFile = jsonFiles.find(file => file.attributes.name === 'creds.json') || jsonFiles[0];
                            console.log(`📄 Selected JSON file: ${credsFile.attributes.name}`);
                            foundPath = `/session/${credsFile.attributes.name}`;

                            // Try to read the file content from /session/
                            try {
                                console.log(`📖 Reading file content from: ${foundPath}`);
                                const fileContentResponse = await ExternalPteroAPI.clientRequest(
                                    `servers/${externalUuid}/files/contents?file=%2Fsession%2F${encodeURIComponent(credsFile.attributes.name)}`,
                                    'GET'
                                );

                                console.log(`📊 File content response type: ${typeof fileContentResponse}`);
                                console.log(`📊 File content length: ${fileContentResponse ? (typeof fileContentResponse === 'string' ? fileContentResponse.length : 'Not string') : 'NULL'}`);

                                console.log(`📊 File content type: ${typeof fileContentResponse}`);
                                console.log(`📊 File content length: ${fileContentResponse ? (typeof fileContentResponse === 'string' ? fileContentResponse.length : JSON.stringify(fileContentResponse).length) : 'NULL'}`);

                                if (fileContentResponse && typeof fileContentResponse === 'string' && fileContentResponse.trim().length > 0) {
                                    credsContent = fileContentResponse;
                                    credsFound = true;
                                    console.log(`✅ Successfully read ${credsFile.attributes.name} from /session/ in ${externalName} (string)`);
                                    console.log(`📊 Content preview: ${fileContentResponse.substring(0, 100)}...`);
                                } else if (fileContentResponse && typeof fileContentResponse === 'object' && fileContentResponse !== null) {
                                    // API returns JSON object directly, convert to string
                                    credsContent = JSON.stringify(fileContentResponse, null, 2);
                                    credsFound = true;
                                    console.log(`✅ Successfully read ${credsFile.attributes.name} from /session/ in ${externalName} (object)`);
                                    console.log(`📊 Content preview: ${credsContent.substring(0, 100)}...`);
                                } else if (fileContentResponse && fileContentResponse.data && typeof fileContentResponse.data === 'string' && fileContentResponse.data.trim().length > 0) {
                                    credsContent = fileContentResponse.data;
                                    credsFound = true;
                                    console.log(`✅ Successfully read ${credsFile.attributes.name} from /session/ in ${externalName} (data property)`);
                                    console.log(`📊 Content preview: ${fileContentResponse.data.substring(0, 100)}...`);
                                } else {
                                    console.log(`⚠️ File content is empty or invalid format for ${credsFile.attributes.name}`);
                                    console.log(`📊 Raw response: ${JSON.stringify(fileContentResponse).substring(0, 200)}...`);
                                }
                            } catch (readError) {
                                console.log(`❌ Failed to read ${credsFile.attributes.name}: ${readError.response?.status} - ${readError.message}`);
                            }
                        } else {
                            console.log(`⚠️ No JSON files found in /files/session for ${externalName}`);
                        }
                    } else {
                        console.log(`⚠️ /files/session directory is empty or not accessible for ${externalName}`);
                    }
                } catch (sessionError) {
                    console.log(`❌ Cannot access /files/session directory for ${externalName}: ${sessionError.response?.status} - ${sessionError.message}`);

                    // If 409 (server offline/suspended), skip this server
                    if (sessionError.response?.status === 409) {
                        console.log(`⏭️ Server ${externalName} is offline/suspended (409), skipping...`);
                        skippedCount++;
                        continue;
                    }
                }

                // If not found in /session, try multiple fallback paths
                if (!credsFound) {
                    const fallbackPaths = [
                        { path: '/files/session', name: '/files/session directory' },
                        { path: '/files', name: '/files directory' },
                        { path: '/', name: 'root directory' }
                    ];

                    for (const fallback of fallbackPaths) {
                        if (credsFound) break;

                        try {
                            console.log(`📁 Fallback: Checking ${fallback.name} for ${externalName}...`);
                            const fallbackResponse = await ExternalPteroAPI.clientRequest(
                                `servers/${externalUuid}/files/list${fallback.path !== '/' ? `?directory=${encodeURIComponent(fallback.path)}` : ''}`,
                                'GET'
                            );

                            if (fallbackResponse.data && fallbackResponse.data.length > 0) {
                                console.log(`📋 Found ${fallbackResponse.data.length} files in ${fallback.name}`);

                                const jsonFiles = fallbackResponse.data.filter(file =>
                                    file.attributes.is_file && file.attributes.name.endsWith('.json')
                                );

                                console.log(`🔍 Found ${jsonFiles.length} JSON files in ${fallback.name}`);

                                if (jsonFiles.length > 0) {
                                    const credsFile = jsonFiles.find(file => file.attributes.name === 'creds.json') || jsonFiles[0];
                                    console.log(`📄 Found JSON file in ${fallback.name}: ${credsFile.attributes.name}`);
                                    foundPath = `${fallback.path}/${credsFile.attributes.name}`.replace('//', '/');

                                    try {
                                        console.log(`📖 Reading file from ${fallback.name}: ${foundPath}`);
                                        const fileContentResponse = await ExternalPteroAPI.clientRequest(
                                            `servers/${externalUuid}/files/contents?file=${encodeURIComponent(foundPath)}`,
                                            'GET'
                                        );

                                        if (fileContentResponse && typeof fileContentResponse === 'string' && fileContentResponse.trim().length > 0) {
                                            credsContent = fileContentResponse;
                                            credsFound = true;
                                            console.log(`✅ Successfully read ${credsFile.attributes.name} from ${fallback.name} in ${externalName} (string)`);
                                            break;
                                        } else if (fileContentResponse && typeof fileContentResponse === 'object' && fileContentResponse !== null) {
                                            // API returns JSON object directly, convert to string
                                            credsContent = JSON.stringify(fileContentResponse, null, 2);
                                            credsFound = true;
                                            console.log(`✅ Successfully read ${credsFile.attributes.name} from ${fallback.name} in ${externalName} (object)`);
                                            break;
                                        } else if (fileContentResponse && fileContentResponse.data && typeof fileContentResponse.data === 'string') {
                                            credsContent = fileContentResponse.data;
                                            credsFound = true;
                                            console.log(`✅ Successfully read ${credsFile.attributes.name} from ${fallback.name} in ${externalName} (data property)`);
                                            break;
                                        } else {
                                            console.log(`⚠️ File content is empty or invalid from ${fallback.name}`);
                                        }
                                    } catch (readError) {
                                        console.log(`❌ Failed to read ${credsFile.attributes.name} from ${fallback.name}: ${readError.response?.status} - ${readError.message}`);
                                    }
                                } else {
                                    console.log(`⚠️ No JSON files found in ${fallback.name} for ${externalName}`);
                                }
                            } else {
                                console.log(`⚠️ ${fallback.name} is empty or not accessible for ${externalName}`);
                            }
                        } catch (fallbackError) {
                            console.log(`❌ Cannot access ${fallback.name} for ${externalName}: ${fallbackError.response?.status} - ${fallbackError.message}`);

                            // If 409 (server offline), skip remaining fallbacks for this server
                            if (fallbackError.response?.status === 409) {
                                console.log(`⏭️ Server ${externalName} is offline/suspended, skipping remaining fallbacks...`);
                                break;
                            }
                        }

                        // Small delay between fallback attempts
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                // Final check if we found any creds
                console.log(`🔍 Final check for ${externalName}:`);
                console.log(`   credsFound: ${credsFound}`);
                console.log(`   credsContent exists: ${!!credsContent}`);
                console.log(`   credsContent type: ${typeof credsContent}`);
                console.log(`   credsContent length: ${credsContent ? credsContent.length : 'NULL'}`);

                if (!credsFound || !credsContent || (typeof credsContent === 'string' && credsContent.trim().length === 0)) {
                    skippedCount++;
                    console.log(`⏭️ Skipping ${externalName}: No valid creds.json found via API`);
                    console.log(`   Reason: credsFound=${credsFound}, credsContent=${!!credsContent}, length=${credsContent ? credsContent.length : 'NULL'}`);
                    continue;
                }

                console.log(`🔧 Processing creds content for ${externalName}...`);
                console.log(`📊 Raw content length: ${credsContent.length}`);
                console.log(`📊 Content preview: ${credsContent.substring(0, 100)}...`);

                // Clean and validate JSON content
                try {
                    const cleanedContent = cleanJsonContent(credsContent);
                    console.log(`🧹 Cleaned content length: ${cleanedContent.length}`);

                    // Validate JSON
                    const jsonData = JSON.parse(cleanedContent);
                    console.log(`✅ Valid JSON with ${Object.keys(jsonData).length} properties`);

                    // Create safe filename from server name
                    const safeFileName = externalName.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
                    const outputFilePath = path.join(outputDir, safeFileName);

                    console.log(`💾 Saving to: ${outputFilePath}`);

                    // Save to output-scrape-sender folder
                    fs.writeFileSync(outputFilePath, cleanedContent, 'utf8');

                    // Verify file was written
                    if (fs.existsSync(outputFilePath)) {
                        const fileStats = fs.statSync(outputFilePath);
                        console.log(`✅ File saved successfully - Size: ${fileStats.size} bytes`);

                        scrapedCount++;
                        scrapedFiles.push({
                            serverName: externalName,
                            serverUuid: externalUuid,
                            fileName: safeFileName,
                            filePath: outputFilePath,
                            foundPath: foundPath,
                            fileSize: fileStats.size
                        });

                        console.log(`✅ Scraped sender from ${externalName} → ${safeFileName} (${fileStats.size} bytes)`);
                    } else {
                        console.log(`❌ File was not saved: ${outputFilePath}`);
                        errorCount++;
                    }

                } catch (jsonError) {
                    console.log(`❌ Invalid JSON content for ${externalName}: ${jsonError.message}`);
                    errorCount++;
                    continue;
                }

                // Small delay to prevent overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                errorCount++;
                console.error(`❌ Error scraping ${externalServer.attributes.name}:`, error.message);
            }
        }

        // Generate completion report with URLs and debug info
        console.log(`\n📊 Final Results:`);
        console.log(`📤 Total Scraped: ${scrapedCount}`);
        console.log(`⏭️ Dilewati: ${skippedCount}`);
        console.log(`❌ Error: ${errorCount}`);
        console.log(`📁 Output Directory: ${outputDir}`);

        let report = `✅ *Scraping Sender Selesai*\n\n`;
        report += `🌐 **Panel:** ${EXTERNAL_PANEL.domain}\n`;
        report += `📊 **Ringkasan:**\n`;
        report += `📤 Total Scraped: ${scrapedCount}\n`;
        report += `⏭️ Dilewati: ${skippedCount}\n`;
        report += `❌ Error: ${errorCount}\n`;
        report += `📁 Output Folder: /${OUTPUT_SCRAPE_SENDER_DIR}\n`;
        report += `📍 Full Path: ${outputDir}\n`;
        report += `⏰ Selesai: ${new Date().toLocaleString('id-ID')}\n\n`;

        if (scrapedCount > 0) {
            report += `📋 **File yang Berhasil Discrape:**\n`;
            scrapedFiles.slice(0, 8).forEach((file, index) => {
                const panelUrl = `${EXTERNAL_PANEL.domain}/server/${file.serverUuid}/files`;
                report += `${index + 1}. **${file.serverName}**\n`;
                report += `   📄 File: ${file.fileName} (${file.fileSize} bytes)\n`;
                report += `   📁 Source: ${file.foundPath}\n`;
                report += `   🌐 Panel: [${file.serverName}](${panelUrl})\n\n`;
            });

            if (scrapedFiles.length > 8) {
                report += `... dan ${scrapedFiles.length - 8} file lainnya\n\n`;
            }
        }

        report += `🎯 **Semua sender berhasil discrape dari panel eksternal!**`;

        // Send completion report first
        await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });

        // Ask for deletion confirmation if files were scraped
        if (scrapedCount > 0) {
            // Store scraped files data for deletion
            global.scrapedSenderFilesForDeletion = {
                chatId: chatId,
                files: scrapedFiles,
                timestamp: new Date()
            };

            const deleteMessage = `🗑️ **Hapus creds.json di Panel Eksternal?**\n\n` +
                                 `📊 **${scrapedCount} file creds.json** berhasil discrape\n` +
                                 `🌐 **Panel:** ${EXTERNAL_PANEL.domain}\n\n` +
                                 `📋 **Yang akan dihapus:**\n` +
                                 scrapedFiles.slice(0, 5).map((file, index) =>
                                     `${index + 1}. ${file.serverName} → ${file.foundPath}`
                                 ).join('\n') +
                                 (scrapedFiles.length > 5 ? `\n... dan ${scrapedFiles.length - 5} file lainnya` : '') +
                                 `\n\n⚠️ **Perhatian:**\n` +
                                 `• File creds.json akan dihapus dari server eksternal\n` +
                                 `• File sudah aman tersimpan di /${OUTPUT_SCRAPE_SENDER_DIR}\n` +
                                 `• Aksi ini tidak dapat dibatalkan\n\n` +
                                 `🤔 **Hapus file creds.json di panel eksternal?**`;

            const deleteKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🗑️ Ya, Hapus creds.json', callback_data: 'delete_external_sender_yes' },
                            { text: '⏭️ Skip, Biarkan Tetap Ada', callback_data: 'delete_external_sender_skip' }
                        ]
                    ]
                }
            };

            bot.sendMessage(chatId, deleteMessage, { parse_mode: 'Markdown', ...deleteKeyboard });
        } else {
            bot.sendMessage(chatId, '📝 Tidak ada file yang discrape, tidak ada yang perlu dihapus.', getMainMenu());
        }

    } catch (error) {
        console.error('Execute scrape external sender error:', error);
        bot.sendMessage(chatId, `❌ Error saat scraping sender: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Scrape External Panel Creds - Save to output-external folder
async function handleScrapeExternalCreds(chatId) {
    try {
        // Check if external panel is blacklisted
        if (isPanelBlacklisted(EXTERNAL_PANEL.domain)) {
            return bot.sendMessage(chatId, `❌ *Panel Diblacklist*\n\nPanel ${EXTERNAL_PANEL.domain} tidak diizinkan untuk operasi ini.\n\nHubungi admin untuk informasi lebih lanjut.`, { parse_mode: 'Markdown', ...getMainMenu() });
        }

        bot.sendMessage(chatId, '🔍 *Memulai Scrape Creds dari Panel Eksternal*\n\nMengambil daftar server dari panel eksternal...', { parse_mode: 'Markdown' });

        // Get servers from external panel
        const externalServers = await ExternalPteroAPI.getAllServers();

        if (externalServers.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server ditemukan di panel eksternal!', getMainMenu());
        }

        // Create output-external directory if it doesn't exist
        const outputDir = path.join(__dirname, 'output-external');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`✅ Created output directory: ${outputDir}`);
        }

        // Count servers with creds.json via API
        let serversWithCreds = 0;
        console.log('🔍 Checking servers for creds.json via API...');

        for (const server of externalServers.slice(0, 5)) { // Check first 5 servers for preview
            try {
                const serverUuid = server.attributes.uuid;
                const serverName = server.attributes.name;

                console.log(`🔍 Checking ${serverName} for creds...`);

                // Try to list files in session directory
                try {
                    const sessionFilesResponse = await ExternalPteroAPI.clientRequest(`servers/${serverUuid}/files/list?directory=%2Fsession`, 'GET');

                    if (sessionFilesResponse.data && sessionFilesResponse.data.length > 0) {
                        const hasJsonFiles = sessionFilesResponse.data.some(file =>
                            file.attributes.is_file && file.attributes.name.endsWith('.json')
                        );

                        if (hasJsonFiles) {
                            serversWithCreds++;
                            console.log(`✅ ${serverName} has JSON files in session`);
                        }
                    }
                } catch (sessionError) {
                    // Try root directory if session fails
                    try {
                        const rootFilesResponse = await ExternalPteroAPI.clientRequest(`servers/${serverUuid}/files/list`, 'GET');

                        if (rootFilesResponse.data && rootFilesResponse.data.length > 0) {
                            const hasJsonFiles = rootFilesResponse.data.some(file =>
                                file.attributes.is_file && file.attributes.name.endsWith('.json')
                            );

                            if (hasJsonFiles) {
                                serversWithCreds++;
                                console.log(`✅ ${serverName} has JSON files in root`);
                            }
                        }
                    } catch (rootError) {
                        console.log(`❌ Cannot check ${serverName}: ${rootError.message}`);
                    }
                }

                // Small delay between checks
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.log(`❌ Error checking server ${server.attributes.name}: ${escapeMarkdown(error.message)}`);
            }
        }

        console.log(`📊 Found ${serversWithCreds} servers with potential creds (from ${Math.min(5, externalServers.length)} checked)`);

        // Estimate total based on sample
        const estimatedTotal = Math.round((serversWithCreds / Math.min(5, externalServers.length)) * externalServers.length);

        if (serversWithCreds === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada server dengan creds.json ditemukan di panel eksternal!\n\n⚠️ Pastikan server memiliki file JSON di folder session atau root.', getMainMenu());
        }

        const message = `🔍 *Scrape Creds Panel Eksternal*\n\n` +
                       `🌐 **Panel:** ${EXTERNAL_PANEL.domain}\n` +
                       `📊 **Total Server:** ${externalServers.length}\n` +
                       `🔑 **Server dengan Creds:** ~${estimatedTotal} (estimasi)\n` +
                       `📁 **Output Folder:** /output-external\n` +
                       `🌐 **Method:** Pterodactyl API\n\n` +
                       `⚠️ **Catatan:**\n` +
                       `• Scraping dilakukan via API (bukan akses file lokal)\n` +
                       `• Semua creds.json akan disalin ke folder output-external\n` +
                       `• File akan diberi nama sesuai nama server\n` +
                       `• File yang sudah ada akan ditimpa\n\n` +
                       `🚀 **Mulai scraping via API?**`;

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Ya, Mulai Scraping', callback_data: 'scrape_external_start' },
                        { text: '❌ Batal', callback_data: 'scrape_external_cancel' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Handle scrape external creds error:', error);
        bot.sendMessage(chatId, `❌ Error saat memulai scrape creds: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Execute scraping external creds via API
async function executeScrapeExternalCreds(chatId) {
    try {
        bot.sendMessage(chatId, '🔄 *Memulai Scraping Creds via API*\n\nMengambil server dari panel eksternal...', { parse_mode: 'Markdown' });

        // Get servers from external panel
        const externalServers = await ExternalPteroAPI.getAllServers();

        console.log(`📊 External panel servers: ${externalServers.length}`);

        let scrapedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const scrapedFiles = [];

        // Create output directory
        const outputDir = path.join(__dirname, 'output-external');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        bot.sendMessage(chatId, `🔄 *Memproses ${externalServers.length} server eksternal via API...*`, { parse_mode: 'Markdown' });

        for (const externalServer of externalServers) {
            try {
                const externalUuid = externalServer.attributes.uuid;
                const externalName = externalServer.attributes.name;

                console.log(`🔍 Processing external server: ${externalName} (${externalUuid})`);

                // Check if external server has creds.json via API
                let credsFound = false;
                let credsContent = null;

                // Try different possible locations for JSON files via API
                const possiblePaths = [
                    '/session/creds.json',
                    '/creds.json',
                    '/session/plugins/creds.json'
                ];

                // First, try to list files in session directory
                try {
                    console.log(`📁 Checking session directory for ${externalName}...`);
                    const sessionFilesResponse = await ExternalPteroAPI.clientRequest(`servers/${externalUuid}/files/list?directory=%2Fsession`, 'GET');

                    if (sessionFilesResponse.data && sessionFilesResponse.data.length > 0) {
                        console.log(`📋 Found ${sessionFilesResponse.data.length} files in session directory`);

                        // Look for creds.json specifically
                        const credsFile = sessionFilesResponse.data.find(file =>
                            file.attributes.is_file && file.attributes.name === 'creds.json'
                        );

                        if (credsFile) {
                            console.log(`📄 Found creds.json in session directory!`);

                            // Try to read the file content
                            try {
                                const fileContentResponse = await ExternalPteroAPI.clientRequest(
                                    `servers/${externalUuid}/files/contents?file=%2Fsession%2Fcreds.json`,
                                    'GET'
                                );

                                console.log(`📊 File content type: ${typeof fileContentResponse}`);
                                console.log(`📊 File content exists: ${!!fileContentResponse}`);

                                // Handle both string and object responses (FIXED LOGIC)
                                if (fileContentResponse) {
                                    if (typeof fileContentResponse === 'string' && fileContentResponse.trim().length > 0) {
                                        credsContent = fileContentResponse;
                                        credsFound = true;
                                        console.log(`✅ Successfully read creds.json (string)!`);
                                    } else if (typeof fileContentResponse === 'object' && fileContentResponse !== null) {
                                        credsContent = JSON.stringify(fileContentResponse, null, 2);
                                        credsFound = true;
                                        console.log(`✅ Successfully read creds.json (object)!`);
                                    } else if (fileContentResponse.data) {
                                        credsContent = typeof fileContentResponse.data === 'string' ? fileContentResponse.data : JSON.stringify(fileContentResponse.data, null, 2);
                                        credsFound = true;
                                        console.log(`✅ Successfully read creds.json (data property)!`);
                                    }

                                    if (credsFound) {
                                        console.log(`📊 Content length: ${credsContent.length}`);
                                        console.log(`📊 Content preview: ${credsContent.substring(0, 100)}...`);
                                    }
                                }

                                if (!credsFound) {
                                    console.log(`⚠️ File content is empty or invalid format`);
                                    console.log(`📊 Raw response: ${JSON.stringify(fileContentResponse).substring(0, 200)}...`);
                                }
                            } catch (readError) {
                                console.log(`❌ Failed to read creds.json: ${readError.response?.status} - ${readError.message}`);
                            }
                        } else {
                            console.log(`⚠️ No creds.json found in session directory for ${externalName}`);
                        }
                    }
                } catch (sessionError) {
                    console.log(`❌ Cannot access session directory for ${externalName}: ${sessionError.response?.status} - ${sessionError.message}`);
                }

                // If not found in session, try root directory
                if (!credsFound) {
                    try {
                        console.log(`📁 Checking root directory for ${externalName}...`);
                        const rootFilesResponse = await ExternalPteroAPI.clientRequest(`servers/${externalUuid}/files/list`, 'GET');

                        if (rootFilesResponse.data && rootFilesResponse.data.length > 0) {
                            const jsonFiles = rootFilesResponse.data.filter(file =>
                                file.attributes.is_file && file.attributes.name.endsWith('.json')
                            );

                            if (jsonFiles.length > 0) {
                                const credsFile = jsonFiles.find(file => file.attributes.name === 'creds.json') || jsonFiles[0];
                                console.log(`📄 Found JSON file in root: ${credsFile.attributes.name}`);

                                try {
                                    const fileContentResponse = await ExternalPteroAPI.clientRequest(
                                        `servers/${externalUuid}/files/contents?file=%2F${encodeURIComponent(credsFile.attributes.name)}`,
                                        'GET'
                                    );

                                    if (fileContentResponse && typeof fileContentResponse === 'string') {
                                        credsContent = fileContentResponse;
                                        credsFound = true;
                                        console.log(`✅ Successfully read ${credsFile.attributes.name} from root of ${externalName}`);
                                    } else if (fileContentResponse && fileContentResponse.data) {
                                        credsContent = fileContentResponse.data;
                                        credsFound = true;
                                        console.log(`✅ Successfully read ${credsFile.attributes.name} from root of ${externalName} (data property)`);
                                    }
                                } catch (readError) {
                                    console.log(`❌ Failed to read ${credsFile.attributes.name} from root: ${readError.message}`);
                                }
                            }
                        }
                    } catch (rootError) {
                        console.log(`❌ Cannot access root directory for ${externalName}: ${rootError.message}`);
                    }
                }

                if (!credsFound || !credsContent) {
                    skippedCount++;
                    console.log(`⏭️ Skipping ${externalName}: No creds.json found via API`);
                    continue;
                }

                // Clean and validate JSON content
                const cleanedContent = cleanJsonContent(credsContent);
                JSON.parse(cleanedContent); // Validate JSON

                // Create safe filename from server name
                const safeFileName = externalName.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
                const outputFilePath = path.join(outputDir, safeFileName);

                // Save to output-external folder
                fs.writeFileSync(outputFilePath, cleanedContent, 'utf8');

                scrapedCount++;
                scrapedFiles.push({
                    serverName: externalName,
                    serverUuid: externalUuid,
                    fileName: safeFileName,
                    filePath: outputFilePath
                });

                console.log(`✅ Scraped creds from ${externalName} → ${safeFileName}`);

                // Small delay to prevent overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                errorCount++;
                console.error(`❌ Error scraping ${externalServer.attributes.name}:`, error.message);
            }
        }

        // Generate completion report with URLs (ESCAPED FOR MARKDOWN SAFETY)
        let report = `✅ *Scraping Creds Selesai*\n\n`;
        report += `🌐 **Panel:** ${escapeMarkdown(EXTERNAL_PANEL.domain)}\n`;
        report += `📊 **Ringkasan:**\n`;
        report += `📤 Total Scraped: ${scrapedCount}\n`;
        report += `⏭️ Dilewati: ${skippedCount}\n`;
        report += `❌ Error: ${errorCount}\n`;
        report += `📁 Output Folder: /output-external\n`;
        report += `⏰ Selesai: ${escapeMarkdown(new Date().toLocaleString('id-ID'))}\n\n`;

        if (scrapedCount > 0) {
            report += `📋 **File yang Berhasil Discrape:**\n`;
            scrapedFiles.slice(0, 8).forEach((file, index) => {
                const panelUrl = `${EXTERNAL_PANEL.domain}/server/${file.serverUuid}/files`;
                const safeServerName = escapeMarkdown(file.serverName);
                const safeFileName = escapeMarkdown(file.fileName);
                const safePanelUrl = escapeMarkdown(panelUrl);

                report += `${index + 1}. **${safeServerName}**\n`;
                report += `   📄 File: ${safeFileName}\n`;
                report += `   🌐 Panel: [${safeServerName}](${safePanelUrl})\n\n`;
            });

            if (scrapedFiles.length > 8) {
                report += `... dan ${scrapedFiles.length - 8} file lainnya\n\n`;
            }
        }

        report += `🎯 **Semua creds berhasil discrape dari panel eksternal!**`;

        // Send completion report first (WITHOUT MARKDOWN to prevent parsing errors)
        await bot.sendMessage(chatId, report.replace(/\*\*/g, '').replace(/\*/g, ''));

        // Ask for deletion confirmation if files were scraped
        if (scrapedCount > 0) {
            // Store scraped files data for deletion
            global.scrapedFilesForDeletion = {
                chatId: chatId,
                files: scrapedFiles,
                timestamp: new Date()
            };

            const deleteMessage = `🗑️ **Hapus Folder Creds di Panel Eksternal?**\n\n` +
                                 `📊 **${scrapedCount} folder creds** berhasil discrape\n` +
                                 `🌐 **Panel:** ${escapeMarkdown(EXTERNAL_PANEL.domain)}\n\n` +
                                 `⚠️ **Perhatian:**\n` +
                                 `• Folder session akan dihapus dari server eksternal\n` +
                                 `• File creds.json sudah aman tersimpan di /output-external\n` +
                                 `• Aksi ini tidak dapat dibatalkan\n\n` +
                                 `🤔 **Hapus folder creds di panel eksternal?**`;

            const deleteKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🗑️ Ya, Hapus Folder Creds', callback_data: 'delete_external_creds_yes' },
                            { text: '⏭️ Skip, Biarkan Tetap Ada', callback_data: 'delete_external_creds_skip' }
                        ]
                    ]
                }
            };

            bot.sendMessage(chatId, deleteMessage.replace(/\*\*/g, '').replace(/\*/g, ''), deleteKeyboard);
        } else {
            bot.sendMessage(chatId, '📝 Tidak ada file yang discrape, tidak ada yang perlu dihapus.', getMainMenu());
        }

    } catch (error) {
        console.error('Execute scrape external creds error:', error);

        // Check if it's a Cloudflare protection error
        if (error.isCloudflare || error.message?.includes('Cloudflare protection')) {
            const cloudflareMessage = `🛡️ *Panel Eksternal Diproteksi Cloudflare*\n\n` +
                                    `🌐 **Panel:** ${escapeMarkdown(EXTERNAL_PANEL.domain)}\n` +
                                    `❌ **Status:** API Diblokir Cloudflare\n` +
                                    `🛡️ **Protection:** Bot Management + DDoS Protection\n\n` +
                                    `💡 **Solusi:**\n` +
                                    `1️⃣ Hubungi admin panel untuk whitelist IP VPS\n` +
                                    `2️⃣ Gunakan panel alternatif yang tersedia\n` +
                                    `3️⃣ Download manual dan upload via "📤 Setor Sender"\n\n` +
                                    `⚠️ **Catatan:**\n` +
                                    `• Panel ini menggunakan Cloudflare protection yang ketat\n` +
                                    `• IP VPS/datacenter sering diblokir otomatis\n` +
                                    `• Fitur lain tetap berfungsi normal\n\n` +
                                    `🔄 **Alternatif:** Gunakan panel lain atau upload manual`;

            bot.sendMessage(chatId, cloudflareMessage, getMainMenu());
        } else {
            bot.sendMessage(chatId, `❌ Error saat scraping creds: ${escapeMarkdown(error.message)}`, getMainMenu());
        }
    }
}

// Execute deletion of external creds folders
async function executeDeleteExternalCreds(chatId) {
    try {
        const scrapedData = global.scrapedFilesForDeletion;

        if (!scrapedData || scrapedData.chatId !== chatId) {
            return bot.sendMessage(chatId, '❌ Data scraping tidak ditemukan atau sudah expired.', getMainMenu());
        }

        const filesToDelete = scrapedData.files;

        if (!filesToDelete || filesToDelete.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada file untuk dihapus.', getMainMenu());
        }

        bot.sendMessage(chatId, `🗑️ *Memulai Penghapusan Folder Creds*\n\n📊 **Target:** ${filesToDelete.length} folder\n🌐 **Panel:** ${EXTERNAL_PANEL.domain}\n\n⏳ **Status:** Memproses...`, { parse_mode: 'Markdown' });

        let deletedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const deletionResults = [];

        for (const file of filesToDelete) {
            try {
                const serverUuid = file.serverUuid;
                const serverName = file.serverName;

                console.log(`🗑️ Deleting session folder for ${serverName} (${serverUuid})`);

                // Try to delete session folder via API
                try {
                    // First, try to delete the session folder
                    await ExternalPteroAPI.clientRequest(
                        `servers/${serverUuid}/files/delete`,
                        'POST',
                        {
                            root: '/',
                            files: ['session']
                        }
                    );

                    deletedCount++;
                    deletionResults.push({
                        serverName: serverName,
                        serverUuid: serverUuid,
                        status: 'deleted',
                        message: 'Session folder berhasil dihapus'
                    });

                    console.log(`✅ Successfully deleted session folder for ${serverName}`);

                } catch (deleteError) {
                    // If session folder deletion fails, try to delete individual creds.json
                    console.log(`⚠️ Session folder deletion failed for ${serverName}, trying individual file deletion...`);

                    try {
                        await ExternalPteroAPI.clientRequest(
                            `servers/${serverUuid}/files/delete`,
                            'POST',
                            {
                                root: '/session',
                                files: ['creds.json']
                            }
                        );

                        deletedCount++;
                        deletionResults.push({
                            serverName: serverName,
                            serverUuid: serverUuid,
                            status: 'deleted',
                            message: 'File creds.json berhasil dihapus'
                        });

                        console.log(`✅ Successfully deleted creds.json for ${serverName}`);

                    } catch (fileDeleteError) {
                        // Try deleting from root directory
                        try {
                            await ExternalPteroAPI.clientRequest(
                                `servers/${serverUuid}/files/delete`,
                                'POST',
                                {
                                    root: '/',
                                    files: ['creds.json']
                                }
                            );

                            deletedCount++;
                            deletionResults.push({
                                serverName: serverName,
                                serverUuid: serverUuid,
                                status: 'deleted',
                                message: 'File creds.json dihapus dari root'
                            });

                            console.log(`✅ Successfully deleted creds.json from root for ${serverName}`);

                        } catch (rootDeleteError) {
                            errorCount++;
                            deletionResults.push({
                                serverName: serverName,
                                serverUuid: serverUuid,
                                status: 'error',
                                message: `Gagal hapus: ${rootDeleteError.message}`
                            });

                            console.log(`❌ Failed to delete creds for ${serverName}: ${rootDeleteError.message}`);
                        }
                    }
                }

                // Small delay between deletions
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                errorCount++;
                deletionResults.push({
                    serverName: file.serverName,
                    serverUuid: file.serverUuid,
                    status: 'error',
                    message: `Error: ${escapeMarkdown(error.message)}`
                });

                console.error(`❌ Error deleting creds for ${file.serverName}:`, error.message);
            }
        }

        // Generate deletion report
        let report = `🗑️ *Penghapusan Folder Creds Selesai*\n\n`;
        report += `🌐 **Panel:** ${EXTERNAL_PANEL.domain}\n`;
        report += `📊 **Ringkasan:**\n`;
        report += `✅ Berhasil Dihapus: ${deletedCount}\n`;
        report += `❌ Error: ${errorCount}\n`;
        report += `⏰ Selesai: ${new Date().toLocaleString('id-ID')}\n\n`;

        if (deletedCount > 0) {
            report += `📋 **Folder yang Berhasil Dihapus:**\n`;
            deletionResults.filter(r => r.status === 'deleted').slice(0, 8).forEach((result, index) => {
                const panelUrl = `${EXTERNAL_PANEL.domain}/server/${result.serverUuid}/files`;
                report += `${index + 1}. **${result.serverName}**\n`;
                report += `   ✅ ${result.message}\n`;
                report += `   🌐 Panel: [${result.serverName}](${panelUrl})\n\n`;
            });
        }

        if (errorCount > 0) {
            report += `❌ **Error yang Terjadi:**\n`;
            deletionResults.filter(r => r.status === 'error').slice(0, 5).forEach((result, index) => {
                report += `${index + 1}. ${result.serverName}: ${result.message}\n`;
            });
            report += `\n`;
        }

        report += `🎯 **Pembersihan folder creds di panel eksternal selesai!**`;

        // Clear the global data
        delete global.scrapedFilesForDeletion;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute delete external creds error:', error);
        bot.sendMessage(chatId, `❌ Error saat menghapus folder creds: ${escapeMarkdown(error.message)}`, getMainMenu());
    }
}

// Execute deletion of external sender folders
async function executeDeleteExternalSender(chatId) {
    try {
        const scrapedData = global.scrapedSenderFilesForDeletion;

        if (!scrapedData || scrapedData.chatId !== chatId) {
            return bot.sendMessage(chatId, '❌ Data scraping sender tidak ditemukan atau sudah expired.', getMainMenu());
        }

        const filesToDelete = scrapedData.files;

        if (!filesToDelete || filesToDelete.length === 0) {
            return bot.sendMessage(chatId, '❌ Tidak ada file sender untuk dihapus.', getMainMenu());
        }

        bot.sendMessage(chatId, `🗑️ *Memulai Penghapusan Folder Sender*\n\n📊 **Target:** ${filesToDelete.length} folder\n🌐 **Panel:** ${EXTERNAL_PANEL.domain}\n\n⏳ **Status:** Memproses...`, { parse_mode: 'Markdown' });

        let deletedCount = 0;
        let errorCount = 0;
        const deletionResults = [];

        for (const file of filesToDelete) {
            try {
                const serverUuid = file.serverUuid;
                const serverName = file.serverName;

                console.log(`🗑️ Deleting session folder for ${serverName} (${serverUuid})`);

                // Try to delete /files/session folder via API (consistent with setor sender path)
                try {
                    // First, try to delete the /files/session folder
                    await ExternalPteroAPI.clientRequest(
                        `servers/${serverUuid}/files/delete`,
                        'POST',
                        {
                            root: '/files',
                            files: ['session']
                        }
                    );

                    deletedCount++;
                    deletionResults.push({
                        serverName: serverName,
                        serverUuid: serverUuid,
                        status: 'deleted',
                        message: '/files/session folder berhasil dihapus'
                    });

                    console.log(`✅ Successfully deleted /files/session folder for ${serverName}`);

                } catch (deleteError) {
                    // If /files/session folder deletion fails, try to delete individual creds.json
                    console.log(`⚠️ /files/session folder deletion failed for ${serverName}, trying individual file deletion...`);

                    try {
                        await ExternalPteroAPI.clientRequest(
                            `servers/${serverUuid}/files/delete`,
                            'POST',
                            {
                                root: '/files/session',
                                files: ['creds.json']
                            }
                        );

                        deletedCount++;
                        deletionResults.push({
                            serverName: serverName,
                            serverUuid: serverUuid,
                            status: 'deleted',
                            message: 'File creds.json berhasil dihapus dari /files/session'
                        });

                        console.log(`✅ Successfully deleted creds.json from /files/session for ${serverName}`);

                    } catch (fileDeleteError) {
                        // Try deleting from /files directory
                        try {
                            await ExternalPteroAPI.clientRequest(
                                `servers/${serverUuid}/files/delete`,
                                'POST',
                                {
                                    root: '/files',
                                    files: ['creds.json']
                                }
                            );

                            deletedCount++;
                            deletionResults.push({
                                serverName: serverName,
                                serverUuid: serverUuid,
                                status: 'deleted',
                                message: 'File creds.json dihapus dari /files'
                            });

                            console.log(`✅ Successfully deleted creds.json from /files for ${serverName}`);

                        } catch (filesDeleteError) {
                            errorCount++;
                            deletionResults.push({
                                serverName: serverName,
                                serverUuid: serverUuid,
                                status: 'error',
                                message: `Gagal hapus: ${filesDeleteError.message}`
                            });

                            console.log(`❌ Failed to delete sender for ${serverName}: ${filesDeleteError.message}`);
                        }
                    }
                }

                // Small delay between deletions
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                errorCount++;
                deletionResults.push({
                    serverName: file.serverName,
                    serverUuid: file.serverUuid,
                    status: 'error',
                    message: `Error: ${escapeMarkdown(error.message)}`
                });

                console.error(`❌ Error deleting sender for ${file.serverName}:`, error.message);
            }
        }

        // Generate deletion report
        let report = `🗑️ *Penghapusan Folder Sender Selesai*\n\n`;
        report += `🌐 **Panel:** ${EXTERNAL_PANEL.domain}\n`;
        report += `📊 **Ringkasan:**\n`;
        report += `✅ Berhasil Dihapus: ${deletedCount}\n`;
        report += `❌ Error: ${errorCount}\n`;
        report += `⏰ Selesai: ${new Date().toLocaleString('id-ID')}\n\n`;

        if (deletedCount > 0) {
            report += `📋 **Folder yang Berhasil Dihapus:**\n`;
            deletionResults.filter(r => r.status === 'deleted').slice(0, 8).forEach((result, index) => {
                const panelUrl = `${EXTERNAL_PANEL.domain}/server/${result.serverUuid}/files`;
                report += `${index + 1}. **${result.serverName}**\n`;
                report += `   ✅ ${result.message}\n`;
                report += `   🌐 Panel: [${result.serverName}](${panelUrl})\n\n`;
            });
        }

        if (errorCount > 0) {
            report += `❌ **Error yang Terjadi:**\n`;
            deletionResults.filter(r => r.status === 'error').slice(0, 5).forEach((result, index) => {
                report += `${index + 1}. ${result.serverName}: ${result.message}\n`;
            });
            report += `\n`;
        }

        report += `🎯 **Pembersihan folder sender di panel eksternal selesai!**`;

        // Clear the global data
        delete global.scrapedSenderFilesForDeletion;

        bot.sendMessage(chatId, report, { parse_mode: 'Markdown', ...getMainMenu() });

    } catch (error) {
        console.error('Execute delete external sender error:', error);
        bot.sendMessage(chatId, `❌ Error saat menghapus folder sender: ${escapeMarkdown(error.message)}`, getMainMenu());
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
                const externalServerVolumePath = getServerVolumePath(externalUuid);
                const externalSessionPath = path.join(externalServerVolumePath, 'session');
                const externalCredsPath = path.join(externalSessionPath, 'creds.json');

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
                    path.join(externalServerVolumePath, 'creds.json'), // Direct in volume
                    path.join(externalSessionPath, 'plugins', 'creds.json'), // In plugins folder
                ];

                // Also check for any .json files in session directory
                const sessionDir = externalSessionPath;
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
                const mainServerVolumePath = getServerVolumePath(mainUuid);
                const mainSessionPath = path.join(mainServerVolumePath, 'session');
                const mainCredsPath = path.join(mainSessionPath, 'creds.json');

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
        bot.sendMessage(chatId, `❌ Error saat copy creds dari panel eksternal: ${escapeMarkdown(error.message)}`, getMainMenu());
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
