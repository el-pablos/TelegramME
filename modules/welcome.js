/**
 * Welcome/Goodbye Module - Rose Bot Style
 * Handles welcome and goodbye messages
 */

class WelcomeModule {
    constructor(bot) {
        this.bot = bot;
        this.welcomeSettings = new Map(); // Store settings in memory (use database in production)
        this.setupCommands();
        this.setupEvents();
    }

    setupCommands() {
        // Welcome commands
        this.bot.onText(/^\/welcome(@\w+)?(\s+(on|off|yes|no|true|false))?$/i, this.handleWelcomeToggle.bind(this));
        this.bot.onText(/^\/setwelcome(@\w+)?(\s+(.+))?$/i, this.handleSetWelcome.bind(this));
        this.bot.onText(/^\/resetwelcome(@\w+)?$/i, this.handleResetWelcome.bind(this));
        this.bot.onText(/^\/welcomehelp(@\w+)?$/i, this.handleWelcomeHelp.bind(this));
        
        // Goodbye commands
        this.bot.onText(/^\/goodbye(@\w+)?(\s+(on|off|yes|no|true|false))?$/i, this.handleGoodbyeToggle.bind(this));
        this.bot.onText(/^\/setgoodbye(@\w+)?(\s+(.+))?$/i, this.handleSetGoodbye.bind(this));
        this.bot.onText(/^\/resetgoodbye(@\w+)?$/i, this.handleResetGoodbye.bind(this));
        
        // Clean welcome
        this.bot.onText(/^\/cleanwelcome(@\w+)?(\s+(on|off|yes|no|true|false))?$/i, this.handleCleanWelcome.bind(this));
    }

    setupEvents() {
        // Handle new members
        this.bot.on('new_chat_members', this.handleNewMembers.bind(this));
        
        // Handle member left
        this.bot.on('left_chat_member', this.handleMemberLeft.bind(this));
    }

    async handleWelcomeToggle(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const setting = match[3];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const chatSettings = this.getWelcomeSettings(chatId);

        if (!setting) {
            // Show current status
            const status = chatSettings.welcomeEnabled ? 'Aktif' : 'Nonaktif';
            return this.bot.sendMessage(chatId, `🎉 Welcome message saat ini: **${status}**`, { parse_mode: 'Markdown' });
        }

        const enableValues = ['on', 'yes', 'true'];
        const enable = enableValues.includes(setting.toLowerCase());

        chatSettings.welcomeEnabled = enable;
        this.welcomeSettings.set(chatId, chatSettings);

        const statusText = enable ? 'diaktifkan' : 'dinonaktifkan';
        this.bot.sendMessage(chatId, `✅ Welcome message berhasil ${statusText}!`);
    }

    async handleSetWelcome(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const welcomeText = match[3];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        if (!welcomeText) {
            return this.bot.sendMessage(chatId, '❌ Format: `/setwelcome <pesan welcome>`\n\nGunakan `/welcomehelp` untuk melihat variabel yang tersedia.', { parse_mode: 'Markdown' });
        }

        const chatSettings = this.getWelcomeSettings(chatId);
        chatSettings.welcomeText = welcomeText;
        chatSettings.welcomeEnabled = true;
        this.welcomeSettings.set(chatId, chatSettings);

        this.bot.sendMessage(chatId, '✅ Welcome message berhasil diatur!');
    }

    async handleResetWelcome(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const chatSettings = this.getWelcomeSettings(chatId);
        chatSettings.welcomeText = this.getDefaultWelcomeText();
        this.welcomeSettings.set(chatId, chatSettings);

        this.bot.sendMessage(chatId, '✅ Welcome message berhasil direset ke default!');
    }

    async handleWelcomeHelp(msg) {
        const chatId = msg.chat.id;

        const helpText = `🎉 **Welcome Message Help**\n\n` +
            `**Variabel yang tersedia:**\n` +
            `• \`{first}\` - Nama depan user\n` +
            `• \`{last}\` - Nama belakang user\n` +
            `• \`{fullname}\` - Nama lengkap user\n` +
            `• \`{username}\` - Username user\n` +
            `• \`{mention}\` - Mention user\n` +
            `• \`{id}\` - User ID\n` +
            `• \`{chatname}\` - Nama grup\n` +
            `• \`{count}\` - Jumlah member grup\n\n` +
            `**Contoh:**\n` +
            `\`/setwelcome Selamat datang {mention} di {chatname}! Kamu adalah member ke-{count}.\`\n\n` +
            `**Commands:**\n` +
            `• \`/welcome on/off\` - Aktifkan/nonaktifkan welcome\n` +
            `• \`/setwelcome <text>\` - Set welcome message\n` +
            `• \`/resetwelcome\` - Reset ke default\n` +
            `• \`/cleanwelcome on/off\` - Auto hapus welcome lama`;

        this.bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
    }

    async handleGoodbyeToggle(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const setting = match[3];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const chatSettings = this.getWelcomeSettings(chatId);

        if (!setting) {
            const status = chatSettings.goodbyeEnabled ? 'Aktif' : 'Nonaktif';
            return this.bot.sendMessage(chatId, `👋 Goodbye message saat ini: **${status}**`, { parse_mode: 'Markdown' });
        }

        const enableValues = ['on', 'yes', 'true'];
        const enable = enableValues.includes(setting.toLowerCase());

        chatSettings.goodbyeEnabled = enable;
        this.welcomeSettings.set(chatId, chatSettings);

        const statusText = enable ? 'diaktifkan' : 'dinonaktifkan';
        this.bot.sendMessage(chatId, `✅ Goodbye message berhasil ${statusText}!`);
    }

    async handleSetGoodbye(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const goodbyeText = match[3];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        if (!goodbyeText) {
            return this.bot.sendMessage(chatId, '❌ Format: `/setgoodbye <pesan goodbye>`', { parse_mode: 'Markdown' });
        }

        const chatSettings = this.getWelcomeSettings(chatId);
        chatSettings.goodbyeText = goodbyeText;
        chatSettings.goodbyeEnabled = true;
        this.welcomeSettings.set(chatId, chatSettings);

        this.bot.sendMessage(chatId, '✅ Goodbye message berhasil diatur!');
    }

    async handleResetGoodbye(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const chatSettings = this.getWelcomeSettings(chatId);
        chatSettings.goodbyeText = this.getDefaultGoodbyeText();
        this.welcomeSettings.set(chatId, chatSettings);

        this.bot.sendMessage(chatId, '✅ Goodbye message berhasil direset ke default!');
    }

    async handleCleanWelcome(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const setting = match[3];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const chatSettings = this.getWelcomeSettings(chatId);

        if (!setting) {
            const status = chatSettings.cleanWelcome ? 'Aktif' : 'Nonaktif';
            return this.bot.sendMessage(chatId, `🧹 Clean welcome saat ini: **${status}**`, { parse_mode: 'Markdown' });
        }

        const enableValues = ['on', 'yes', 'true'];
        const enable = enableValues.includes(setting.toLowerCase());

        chatSettings.cleanWelcome = enable;
        this.welcomeSettings.set(chatId, chatSettings);

        const statusText = enable ? 'diaktifkan' : 'dinonaktifkan';
        this.bot.sendMessage(chatId, `✅ Clean welcome berhasil ${statusText}!`);
    }

    async handleNewMembers(msg) {
        const chatId = msg.chat.id;
        const chatSettings = this.getWelcomeSettings(chatId);

        if (!chatSettings.welcomeEnabled) return;

        // Clean previous welcome if enabled
        if (chatSettings.cleanWelcome && chatSettings.lastWelcomeMessageId) {
            try {
                await this.bot.deleteMessage(chatId, chatSettings.lastWelcomeMessageId);
            } catch (error) {
                // Ignore error if message already deleted
            }
        }

        for (const newMember of msg.new_chat_members) {
            if (newMember.is_bot) continue; // Skip bots

            try {
                const chatInfo = await this.bot.getChat(chatId);
                const memberCount = await this.bot.getChatMemberCount(chatId);
                
                const welcomeText = this.formatWelcomeText(
                    chatSettings.welcomeText,
                    newMember,
                    chatInfo,
                    memberCount
                );

                const sentMessage = await this.bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
                
                if (chatSettings.cleanWelcome) {
                    chatSettings.lastWelcomeMessageId = sentMessage.message_id;
                    this.welcomeSettings.set(chatId, chatSettings);
                }

            } catch (error) {
                console.error('Welcome message error:', error);
            }
        }
    }

    async handleMemberLeft(msg) {
        const chatId = msg.chat.id;
        const leftMember = msg.left_chat_member;
        const chatSettings = this.getWelcomeSettings(chatId);

        if (!chatSettings.goodbyeEnabled || leftMember.is_bot) return;

        try {
            const chatInfo = await this.bot.getChat(chatId);
            const memberCount = await this.bot.getChatMemberCount(chatId);
            
            const goodbyeText = this.formatWelcomeText(
                chatSettings.goodbyeText,
                leftMember,
                chatInfo,
                memberCount
            );

            await this.bot.sendMessage(chatId, goodbyeText, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Goodbye message error:', error);
        }
    }

    getWelcomeSettings(chatId) {
        if (!this.welcomeSettings.has(chatId)) {
            this.welcomeSettings.set(chatId, {
                welcomeEnabled: true,
                welcomeText: this.getDefaultWelcomeText(),
                goodbyeEnabled: false,
                goodbyeText: this.getDefaultGoodbyeText(),
                cleanWelcome: false,
                lastWelcomeMessageId: null
            });
        }
        return this.welcomeSettings.get(chatId);
    }

    getDefaultWelcomeText() {
        return `🎉 Selamat datang {mention} di {chatname}!\n\nKamu adalah member ke-{count}. Semoga betah ya! 😊`;
    }

    getDefaultGoodbyeText() {
        return `👋 {fullname} telah meninggalkan {chatname}.\n\nSampai jumpa lagi! 😢`;
    }

    formatWelcomeText(text, user, chat, memberCount) {
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const fullName = firstName + (lastName ? ` ${lastName}` : '');
        const username = user.username ? `@${user.username}` : fullName;
        const mention = `[${firstName}](tg://user?id=${user.id})`;

        return text
            .replace(/{first}/g, firstName)
            .replace(/{last}/g, lastName)
            .replace(/{fullname}/g, fullName)
            .replace(/{username}/g, username)
            .replace(/{mention}/g, mention)
            .replace(/{id}/g, user.id)
            .replace(/{chatname}/g, chat.title || 'grup ini')
            .replace(/{count}/g, memberCount);
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

module.exports = WelcomeModule;
