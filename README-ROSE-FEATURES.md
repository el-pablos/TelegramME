# 🌹 Rose Bot Features - Pterodactyl Bot

Bot Pterodactyl Anda sekarang dilengkapi dengan **semua fitur Rose Bot** yang lengkap! Bot ini menggabungkan kontrol panel Pterodactyl dengan manajemen grup terbaik ala Rose Bot.

## 🎯 **Fitur Utama**

### 👥 **Admin Management**
- ✅ Lihat daftar admin grup
- ✅ Promote/demote users
- ✅ Set custom title admin
- ✅ Admin permission management

### 🛡️ **Moderation Tools**
- ✅ Ban/unban users (permanent & temporary)
- ✅ Mute/unmute users (permanent & temporary)
- ✅ Kick users dari grup
- ✅ Warning system
- ✅ Purge messages

### 💬 **Welcome & Goodbye**
- ✅ Custom welcome messages
- ✅ Custom goodbye messages
- ✅ Variable support (nama, mention, dll)
- ✅ Clean welcome (auto hapus welcome lama)

### 📝 **Notes & Filters**
- ✅ Save/get notes (pesan tersimpan)
- ✅ Auto-reply filters
- ✅ Note shortcuts (#notename)
- ✅ Filter management

### 🔒 **Locks & Security**
- ✅ Message type locks (text, media, sticker, dll)
- ✅ Anti-flood protection
- ✅ URL/link blocking
- ✅ Forward message blocking
- ✅ Mention/hashtag blocking

### 🔧 **Pterodactyl Panel** (Owner Only)
- ✅ Server management (restart, reinstall)
- ✅ Admin panel management
- ✅ User server creation
- ✅ Panel optimization

## 📋 **Commands Lengkap**

### 👥 **Admin Commands**
```
/admins - Lihat daftar admin grup
/promote - Promote user jadi admin (reply/mention)
/demote - Demote admin jadi member (reply/mention)
/title <title> - Set custom title admin (reply)
```

### 🛡️ **Moderation Commands**
```
/ban [reason] - Ban user permanent
/tban <time> [reason] - Temporary ban (1m, 1h, 1d, 1w)
/unban - Unban user

/mute [reason] - Mute user permanent
/tmute <time> [reason] - Temporary mute
/unmute - Unmute user

/kick [reason] - Kick user dari grup
/warn [reason] - Beri warning ke user
/warns - Lihat warnings user
/resetwarn - Reset warnings user

/purge - Hapus pesan (reply ke pesan target)
/del - Hapus pesan (reply)
```

### 💬 **Welcome Commands**
```
/welcome on/off - Toggle welcome message
/setwelcome <text> - Set welcome message
/resetwelcome - Reset welcome ke default
/cleanwelcome on/off - Auto hapus welcome lama

/goodbye on/off - Toggle goodbye message
/setgoodbye <text> - Set goodbye message
/resetgoodbye - Reset goodbye ke default

/welcomehelp - Bantuan welcome variables
```

**Welcome Variables:**
- `{first}` - Nama depan user
- `{last}` - Nama belakang user
- `{fullname}` - Nama lengkap user
- `{username}` - Username user
- `{mention}` - Mention user
- `{id}` - User ID
- `{chatname}` - Nama grup
- `{count}` - Jumlah member grup

### 📝 **Notes & Filters Commands**
```
/save <name> <content> - Simpan note
/get <name> - Ambil note
#<name> - Shortcut ambil note
/notes - Lihat semua notes
/clear <name> - Hapus note

/filter <keyword> <response> - Tambah auto-reply filter
/filters - Lihat semua filters
/stop <keyword> - Hapus filter
/stopall - Hapus semua filters
```

### 🔒 **Locks & Security Commands**
```
/lock <type> - Aktifkan lock
/unlock <type> - Nonaktifkan lock
/locks - Lihat status semua locks
/locktypes - Lihat jenis locks tersedia

/antiflood on/off - Toggle antiflood
/antiflood <number> - Set limit pesan (2-20)
```

**Lock Types:**
- `text` - Pesan teks biasa
- `media` - Semua media (foto, video, dll)
- `photo` - Foto
- `video` - Video
- `audio` - Audio
- `voice` - Voice note
- `document` - Dokumen/file
- `sticker` - Sticker
- `gif` - GIF/animasi
- `url` - Link/URL
- `forward` - Pesan forward
- `mention` - Mention user (@username)
- `hashtag` - Hashtag (#tag)
- `poll` - Polling
- `game` - Game
- `location` - Lokasi
- `contact` - Kontak

### 🔧 **Pterodactyl Commands** (Owner Only)
```
/id - Lihat chat ID grup
/info - Info detail user (reply/mention)
/start - Menu panel Pterodactyl (private chat)
/addadmin - Tambah admin panel
/createserver - Buat server untuk user
```

### 💡 **Help Commands**
```
/help - Bantuan umum
/help admin - Admin commands
/help moderation - Moderation commands
/help welcome - Welcome commands
/help notes - Notes & filters
/help locks - Locks & security
```

## 🚀 **Cara Penggunaan**

### **Setup di Grup:**
1. Tambahkan bot ke grup Anda
2. Jadikan bot sebagai admin dengan semua permission
3. Gunakan `/start` untuk melihat fitur
4. Gunakan `/help` untuk bantuan lengkap

### **Contoh Penggunaan:**

#### **Welcome Message:**
```
/setwelcome Selamat datang {mention} di {chatname}! 

Kamu adalah member ke-{count}. 

Silakan baca rules dan enjoy! 😊
```

#### **Save Note:**
```
/save rules 📋 **Rules Grup:**

1. Dilarang spam
2. Dilarang konten NSFW  
3. Respect sesama member
4. No toxic/drama

Pelanggaran = kick/ban!
```

#### **Auto-Reply Filter:**
```
/filter hello Halo juga! Selamat datang di grup kami! 😊
/filter rules #rules
```

#### **Lock Settings:**
```
/lock sticker - Larang sticker
/lock url - Larang link
/antiflood 5 - Max 5 pesan per 10 detik
```

#### **Moderation:**
```
/ban - Ban user (reply ke pesan)
/tmute 1h spam - Mute 1 jam karena spam
/warn Jangan spam! - Beri warning
```

## 🔧 **Fitur Khusus**

### **Auto-Delete Warning:**
- Warning moderation otomatis terhapus setelah 5 detik
- Menjaga chat tetap bersih

### **Smart Time Parsing:**
- `1m` = 1 menit
- `1h` = 1 jam  
- `1d` = 1 hari
- `1w` = 1 minggu

### **Admin Protection:**
- Admin tidak terkena locks
- Admin tidak terkena antiflood
- Admin bisa bypass semua restrictions

### **Clean Welcome:**
- Welcome lama otomatis terhapus saat ada member baru
- Menjaga chat tidak penuh welcome message

### **Note Shortcuts:**
- Gunakan `#rules` instead of `/get rules`
- Lebih cepat dan praktis

## 🎨 **Customization**

### **Welcome Variables Advanced:**
```
/setwelcome 🎉 **Welcome {mention}!**

👤 **Name:** {fullname}
🆔 **ID:** {id}
👥 **Member ke:** {count}
🏠 **Grup:** {chatname}

Selamat bergabung! 😊
```

### **Filter dengan Button:**
```
/filter start Selamat datang! Gunakan /help untuk bantuan.
```

### **Multi-Language Support:**
Bot mendukung bahasa Indonesia penuh dengan pesan error dan konfirmasi yang jelas.

## 🔐 **Security Features**

### **Permission Checks:**
- Hanya admin yang bisa moderation
- Hanya admin yang bisa locks
- Hanya admin yang bisa welcome settings
- Owner ID protection untuk Pterodactyl features

### **Anti-Spam Protection:**
- Antiflood dengan auto-mute
- Message locks untuk berbagai tipe konten
- Auto-delete violation messages

### **Safe Moderation:**
- Tidak bisa ban/mute admin
- Tidak bisa ban/mute bot creator
- Error handling untuk permission issues

---

**🌹 Rose Bot Features + 🚀 Pterodactyl Panel = Perfect Group Management!**

Bot ini memberikan Anda kontrol penuh atas grup Telegram dengan fitur-fitur terlengkap yang ada, plus kemampuan mengelola server Pterodactyl panel. Semua dalam satu bot yang powerful dan mudah digunakan!
