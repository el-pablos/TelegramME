/**
 * Notes & Filters Module - Rose Bot Style
 * Handles notes (saved messages) and filters (auto-reply)
 */

class NotesModule {
    constructor(bot) {
        this.bot = bot;
        this.notes = new Map(); // Store notes in memory (use database in production)
        this.filters = new Map(); // Store filters in memory
        this.setupCommands();
        this.setupEvents();
    }

    setupCommands() {
        // Notes commands
        this.bot.onText(/^\/save(@\w+)?(\s+(\w+)(\s+(.+))?)?$/i, this.handleSaveNote.bind(this));
        this.bot.onText(/^\/get(@\w+)?(\s+(.+))?$/i, this.handleGetNote.bind(this));
        this.bot.onText(/^\/notes(@\w+)?$/i, this.handleListNotes.bind(this));
        this.bot.onText(/^\/clear(@\w+)?(\s+(.+))?$/i, this.handleClearNote.bind(this));
        this.bot.onText(/^\/saved(@\w+)?$/i, this.handleListNotes.bind(this));
        
        // Filters commands
        this.bot.onText(/^\/filter(@\w+)?(\s+(\w+)(\s+(.+))?)?$/i, this.handleAddFilter.bind(this));
        this.bot.onText(/^\/filters(@\w+)?$/i, this.handleListFilters.bind(this));
        this.bot.onText(/^\/stop(@\w+)?(\s+(.+))?$/i, this.handleStopFilter.bind(this));
        this.bot.onText(/^\/stopall(@\w+)?$/i, this.handleStopAllFilters.bind(this));
        
        // Note shortcuts (without /)
        this.bot.onText(/^#(\w+)$/i, this.handleNoteShortcut.bind(this));
    }

    setupEvents() {
        // Handle all messages for filters
        this.bot.on('message', this.handleFilterCheck.bind(this));
    }

    async handleSaveNote(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const noteName = match[3];
        const noteContent = match[5];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menyimpan notes!');
        }

        if (!noteName) {
            return this.bot.sendMessage(chatId, '❌ Format: `/save <nama> <konten>`\nContoh: `/save rules Dilarang spam!`', { parse_mode: 'Markdown' });
        }

        let content = noteContent;
        
        // If replying to a message, use that as content
        if (msg.reply_to_message && !noteContent) {
            const replyMsg = msg.reply_to_message;
            if (replyMsg.text) {
                content = replyMsg.text;
            } else if (replyMsg.caption) {
                content = replyMsg.caption;
            } else {
                content = '[Media/File]';
            }
        }

        if (!content) {
            return this.bot.sendMessage(chatId, '❌ Note harus memiliki konten! Reply ke pesan atau tulis konten setelah nama note.');
        }

        const chatNotes = this.getChatNotes(chatId);
        chatNotes[noteName.toLowerCase()] = {
            name: noteName,
            content: content,
            createdBy: userId,
            createdAt: new Date(),
            messageType: msg.reply_to_message ? this.getMessageType(msg.reply_to_message) : 'text'
        };

        this.notes.set(chatId, chatNotes);
        this.bot.sendMessage(chatId, `✅ Note "${noteName}" berhasil disimpan!`);
    }

    async handleGetNote(msg, match) {
        const chatId = msg.chat.id;
        const noteName = match[3];

        if (!noteName) {
            return this.bot.sendMessage(chatId, '❌ Format: `/get <nama>`\nContoh: `/get rules`', { parse_mode: 'Markdown' });
        }

        const chatNotes = this.getChatNotes(chatId);
        const note = chatNotes[noteName.toLowerCase()];

        if (!note) {
            return this.bot.sendMessage(chatId, `❌ Note "${noteName}" tidak ditemukan!`);
        }

        this.bot.sendMessage(chatId, note.content, { parse_mode: 'Markdown' });
    }

    async handleNoteShortcut(msg, match) {
        const chatId = msg.chat.id;
        const noteName = match[1];

        const chatNotes = this.getChatNotes(chatId);
        const note = chatNotes[noteName.toLowerCase()];

        if (note) {
            this.bot.sendMessage(chatId, note.content, { parse_mode: 'Markdown' });
        }
    }

    async handleListNotes(msg) {
        const chatId = msg.chat.id;
        const chatNotes = this.getChatNotes(chatId);
        const noteNames = Object.keys(chatNotes);

        if (noteNames.length === 0) {
            return this.bot.sendMessage(chatId, '📝 Tidak ada notes yang tersimpan di grup ini.');
        }

        let notesList = `📝 **Notes di ${msg.chat.title}:**\n\n`;
        noteNames.forEach((name, index) => {
            notesList += `${index + 1}. \`${chatNotes[name].name}\`\n`;
        });

        notesList += `\n💡 **Cara pakai:**\n`;
        notesList += `• \`/get <nama>\` - Ambil note\n`;
        notesList += `• \`#<nama>\` - Shortcut untuk ambil note\n`;
        notesList += `• \`/clear <nama>\` - Hapus note (admin only)`;

        this.bot.sendMessage(chatId, notesList, { parse_mode: 'Markdown' });
    }

    async handleClearNote(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const noteName = match[3];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menghapus notes!');
        }

        if (!noteName) {
            return this.bot.sendMessage(chatId, '❌ Format: `/clear <nama>`\nContoh: `/clear rules`', { parse_mode: 'Markdown' });
        }

        const chatNotes = this.getChatNotes(chatId);
        
        if (!chatNotes[noteName.toLowerCase()]) {
            return this.bot.sendMessage(chatId, `❌ Note "${noteName}" tidak ditemukan!`);
        }

        delete chatNotes[noteName.toLowerCase()];
        this.notes.set(chatId, chatNotes);
        this.bot.sendMessage(chatId, `✅ Note "${noteName}" berhasil dihapus!`);
    }

    async handleAddFilter(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const keyword = match[3];
        const response = match[5];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menambah filters!');
        }

        if (!keyword) {
            return this.bot.sendMessage(chatId, '❌ Format: `/filter <keyword> <response>`\nContoh: `/filter hello Halo juga!`', { parse_mode: 'Markdown' });
        }

        let filterResponse = response;
        
        // If replying to a message, use that as response
        if (msg.reply_to_message && !response) {
            const replyMsg = msg.reply_to_message;
            if (replyMsg.text) {
                filterResponse = replyMsg.text;
            } else if (replyMsg.caption) {
                filterResponse = replyMsg.caption;
            } else {
                filterResponse = '[Media/File]';
            }
        }

        if (!filterResponse) {
            return this.bot.sendMessage(chatId, '❌ Filter harus memiliki response! Reply ke pesan atau tulis response setelah keyword.');
        }

        const chatFilters = this.getChatFilters(chatId);
        chatFilters[keyword.toLowerCase()] = {
            keyword: keyword,
            response: filterResponse,
            createdBy: userId,
            createdAt: new Date()
        };

        this.filters.set(chatId, chatFilters);
        this.bot.sendMessage(chatId, `✅ Filter "${keyword}" berhasil ditambahkan!`);
    }

    async handleListFilters(msg) {
        const chatId = msg.chat.id;
        const chatFilters = this.getChatFilters(chatId);
        const filterKeywords = Object.keys(chatFilters);

        if (filterKeywords.length === 0) {
            return this.bot.sendMessage(chatId, '🔍 Tidak ada filters yang aktif di grup ini.');
        }

        let filtersList = `🔍 **Filters di ${msg.chat.title}:**\n\n`;
        filterKeywords.forEach((keyword, index) => {
            filtersList += `${index + 1}. \`${chatFilters[keyword].keyword}\`\n`;
        });

        filtersList += `\n💡 **Info:**\n`;
        filtersList += `• Bot akan otomatis reply jika ada yang mengirim keyword\n`;
        filtersList += `• \`/stop <keyword>\` - Hapus filter (admin only)`;

        this.bot.sendMessage(chatId, filtersList, { parse_mode: 'Markdown' });
    }

    async handleStopFilter(msg, match) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const keyword = match[3];

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menghapus filters!');
        }

        if (!keyword) {
            return this.bot.sendMessage(chatId, '❌ Format: `/stop <keyword>`\nContoh: `/stop hello`', { parse_mode: 'Markdown' });
        }

        const chatFilters = this.getChatFilters(chatId);
        
        if (!chatFilters[keyword.toLowerCase()]) {
            return this.bot.sendMessage(chatId, `❌ Filter "${keyword}" tidak ditemukan!`);
        }

        delete chatFilters[keyword.toLowerCase()];
        this.filters.set(chatId, chatFilters);
        this.bot.sendMessage(chatId, `✅ Filter "${keyword}" berhasil dihapus!`);
    }

    async handleStopAllFilters(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (msg.chat.type === 'private') {
            return this.bot.sendMessage(chatId, '❌ Command ini hanya bisa digunakan di grup!');
        }

        if (!await this.isUserAdmin(chatId, userId)) {
            return this.bot.sendMessage(chatId, '❌ Hanya admin yang bisa menghapus semua filters!');
        }

        const chatFilters = this.getChatFilters(chatId);
        const filterCount = Object.keys(chatFilters).length;

        if (filterCount === 0) {
            return this.bot.sendMessage(chatId, '❌ Tidak ada filters yang aktif di grup ini.');
        }

        this.filters.set(chatId, {});
        this.bot.sendMessage(chatId, `✅ Semua ${filterCount} filters berhasil dihapus!`);
    }

    async handleFilterCheck(msg) {
        // Skip if it's a command or from bot
        if (msg.text && msg.text.startsWith('/') || msg.from.is_bot) return;
        
        const chatId = msg.chat.id;
        const messageText = msg.text || msg.caption || '';
        
        if (!messageText) return;

        const chatFilters = this.getChatFilters(chatId);
        const lowerText = messageText.toLowerCase();

        // Check each filter
        for (const [keyword, filter] of Object.entries(chatFilters)) {
            if (lowerText.includes(keyword)) {
                try {
                    await this.bot.sendMessage(chatId, filter.response, { 
                        parse_mode: 'Markdown',
                        reply_to_message_id: msg.message_id 
                    });
                    break; // Only trigger first matching filter
                } catch (error) {
                    console.error('Filter response error:', error);
                }
            }
        }
    }

    getChatNotes(chatId) {
        return this.notes.get(chatId) || {};
    }

    getChatFilters(chatId) {
        return this.filters.get(chatId) || {};
    }

    getMessageType(msg) {
        if (msg.text) return 'text';
        if (msg.photo) return 'photo';
        if (msg.video) return 'video';
        if (msg.document) return 'document';
        if (msg.audio) return 'audio';
        if (msg.voice) return 'voice';
        if (msg.sticker) return 'sticker';
        return 'unknown';
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

module.exports = NotesModule;
