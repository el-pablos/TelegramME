/**
 * Admin Management Module - Rose Bot Style
 * Handles admin-related commands and functions
 */

class AdminModule {
    constructor(bot) {
        this.bot = bot;
        this.setupCommands();
    }

    setupCommands() {
        // Admin list command
        this.bot.onText(/^\/admins?(@\w+)?$/i, this.handleAdminList.bind(this));
        
        // Promote user command
        this.bot.onText(/^\/promote(@\w+)?(\s+(.+))?$/i, this.handlePromote.bind(this));
        
        // Demote user command
        this.bot.onText(/^\/demote(@\w+)?(\s+(.+))?$/i, this.handleDemote.bind(this));
        
        // Set admin title
        this.bot.onText(/^\/title(@\w+)?(\s+(.+))?$/i, this.handleSetTitle.bind(this));
    }

    async handleAdminList(msg) {
        const chatId = msg.chat.id;
        const chatType = msg.chat.type;

        if (chatType === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        try {
            const admins = await this.bot.getChatAdministrators(chatId);
            let adminText = `👥 *Admin di ${msg.chat.title}:*\n\n`;

            admins.forEach((admin, index) => {
                const user = admin.user;
                const status = admin.status;
                const title = admin.custom_title || '';
                
                let adminInfo = `${index + 1}. `;
                
                if (user.first_name) {
                    adminInfo += `[${user.first_name}`;
                    if (user.last_name) {
                        adminInfo += ` ${user.last_name}`;
                    }
                    adminInfo += `](tg://user?id=${user.id})`;
                } else {
                    adminInfo += `User ${user.id}`;
                }

                if (title) {
                    adminInfo += ` - _${title}_`;
                }

                if (status === 'creator') {
                    adminInfo += ' 👑';
                } else if (user.is_bot) {
                    adminInfo += ' 🤖';
                }

                adminText += adminInfo + '\n';
            });

            this.bot.sendMessage(chatId, adminText, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Admin list error:', error);
            this.bot.sendMessage(chatId, '❌ Gagal mengambil daftar admin. Pastikan bot adalah admin!');
        }
    }

    async handlePromote(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const chatType = msg.chat.type;

        if (chatType === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        try {
            // Check if user is admin
            const userMember = await this.bot.getChatMember(chatId, userId);
            if (!['creator', 'administrator'].includes(userMember.status)) {
                return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
            }

            let targetUser = null;
            let targetUserId = null;

            // Check if replying to a message
            if (msg.reply_to_message) {
                targetUser = msg.reply_to_message.from;
                targetUserId = targetUser.id;
            }
            // Check if mentioning a user
            else if (msg.entities) {
                const mention = msg.entities.find(entity => entity.type === 'mention' || entity.type === 'text_mention');
                if (mention && mention.type === 'text_mention') {
                    targetUser = mention.user;
                    targetUserId = targetUser.id;
                }
            }

            if (!targetUser) {
                return this.bot.sendMessage(chatId, '❌ Reply ke user yang ingin dipromote atau mention user tersebut!');
            }

            // Promote user
            await this.bot.promoteChatMember(chatId, targetUserId, {
                can_change_info: true,
                can_delete_messages: true,
                can_invite_users: true,
                can_restrict_members: true,
                can_pin_messages: true,
                can_promote_members: false
            });

            const userName = targetUser.first_name + (targetUser.last_name ? ` ${targetUser.last_name}` : '');
            this.bot.sendMessage(chatId, `✅ ${userName} berhasil dipromote menjadi admin!`);

        } catch (error) {
            console.error('Promote error:', error);
            this.bot.sendMessage(chatId, '❌ Gagal promote user. Pastikan bot memiliki permission yang cukup!');
        }
    }

    async handleDemote(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const chatType = msg.chat.type;

        if (chatType === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        try {
            // Check if user is admin
            const userMember = await this.bot.getChatMember(chatId, userId);
            if (!['creator', 'administrator'].includes(userMember.status)) {
                return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
            }

            let targetUser = null;
            let targetUserId = null;

            // Check if replying to a message
            if (msg.reply_to_message) {
                targetUser = msg.reply_to_message.from;
                targetUserId = targetUser.id;
            }
            // Check if mentioning a user
            else if (msg.entities) {
                const mention = msg.entities.find(entity => entity.type === 'mention' || entity.type === 'text_mention');
                if (mention && mention.type === 'text_mention') {
                    targetUser = mention.user;
                    targetUserId = targetUser.id;
                }
            }

            if (!targetUser) {
                return this.bot.sendMessage(chatId, '❌ Reply ke user yang ingin didemote atau mention user tersebut!');
            }

            // Demote user
            await this.bot.promoteChatMember(chatId, targetUserId, {
                can_change_info: false,
                can_delete_messages: false,
                can_invite_users: false,
                can_restrict_members: false,
                can_pin_messages: false,
                can_promote_members: false
            });

            const userName = targetUser.first_name + (targetUser.last_name ? ` ${targetUser.last_name}` : '');
            this.bot.sendMessage(chatId, `✅ ${userName} berhasil didemote dari admin!`);

        } catch (error) {
            console.error('Demote error:', error);
            this.bot.sendMessage(chatId, '❌ Gagal demote user. Pastikan bot memiliki permission yang cukup!');
        }
    }

    async handleSetTitle(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const chatType = msg.chat.type;
        const title = match[3];

        if (chatType === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!title) {
            return this.bot.sendMessage(chatId, '❌ Format: `/title <title>` (reply ke admin yang ingin diubah titlenya)', { parse_mode: 'Markdown' });
        }

        try {
            // Check if user is admin
            const userMember = await this.bot.getChatMember(chatId, userId);
            if (!['creator', 'administrator'].includes(userMember.status)) {
                return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menggunakan command ini!');
            }

            let targetUser = null;
            let targetUserId = null;

            // Check if replying to a message
            if (msg.reply_to_message) {
                targetUser = msg.reply_to_message.from;
                targetUserId = targetUser.id;
            } else {
                return this.bot.sendMessage(chatId, '❌ Reply ke admin yang ingin diubah titlenya!');
            }

            // Set admin title
            await this.bot.setChatAdministratorCustomTitle(chatId, targetUserId, title);

            const userName = targetUser.first_name + (targetUser.last_name ? ` ${targetUser.last_name}` : '');
            this.bot.sendMessage(chatId, `✅ Title admin ${userName} berhasil diubah menjadi: "${title}"`);

        } catch (error) {
            console.error('Set title error:', error);
            this.bot.sendMessage(chatId, '❌ Gagal mengubah title admin. Pastikan user adalah admin dan bot memiliki permission!');
        }
    }

    // Helper function to check if user is admin
    async isUserAdmin(chatId, userId) {
        try {
            const member = await this.bot.getChatMember(chatId, userId);
            return ['creator', 'administrator'].includes(member.status);
        } catch (error) {
            return false;
        }
    }
}

module.exports = AdminModule;
