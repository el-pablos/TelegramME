/**
 * Moderation Module - Rose Bot Style
 * Handles moderation commands like ban, mute, kick, warn
 */

class ModerationModule {
    constructor(bot) {
        this.bot = bot;
        this.warnings = new Map(); // Store warnings in memory (use database in production)
        this.setupCommands();
    }

    setupCommands() {
        // Ban commands
        this.bot.onText(/^\/ban(@\w+)?(\s+(.+))?$/i, this.handleBan.bind(this));
        this.bot.onText(/^\/tban(@\w+)?(\s+(.+))?$/i, this.handleTempBan.bind(this));
        this.bot.onText(/^\/unban(@\w+)?(\s+(.+))?$/i, this.handleUnban.bind(this));
        
        // Mute commands
        this.bot.onText(/^\/mute(@\w+)?(\s+(.+))?$/i, this.handleMute.bind(this));
        this.bot.onText(/^\/tmute(@\w+)?(\s+(.+))?$/i, this.handleTempMute.bind(this));
        this.bot.onText(/^\/unmute(@\w+)?(\s+(.+))?$/i, this.handleUnmute.bind(this));
        
        // Kick command
        this.bot.onText(/^\/kick(@\w+)?(\s+(.+))?$/i, this.handleKick.bind(this));
        
        // Warning commands
        this.bot.onText(/^\/warn(@\w+)?(\s+(.+))?$/i, this.handleWarn.bind(this));
        this.bot.onText(/^\/warns(@\w+)?(\s+(.+))?$/i, this.handleWarns.bind(this));
        this.bot.onText(/^\/resetwarn(@\w+)?(\s+(.+))?$/i, this.handleResetWarn.bind(this));
        
        // Purge commands
        this.bot.onText(/^\/purge(@\w+)?$/i, this.handlePurge.bind(this));
        this.bot.onText(/^\/del(@\w+)?$/i, this.handleDelete.bind(this));
    }

    async handleBan(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const reason = match[3] || 'Tidak ada alasan';

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const targetUser = await this.getTargetUser(msg);
        if (!targetUser) {
            return this.bot.sendMessage(chatId, '❌ Reply ke user yang ingin diban atau mention user tersebut!');
        }

        try {
            await this.bot.banChatMember(chatId, targetUser.id);
            
            const userName = this.getUserName(targetUser);
            let banText = `🔨 *User Dibanned*\n\n`;
            banText += `👤 **User:** ${userName}\n`;
            banText += `🆔 **ID:** \`${targetUser.id}\`\n`;
            banText += `👮 **Admin:** ${this.getUserName(msg.from)}\n`;
            banText += `📝 **Alasan:** ${reason}`;

            this.bot.sendMessage(chatId, banText, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Ban error:', error);
            this.bot.sendMessage(chatId, '❌ Gagal ban user. Pastikan bot memiliki permission yang cukup!');
        }
    }

    async handleTempBan(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const args = match[3] ? match[3].split(' ') : [];
        const timeStr = args[0];
        const reason = args.slice(1).join(' ') || 'Tidak ada alasan';

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!timeStr) {
            return this.bot.sendMessage(chatId, '❌ Format: `/tban <waktu> [alasan]`\nContoh: `/tban 1d spam`', { parse_mode: 'Markdown' });
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const targetUser = await this.getTargetUser(msg);
        if (!targetUser) {
            return this.bot.sendMessage(chatId, '❌ Reply ke user yang ingin diban atau mention user tersebut!');
        }

        const duration = this.parseTime(timeStr);
        if (!duration) {
            return this.bot.sendMessage(chatId, '❌ Format waktu salah! Gunakan: 1m, 1h, 1d, 1w');
        }

        try {
            const untilDate = Math.floor(Date.now() / 1000) + duration;
            await this.bot.banChatMember(chatId, targetUser.id, { until_date: untilDate });
            
            const userName = this.getUserName(targetUser);
            let banText = `⏰ *User Temporary Ban*\n\n`;
            banText += `👤 **User:** ${userName}\n`;
            banText += `🆔 **ID:** \`${targetUser.id}\`\n`;
            banText += `👮 **Admin:** ${this.getUserName(msg.from)}\n`;
            banText += `⏱️ **Durasi:** ${timeStr}\n`;
            banText += `📝 **Alasan:** ${reason}`;

            this.bot.sendMessage(chatId, banText, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Temp ban error:', error);
            this.bot.sendMessage(chatId, '❌ Gagal temporary ban user!');
        }
    }

    async handleUnban(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const targetUser = await this.getTargetUser(msg);
        if (!targetUser) {
            return this.bot.sendMessage(chatId, '❌ Reply ke user yang ingin diunban atau mention user tersebut!');
        }

        try {
            await this.bot.unbanChatMember(chatId, targetUser.id);
            
            const userName = this.getUserName(targetUser);
            this.bot.sendMessage(chatId, `✅ ${userName} berhasil diunban!`);

        } catch (error) {
            console.error('Unban error:', error);
            this.bot.sendMessage(chatId, '❌ Gagal unban user!');
        }
    }

    async handleMute(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const reason = match[3] || 'Tidak ada alasan';

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const targetUser = await this.getTargetUser(msg);
        if (!targetUser) {
            return this.bot.sendMessage(chatId, '❌ Reply ke user yang ingin dimute atau mention user tersebut!');
        }

        try {
            await this.bot.restrictChatMember(chatId, targetUser.id, {
                can_send_messages: false,
                can_send_media_messages: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false,
                can_change_info: false,
                can_invite_users: false,
                can_pin_messages: false
            });
            
            const userName = this.getUserName(targetUser);
            let muteText = `🔇 *User Dimute*\n\n`;
            muteText += `👤 **User:** ${userName}\n`;
            muteText += `🆔 **ID:** \`${targetUser.id}\`\n`;
            muteText += `👮 **Admin:** ${this.getUserName(msg.from)}\n`;
            muteText += `📝 **Alasan:** ${reason}`;

            this.bot.sendMessage(chatId, muteText, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Mute error:', error);
            this.bot.sendMessage(chatId, '❌ Gagal mute user!');
        }
    }

    async handleTempMute(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const args = match[3] ? match[3].split(' ') : [];
        const timeStr = args[0];
        const reason = args.slice(1).join(' ') || 'Tidak ada alasan';

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!timeStr) {
            return this.bot.sendMessage(chatId, '❌ Format: `/tmute <waktu> [alasan]`\nContoh: `/tmute 1h spam`', { parse_mode: 'Markdown' });
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const targetUser = await this.getTargetUser(msg);
        if (!targetUser) {
            return this.bot.sendMessage(chatId, '❌ Reply ke user yang ingin dimute atau mention user tersebut!');
        }

        const duration = this.parseTime(timeStr);
        if (!duration) {
            return this.bot.sendMessage(chatId, '❌ Format waktu salah! Gunakan: 1m, 1h, 1d, 1w');
        }

        try {
            const untilDate = Math.floor(Date.now() / 1000) + duration;
            await this.bot.restrictChatMember(chatId, targetUser.id, {
                can_send_messages: false,
                can_send_media_messages: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false,
                can_change_info: false,
                can_invite_users: false,
                can_pin_messages: false,
                until_date: untilDate
            });
            
            const userName = this.getUserName(targetUser);
            let muteText = `⏰ *User Temporary Mute*\n\n`;
            muteText += `👤 **User:** ${userName}\n`;
            muteText += `🆔 **ID:** \`${targetUser.id}\`\n`;
            muteText += `👮 **Admin:** ${this.getUserName(msg.from)}\n`;
            muteText += `⏱️ **Durasi:** ${timeStr}\n`;
            muteText += `📝 **Alasan:** ${reason}`;

            this.bot.sendMessage(chatId, muteText, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Temp mute error:', error);
            this.bot.sendMessage(chatId, '❌ Gagal temporary mute user!');
        }
    }

    async handleUnmute(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const targetUser = await this.getTargetUser(msg);
        if (!targetUser) {
            return this.bot.sendMessage(chatId, '❌ Reply ke user yang ingin diunmute atau mention user tersebut!');
        }

        try {
            await this.bot.restrictChatMember(chatId, targetUser.id, {
                can_send_messages: true,
                can_send_media_messages: true,
                can_send_polls: true,
                can_send_other_messages: true,
                can_add_web_page_previews: true,
                can_change_info: false,
                can_invite_users: false,
                can_pin_messages: false
            });
            
            const userName = this.getUserName(targetUser);
            this.bot.sendMessage(chatId, `✅ ${userName} berhasil diunmute!`);

        } catch (error) {
            console.error('Unmute error:', error);
            this.bot.sendMessage(chatId, '❌ Gagal unmute user!');
        }
    }

    async handleKick(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const reason = match[3] || 'Tidak ada alasan';

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
        }

        const targetUser = await this.getTargetUser(msg);
        if (!targetUser) {
            return this.bot.sendMessage(chatId, '❌ Reply ke user yang ingin dikick atau mention user tersebut!');
        }

        try {
            await this.bot.banChatMember(chatId, targetUser.id);
            await this.bot.unbanChatMember(chatId, targetUser.id);
            
            const userName = this.getUserName(targetUser);
            let kickText = `👢 *User Dikick*\n\n`;
            kickText += `👤 **User:** ${userName}\n`;
            kickText += `🆔 **ID:** \`${targetUser.id}\`\n`;
            kickText += `👮 **Admin:** ${this.getUserName(msg.from)}\n`;
            kickText += `📝 **Alasan:** ${reason}`;

            this.bot.sendMessage(chatId, kickText, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Kick error:', error);
            this.bot.sendMessage(chatId, '❌ Gagal kick user!');
        }
    }

    // Helper functions
    async getTargetUser(msg) {
        if (msg.reply_to_message) {
            return msg.reply_to_message.from;
        }
        
        if (msg.entities) {
            const mention = msg.entities.find(entity => entity.type === 'text_mention');
            if (mention) {
                return mention.user;
            }
        }
        
        return null;
    }

    getUserName(user) {
        return user.first_name + (user.last_name ? ` ${user.last_name}` : '');
    }

    parseTime(timeStr) {
        const match = timeStr.match(/^(\d+)([mhdw])$/);
        if (!match) return null;
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        const multipliers = {
            'm': 60,           // minutes
            'h': 3600,         // hours
            'd': 86400,        // days
            'w': 604800        // weeks
        };
        
        return value * multipliers[unit];
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

module.exports = ModerationModule;
