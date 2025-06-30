# Pterodactyl Panel Control Bot

[🇺🇸 English](#english) | [🇮🇩 Bahasa Indonesia](#bahasa-indonesia)

---

## English

A comprehensive Telegram bot for managing Pterodactyl Panel servers with advanced features including user management, server automation, and Rose Bot integration.

### 🌟 Features

#### Core Panel Management
- **Server Control**: Restart, reinstall, and manage all servers
- **User Management**: Create users, manage permissions, and track server ownership
- **Panel Optimization**: Automated performance optimization and health monitoring
- **Admin Tools**: Comprehensive admin panel with user statistics

#### Rose Bot Integration 🌹
- **FBAN System**: Federation ban management with Rose Bot database
- **Federation Management**: Join/leave federations, view federation info
- **User Status Checking**: Check FBAN status and federation membership
- **Telegram ID Cards**: Beautiful ASCII card display for user information

#### Advanced Features
- **Health Monitoring**: Real-time panel and server health checks
- **Automated Installation**: One-click server creation with auto-installation
- **Logging System**: Comprehensive logging with rotation
- **Update System**: Automated git-based updates with rollback support

### 🚀 Quick Start

#### Prerequisites
- Ubuntu/Debian VPS with root access
- Node.js 16+ and npm
- Pterodactyl Panel installation
- Telegram Bot Token

#### Installation

1. **Clone Repository**
```bash
git clone https://github.com/el-pablos/TelegramME.git
cd TelegramME
```

2. **Run Installation Script**
```bash
chmod +x install.sh
sudo ./install.sh
```

3. **Configure Environment**
```bash
# Edit .env file with your credentials
nano .env
```

4. **Start Bot**
```bash
# Using systemd (recommended)
sudo systemctl start panel-control
sudo systemctl enable panel-control

# Or manual start
node bot.js
```

### ⚙️ Configuration

#### Environment Variables (.env)
```bash
# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token
OWNER_ID=your_telegram_user_id

# Pterodactyl Panel Configuration
PANEL_URL=https://your-panel.com
PANEL_API_KEY=your_panel_api_key

# Rose Bot Integration (Optional)
ROSE_API_KEY=your_rose_api_key
FEDERATION_ID=your_default_federation_id

# Database Configuration
DB_PATH=./logs/bot.db

# Logging Configuration
LOG_LEVEL=info
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
```

#### Rose Bot Setup
1. Chat with @MissRose_bot on Telegram
2. Use `/token` command to get your API key
3. Add the key to your `.env` file
4. Restart the bot to enable Rose features

### 📱 Commands

#### Basic Commands
- `/start` - Start the bot and show main menu
- `/help` - Show help information
- `/info` - Show your Telegram ID card
- `/info` (reply) - Show replied user's information

#### Rose Bot Commands
- `/fban [user_id] [reason]` - Federation ban user
- `/fban [reason]` (reply) - FBAN replied user
- `/unfban [user_id]` - Remove federation ban
- `/unfban` (reply) - UNFBAN replied user
- `/joinfed [fed_id]` - Join a federation
- `/leavefed [fed_id]` - Leave a federation
- `/fedinfo` - Show federation information

#### Admin Commands (Owner Only)
- **Server Management**: Restart/reinstall all servers
- **User Management**: Create users, manage permissions
- **Panel Optimization**: Performance tuning and monitoring
- **Health Checks**: System diagnostics and status

### 🔧 Management

#### Update Bot
```bash
# Automated update
./update.sh

# Manual update
git pull origin main
sudo systemctl restart panel-control
```

#### Monitor Bot
```bash
# Check status
sudo systemctl status panel-control

# View logs
sudo journalctl -u panel-control -f

# Health check
node health.js
```

### 📊 Telegram ID Card Display
```
╭─────────────────────────────────╮
│        🆔 TELEGRAM ID CARD       │
├─────────────────────────────────┤
│                                 │
│  👤 Name:      Pablos           │
│  🆔 User ID:   5476148500       │
│  📱 Username:  @ImTamaa         │
│  🌐 DC ID:     2                │
│  💎 Premium:   No               │
│                                 │
╰─────────────────────────────────╯
```

---

## Bahasa Indonesia

Bot Telegram komprehensif untuk mengelola server Pterodactyl Panel dengan fitur canggih termasuk manajemen pengguna, otomasi server, dan integrasi Rose Bot.

### 🌟 Fitur

#### Manajemen Panel Inti
- **Kontrol Server**: Restart, reinstall, dan kelola semua server
- **Manajemen User**: Buat user, kelola permission, dan lacak kepemilikan server
- **Optimasi Panel**: Optimasi performa otomatis dan monitoring kesehatan
- **Tools Admin**: Panel admin komprehensif dengan statistik user

#### Integrasi Rose Bot 🌹
- **Sistem FBAN**: Manajemen federation ban dengan database Rose Bot
- **Manajemen Federasi**: Join/leave federasi, lihat info federasi
- **Pengecekan Status User**: Cek status FBAN dan keanggotaan federasi
- **Kartu ID Telegram**: Tampilan kartu ASCII yang indah untuk informasi user

#### Fitur Lanjutan
- **Monitoring Kesehatan**: Pengecekan kesehatan panel dan server real-time
- **Instalasi Otomatis**: Pembuatan server satu klik dengan auto-instalasi
- **Sistem Logging**: Logging komprehensif dengan rotasi
- **Sistem Update**: Update otomatis berbasis git dengan dukungan rollback

### 🚀 Mulai Cepat

#### Prasyarat
- VPS Ubuntu/Debian dengan akses root
- Node.js 16+ dan npm
- Instalasi Pterodactyl Panel
- Token Bot Telegram

#### Instalasi

1. **Clone Repository**
```bash
git clone https://github.com/el-pablos/TelegramME.git
cd TelegramME
```

2. **Jalankan Script Instalasi**
```bash
chmod +x install.sh
sudo ./install.sh
```

3. **Konfigurasi Environment**
```bash
# Edit file .env dengan kredensial Anda
nano .env
```

4. **Mulai Bot**
```bash
# Menggunakan systemd (direkomendasikan)
sudo systemctl start panel-control
sudo systemctl enable panel-control

# Atau start manual
node bot.js
```

### ⚙️ Konfigurasi

#### Variabel Environment (.env)
```bash
# Konfigurasi Bot Telegram
BOT_TOKEN=token_bot_telegram_anda
OWNER_ID=id_telegram_user_anda

# Konfigurasi Pterodactyl Panel
PANEL_URL=https://panel-anda.com
PANEL_API_KEY=api_key_panel_anda

# Integrasi Rose Bot (Opsional)
ROSE_API_KEY=api_key_rose_anda
FEDERATION_ID=id_federasi_default_anda

# Konfigurasi Database
DB_PATH=./logs/bot.db

# Konfigurasi Logging
LOG_LEVEL=info
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
```

#### Setup Rose Bot
1. Chat dengan @MissRose_bot di Telegram
2. Gunakan command `/token` untuk mendapatkan API key
3. Tambahkan key ke file `.env` Anda
4. Restart bot untuk mengaktifkan fitur Rose

### 📱 Commands

#### Command Dasar
- `/start` - Mulai bot dan tampilkan menu utama
- `/help` - Tampilkan informasi bantuan
- `/info` - Tampilkan kartu ID Telegram Anda
- `/info` (reply) - Tampilkan informasi user yang di-reply

#### Command Rose Bot
- `/fban [user_id] [alasan]` - Federation ban user
- `/fban [alasan]` (reply) - FBAN user yang di-reply
- `/unfban [user_id]` - Hapus federation ban
- `/unfban` (reply) - UNFBAN user yang di-reply
- `/joinfed [fed_id]` - Bergabung dengan federasi
- `/leavefed [fed_id]` - Keluar dari federasi
- `/fedinfo` - Tampilkan informasi federasi

#### Command Admin (Khusus Owner)
- **Manajemen Server**: Restart/reinstall semua server
- **Manajemen User**: Buat user, kelola permission
- **Optimasi Panel**: Tuning performa dan monitoring
- **Health Check**: Diagnostik sistem dan status

### 🔧 Manajemen

#### Update Bot
```bash
# Update otomatis
./update.sh

# Update manual
git pull origin main
sudo systemctl restart panel-control
```

#### Monitor Bot
```bash
# Cek status
sudo systemctl status panel-control

# Lihat logs
sudo journalctl -u panel-control -f

# Health check
node health.js
```

### 📊 Tampilan Kartu ID Telegram
```
╭─────────────────────────────────╮
│        🆔 TELEGRAM ID CARD       │
├─────────────────────────────────┤
│                                 │
│  👤 Nama:      Pablos           │
│  🆔 User ID:   5476148500       │
│  📱 Username:  @ImTamaa         │
│  🌐 DC ID:     2                │
│  💎 Premium:   Tidak            │
│                                 │
╰─────────────────────────────────╯
```

---

## 🤝 Contributing

1. Fork repository
2. Buat feature branch
3. Buat perubahan Anda
4. Test secara menyeluruh
5. Submit pull request

## 📄 License

Proyek ini dilisensikan di bawah MIT License - lihat file [LICENSE](LICENSE) untuk detail.

## 👨‍💻 Author

**Pablos (@ImTamaa)**
- GitHub: [@el-pablos](https://github.com/el-pablos)
- Telegram: [@ImTamaa](https://t.me/ImTamaa)

### 🛡️ Fitur Keamanan

- **Akses Khusus Owner**: Bot terbatas untuk owner yang dikonfigurasi
- **Proteksi API Key**: Penyimpanan aman kredensial sensitif
- **Validasi Input**: Proteksi terhadap input berbahaya
- **Rate Limiting**: Mencegah spam dan penyalahgunaan
- **Logging Aman**: Data sensitif dikecualikan dari logs

### 🔄 Sistem Update

Bot menyertakan sistem update otomatis:
- **Integrasi Git**: Pull perubahan terbaru dari repository
- **Manajemen Dependency**: Update paket npm otomatis
- **Manajemen Service**: Restart mulus tanpa downtime
- **Sistem Backup**: Backup otomatis sebelum update
- **Verifikasi Kesehatan**: Health check setelah update

### 📝 Logging

Sistem logging komprehensif dengan:
- **Structured Logging**: Format JSON dengan timestamp
- **Log Rotation**: Rotasi file otomatis dan cleanup
- **Multiple Levels**: Level debug, info, warn, error
- **Performance Metrics**: Response time dan statistik penggunaan

### 🔧 Troubleshooting

#### Masalah Umum

**Bot tidak merespons:**
```bash
# Cek status service
sudo systemctl status panel-control

# Cek logs
sudo journalctl -u panel-control -n 50

# Test manual
cd /path/to/bot && node bot.js
```

**Error 401 Unauthorized:**
```bash
# Update bot token di .env
nano .env

# Restart service
sudo systemctl restart panel-control
```

**Panel API Error:**
```bash
# Test koneksi panel
curl -H "Authorization: Bearer YOUR_API_KEY" https://your-panel.com/api/client

# Cek konfigurasi
node health.js
```

#### Health Check

Bot menyediakan health check komprehensif:
```bash
# Jalankan health check
node health.js

# Output akan menampilkan:
# ✅ Bot Token: Valid
# ✅ Panel Connection: OK
# ✅ Database: Connected
# ✅ Rose API: Available
# ✅ Permissions: Correct
```

### 📈 Performance Tips

1. **Optimasi Database**: Jalankan optimasi panel secara berkala
2. **Monitor Resources**: Pantau penggunaan CPU dan RAM
3. **Log Rotation**: Pastikan log rotation aktif
4. **Update Regular**: Selalu gunakan versi terbaru
5. **Backup Strategy**: Backup konfigurasi secara berkala

### 🚀 Advanced Usage

#### Custom Scripts
Bot mendukung eksekusi script custom untuk otomasi lanjutan:
```bash
# Tambahkan script ke direktori scripts/
mkdir scripts
echo '#!/bin/bash\necho "Custom script executed"' > scripts/custom.sh
chmod +x scripts/custom.sh
```

#### API Integration
Integrasikan dengan sistem eksternal melalui webhook:
```javascript
// Contoh webhook handler
app.post('/webhook', (req, res) => {
    // Handle external triggers
    bot.sendMessage(OWNER_ID, 'External event triggered');
});
```

---

**⚡ Siap mengelola Pterodactyl Panel Anda seperti seorang pro? Mulai sekarang!**
