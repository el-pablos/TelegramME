# 🚀 Pterodactyl Bot Management Scripts

Kumpulan script untuk mengelola Pterodactyl Telegram Bot di VPS dengan mudah.

## 📋 Daftar Script

### 1. `setup-bot.sh` - Setup Awal
Script untuk instalasi dan setup awal bot di VPS baru.

**Fitur:**
- Install Node.js, NPM, Git
- Install PM2 (Process Manager)
- Install Screen (Alternative Process Manager)
- Install dependencies bot
- Buat file .env template
- Setup firewall check
- Validasi syntax bot

**Penggunaan:**
```bash
sudo ./setup-bot.sh
```

### 2. `update.sh` - Update Bot
Script untuk update bot dari GitHub dan restart otomatis.

**Fitur:**
- Stop bot yang sedang berjalan
- Backup versi saat ini
- Pull update terbaru dari GitHub
- Update dependencies jika diperlukan
- Test syntax bot
- Start bot dengan method terbaik (PM2/Screen/nohup)
- Verifikasi bot berjalan

**Penggunaan:**
```bash
./update.sh
```

### 3. `bot-manager.sh` - Kelola Bot
Script untuk mengelola bot (start, stop, restart, status, logs).

**Fitur:**
- Start bot dengan berbagai method
- Stop bot dengan aman
- Restart bot
- Cek status bot dan sistem
- Lihat log bot

**Penggunaan:**
```bash
./bot-manager.sh start    # Mulai bot
./bot-manager.sh stop     # Hentikan bot
./bot-manager.sh restart  # Restart bot
./bot-manager.sh status   # Lihat status
./bot-manager.sh logs     # Lihat log
```

## 🔧 Setup Pertama Kali

### 1. Clone Repository
```bash
git clone https://github.com/el-pablos/ptero-panel-control.git
cd ptero-panel-control
```

### 2. Jalankan Setup
```bash
sudo ./setup-bot.sh
```

### 3. Edit Konfigurasi
```bash
nano .env
```

Isi dengan konfigurasi yang benar:
```env
BOT_TOKEN=your_bot_token_here
OWNER_TELEGRAM_ID=5476148500
PTERODACTYL_PANEL_URL=https://your-panel.domain.com
PTERODACTYL_APPLICATION_API_KEY=your_application_api_key_here
PTERODACTYL_CLIENT_API_KEY=your_client_api_key_here
```

### 4. Mulai Bot
```bash
./bot-manager.sh start
```

### 5. Cek Status
```bash
./bot-manager.sh status
```

## 🔄 Update Bot

Setiap kali ada update di GitHub:
```bash
./update.sh
```

Script akan otomatis:
1. ✅ Stop bot
2. ✅ Backup versi lama
3. ✅ Download update
4. ✅ Update dependencies
5. ✅ Test syntax
6. ✅ Start bot
7. ✅ Verifikasi running

## 📊 Monitoring Bot

### Cek Status
```bash
./bot-manager.sh status
```

### Lihat Log
```bash
./bot-manager.sh logs
```

### Restart Jika Bermasalah
```bash
./bot-manager.sh restart
```

## 🛠️ Method Menjalankan Bot

Script akan otomatis memilih method terbaik:

### 1. PM2 (Recommended)
- ✅ Auto-restart jika crash
- ✅ Log management
- ✅ Monitoring
- ✅ Cluster mode
- ✅ Auto-start on boot

```bash
pm2 list                    # Lihat status
pm2 logs pterodactyl-bot   # Lihat log
pm2 restart pterodactyl-bot # Restart
```

### 2. Screen Session
- ✅ Background process
- ✅ Detachable session
- ✅ Manual control

```bash
screen -r pterodactyl-bot  # Attach ke session
# Ctrl+A+D untuk detach
```

### 3. Nohup (Fallback)
- ✅ Background process
- ✅ Log ke file

```bash
tail -f bot.log  # Lihat log
```

## 🚨 Troubleshooting

### Bot Tidak Berjalan
```bash
./bot-manager.sh status  # Cek status
./bot-manager.sh logs    # Lihat error
./bot-manager.sh restart # Restart
```

### Update Gagal
```bash
git status               # Cek git status
git stash               # Simpan perubahan lokal
git pull origin main    # Manual pull
./bot-manager.sh restart # Restart bot
```

### Permission Error
```bash
chmod +x *.sh           # Buat script executable
sudo chown -R $USER:$USER . # Fix ownership
```

### Dependencies Error
```bash
rm -rf node_modules package-lock.json
npm install             # Reinstall dependencies
```

## 📝 Tips & Best Practices

### 1. Backup Reguler
Script `update.sh` otomatis backup sebelum update ke:
```
bot.js.backup.YYYYMMDD_HHMMSS
```

### 2. Monitor Log
```bash
# PM2
pm2 logs pterodactyl-bot --lines 100

# Screen
screen -r pterodactyl-bot

# Nohup
tail -f bot.log
```

### 3. Auto-Start on Boot
```bash
# Untuk PM2
pm2 startup
pm2 save

# Untuk systemd (manual)
sudo nano /etc/systemd/system/pterodactyl-bot.service
```

### 4. Cron Job untuk Auto-Update
```bash
# Edit crontab
crontab -e

# Tambahkan (update setiap hari jam 3 pagi)
0 3 * * * cd /path/to/bot && ./update.sh >> update.log 2>&1
```

## 🔐 Security

### File Permissions
```bash
chmod 600 .env          # Protect config file
chmod +x *.sh           # Make scripts executable
```

### Firewall
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
```

## 📞 Support

Jika ada masalah:
1. Cek log dengan `./bot-manager.sh logs`
2. Cek status dengan `./bot-manager.sh status`
3. Restart dengan `./bot-manager.sh restart`
4. Update dengan `./update.sh`

---

**Author:** Pablos (@ImTamaa)  
**Repository:** https://github.com/el-pablos/ptero-panel-control
