/**
 * Locks & Anti-Spam Module - Rose Bot Style
 * Handles message locks and anti-spam features
 */

class LocksModule {
    constructor(bot) {
        this.bot = bot;
        this.lockSettings = new Map(); // Store lock settings
        this.userMessageCount = new Map(); // For antiflood
        this.setupCommands();
        this.setupEvents();
    }

    setupCommands() {
        // Lock commands
        this.bot.onText(/^\/lock(@\w+)?(\s+(.+))?$/i, this.handleLock.bind(this));
        this.bot.onText(/^\/unlock(@\w+)?(\s+(.+))?$/i, this.handleUnlock.bind(this));
        this.bot.onText(/^\/locks(@\w+)?$/i, this.handleListLocks.bind(this));
        this.bot.onText(/^\/locktypes(@\w+)?$/i, this.handleLockTypes.bind(this));
        
        // Antiflood commands
        this.bot.onText(/^\/antiflood(@\w+)?(\s+(on|off|yes|no|true|false|\d+))?$/i, this.handleAntiflood.bind(this));
    }

    setupEvents() {
        // Check all messages for locks
        this.bot.on('message', this.handleMessageCheck.bind(this));
    }

    async handleLock(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const lockType = match[3];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan locks!');
        }

        if (!lockType) {
            return this.bot.sendMessage(chatId, '❌ Format: `/lock <type>`\nGunakan `/locktypes` untuk melihat jenis lock yang tersedia.', { parse_mode: 'Markdown' });
        }

        const validLocks = this.getValidLockTypes();
        const lowerLockType = lockType.toLowerCase();

        if (!validLocks.includes(lowerLockType)) {
            return this.bot.sendMessage(chatId, `❌ Lock type "${lockType}" tidak valid!\nGunakan \`/locktypes\` untuk melihat jenis lock yang tersedia.`, { parse_mode: 'Markdown' });
        }

        const chatLocks = this.getLockSettings(chatId);
        chatLocks[lowerLockType] = true;
        this.lockSettings.set(chatId, chatLocks);

        this.bot.sendMessage(chatId, `🔒 Lock "${lockType}" berhasil diaktifkan!`);
    }

    async handleUnlock(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const lockType = match[3];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan locks!');
        }

        if (!lockType) {
            return this.bot.sendMessage(chatId, '❌ Format: `/unlock <type>`', { parse_mode: 'Markdown' });
        }

        const validLocks = this.getValidLockTypes();
        const lowerLockType = lockType.toLowerCase();

        if (!validLocks.includes(lowerLockType)) {
            return this.bot.sendMessage(chatId, `❌ Lock type "${lockType}" tidak valid!`);
        }

        const chatLocks = this.getLockSettings(chatId);
        chatLocks[lowerLockType] = false;
        this.lockSettings.set(chatId, chatLocks);

        this.bot.sendMessage(chatId, `🔓 Lock "${lockType}" berhasil dinonaktifkan!`);
    }

    async handleListLocks(msg) {
        const chatId = msg.chat.id;
        const chatLocks = this.getLockSettings(chatId);
        
        let locksList = `🔒 **Lock Status di ${msg.chat.title}:**\n\n`;
        
        const lockTypes = this.getValidLockTypes();
        const activeLocks = [];
        const inactiveLocks = [];

        lockTypes.forEach(lockType => {
            if (chatLocks[lockType]) {
                activeLocks.push(lockType);
            } else {
                inactiveLocks.push(lockType);
            }
        });

        if (activeLocks.length > 0) {
            locksList += `✅ **Aktif:**\n`;
            activeLocks.forEach(lock => {
                locksList += `• ${lock}\n`;
            });
            locksList += '\n';
        }

        if (inactiveLocks.length > 0) {
            locksList += `❌ **Nonaktif:**\n`;
            inactiveLocks.forEach(lock => {
                locksList += `• ${lock}\n`;
            });
        }

        this.bot.sendMessage(chatId, locksList, { parse_mode: 'Markdown' });
    }

    async handleLockTypes(msg) {
        const chatId = msg.chat.id;
        
        const lockTypesText = `🔒 **Jenis Lock yang Tersedia:**\n\n` +
            `📝 **Text & Media:**\n` +
            `• \`text\` - Pesan teks biasa\n` +
            `• \`media\` - Semua media (foto, video, dll)\n` +
            `• \`photo\` - Foto\n` +
            `• \`video\` - Video\n` +
            `• \`audio\` - Audio\n` +
            `• \`voice\` - Voice note\n` +
            `• \`document\` - Dokumen/file\n` +
            `• \`sticker\` - Sticker\n` +
            `• \`gif\` - GIF/animasi\n\n` +
            `🔗 **Links & Forward:**\n` +
            `• \`url\` - Link/URL\n` +
            `• \`forward\` - Pesan forward\n\n` +
            `👥 **User Actions:**\n` +
            `• \`mention\` - Mention user (@username)\n` +
            `• \`hashtag\` - Hashtag (#tag)\n\n` +
            `💬 **Chat Features:**\n` +
            `• \`poll\` - Polling\n` +
            `• \`game\` - Game\n` +
            `• \`location\` - Lokasi\n` +
            `• \`contact\` - Kontak\n\n` +
            `**Cara pakai:**\n` +
            `• \`/lock <type>\` - Aktifkan lock\n` +
            `• \`/unlock <type>\` - Nonaktifkan lock\n` +
            `• \`/locks\` - Lihat status semua lock`;

        this.bot.sendMessage(chatId, lockTypesText, { parse_mode: 'Markdown' });
    }

    async handleAntiflood(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const setting = match[3];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa mengatur antiflood!');
        }

        const chatLocks = this.getLockSettings(chatId);

        if (!setting) {
            const status = chatLocks.antifloodEnabled ? `Aktif (${chatLocks.antifloodLimit} pesan/10 detik)` : 'Nonaktif';
            return this.bot.sendMessage(chatId, `🌊 Antiflood saat ini: **${status}**`, { parse_mode: 'Markdown' });
        }

        if (['on', 'yes', 'true'].includes(setting.toLowerCase())) {
            chatLocks.antifloodEnabled = true;
            chatLocks.antifloodLimit = chatLocks.antifloodLimit || 5;
            this.lockSettings.set(chatId, chatLocks);
            this.bot.sendMessage(chatId, `✅ Antiflood diaktifkan! Limit: ${chatLocks.antifloodLimit} pesan per 10 detik.`);
        } else if (['off', 'no', 'false'].includes(setting.toLowerCase())) {
            chatLocks.antifloodEnabled = false;
            this.lockSettings.set(chatId, chatLocks);
            this.bot.sendMessage(chatId, '✅ Antiflood dinonaktifkan!');
        } else if (/^\d+$/.test(setting)) {
            const limit = parseInt(setting);
            if (limit < 2 || limit > 20) {
                return this.bot.sendMessage(chatId, '❌ Limit antiflood harus antara 2-20 pesan!');
            }
            chatLocks.antifloodEnabled = true;
            chatLocks.antifloodLimit = limit;
            this.lockSettings.set(chatId, chatLocks);
            this.bot.sendMessage(chatId, `✅ Antiflood diaktifkan dengan limit ${limit} pesan per 10 detik!`);
        } else {
            this.bot.sendMessage(chatId, '❌ Format: `/antiflood on/off` atau `/antiflood <angka>`', { parse_mode: 'Markdown' });
        }
    }

    async handleMessageCheck(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Skip if private chat, from bot, or from admin
        if (msg.chat.type === 'private' || msg.from.is_bot) return;
        if (await this.isUserAdmin(chatId, userId)) return;

        const chatLocks = this.getLockSettings(chatId);

        // Check antiflood first
        if (chatLocks.antifloodEnabled) {
            if (await this.checkAntiflood(chatId, userId, chatLocks.antifloodLimit)) {
                return; // User was muted for flooding
            }
        }

        // Check locks
        const violations = this.checkMessageViolations(msg, chatLocks);
        
        if (violations.length > 0) {
            try {
                await this.bot.deleteMessage(chatId, msg.message_id);
                
                const violationText = violations.join(', ');
                const warningMsg = await this.bot.sendMessage(
                    chatId, 
                    `⚠️ ${this.getUserName(msg.from)}, pesan dihapus karena melanggar lock: ${violationText}`,
                    { reply_to_message_id: msg.message_id }
                );

                // Auto delete warning after 5 seconds
                setTimeout(() => {
                    this.bot.deleteMessage(chatId, warningMsg.message_id).catch(() => {});
                }, 5000);

            } catch (error) {
                console.error('Lock violation handling error:', error);
            }
        }
    }

    async checkAntiflood(chatId, userId, limit) {
        const now = Date.now();
        const userKey = `${chatId}_${userId}`;
        
        if (!this.userMessageCount.has(userKey)) {
            this.userMessageCount.set(userKey, []);
        }

        const userMessages = this.userMessageCount.get(userKey);
        
        // Remove messages older than 10 seconds
        const recentMessages = userMessages.filter(timestamp => now - timestamp < 10000);
        recentMessages.push(now);
        
        this.userMessageCount.set(userKey, recentMessages);

        if (recentMessages.length > limit) {
            try {
                // Mute user for 5 minutes
                await this.bot.restrictChatMember(chatId, userId, {
                    can_send_messages: false,
                    can_send_media_messages: false,
                    can_send_polls: false,
                    can_send_other_messages: false,
                    can_add_web_page_previews: false,
                    until_date: Math.floor(Date.now() / 1000) + 300 // 5 minutes
                });

                const warningMsg = await this.bot.sendMessage(
                    chatId,
                    `🌊 User dimute 5 menit karena flooding! (${recentMessages.length} pesan dalam 10 detik)`
                );

                // Clear user message count
                this.userMessageCount.delete(userKey);

                // Auto delete warning after 10 seconds
                setTimeout(() => {
                    this.bot.deleteMessage(chatId, warningMsg.message_id).catch(() => {});
                }, 10000);

                return true;
            } catch (error) {
                console.error('Antiflood mute error:', error);
            }
        }

        return false;
    }

    checkMessageViolations(msg, chatLocks) {
        const violations = [];

        // Check text lock
        if (chatLocks.text && msg.text && !msg.text.startsWith('/')) {
            violations.push('text');
        }

        // Check media locks
        if (chatLocks.media && (msg.photo || msg.video || msg.audio || msg.voice || msg.document || msg.sticker)) {
            violations.push('media');
        }

        if (chatLocks.photo && msg.photo) violations.push('photo');
        if (chatLocks.video && msg.video) violations.push('video');
        if (chatLocks.audio && msg.audio) violations.push('audio');
        if (chatLocks.voice && msg.voice) violations.push('voice');
        if (chatLocks.document && msg.document) violations.push('document');
        if (chatLocks.sticker && msg.sticker) violations.push('sticker');
        if (chatLocks.gif && msg.animation) violations.push('gif');

        // Check URL lock
        if (chatLocks.url && (msg.text || msg.caption)) {
            const text = msg.text || msg.caption;
            const urlRegex = /(https?:\/\/[^\s]+)/gi;
            if (urlRegex.test(text)) {
                violations.push('url');
            }
        }

        // Check forward lock
        if (chatLocks.forward && msg.forward_from) {
            violations.push('forward');
        }

        // Check mention lock
        if (chatLocks.mention && msg.entities) {
            const hasMention = msg.entities.some(entity => entity.type === 'mention' || entity.type === 'text_mention');
            if (hasMention) violations.push('mention');
        }

        // Check hashtag lock
        if (chatLocks.hashtag && msg.entities) {
            const hasHashtag = msg.entities.some(entity => entity.type === 'hashtag');
            if (hasHashtag) violations.push('hashtag');
        }

        // Check other locks
        if (chatLocks.poll && msg.poll) violations.push('poll');
        if (chatLocks.game && msg.game) violations.push('game');
        if (chatLocks.location && msg.location) violations.push('location');
        if (chatLocks.contact && msg.contact) violations.push('contact');

        return violations;
    }

    getLockSettings(chatId) {
        if (!this.lockSettings.has(chatId)) {
            this.lockSettings.set(chatId, {
                antifloodEnabled: false,
                antifloodLimit: 5
            });
        }
        return this.lockSettings.get(chatId);
    }

    getValidLockTypes() {
        return [
            'text', 'media', 'photo', 'video', 'audio', 'voice', 'document', 
            'sticker', 'gif', 'url', 'forward', 'mention', 'hashtag', 
            'poll', 'game', 'location', 'contact'
        ];
    }

    getUserName(user) {
        return user.first_name + (user.last_name ? ` ${user.last_name}` : '');
    }

    async isUserAdmin(chatId, userId) {
        try {
            const member = await this.bot.getChatMember(chatId, userId);
            return ['creator', 'administrator'].includes(member.status);
        } catch (error) {
            return false;
        }
    }
}

module.exports = LocksModule;
