# 🚀 Deployment Guide - Pterodactyl Telegram Bot

Panduan lengkap untuk deploy bot ke VPS Ubuntu dengan deteksi package otomatis.

## 📋 Prerequisites

- VPS Ubuntu 20.04+ dengan akses sudo
- Domain (opsional, untuk webhook mode)
- Telegram Bot Token
- Pterodactyl Panel dengan API access

## ⚡ Quick Deployment (Recommended)

### 1. Download & Extract

```bash
# Download project zip
wget https://github.com/your-repo/pterodactyl-telegram-bot/archive/main.zip
unzip main.zip
cd pterodactyl-telegram-bot-main/
```

### 2. Quick Setup (5 menit)

```bash
chmod +x quick-setup.sh
./quick-setup.sh
```

Script akan menanyakan:
- 🤖 Bot Token
- 👤 Telegram ID Anda
- 🌐 URL Panel Pterodactyl
- 🔑 Application API Key
- 🔑 Client API Key
- 🌍 Domain (opsional)

### 3. Test Bot

```bash
# Health check
cd /var/www/pterodactyl-bot
php deploy.php health

# Send /start ke bot Telegram Anda
```

## 🔧 Advanced Installation

Untuk konfigurasi advanced dengan SSL, multiple domains, dll:

```bash
chmod +x install.sh
./install.sh
```

Script akan:
- ✅ Deteksi package yang sudah terinstall
- ✅ Skip instalasi jika sudah ada
- ✅ Konfigurasi interaktif
- ✅ Setup SSL otomatis
- ✅ Backup instalasi lama

## 📦 Package Detection

Script otomatis mendeteksi dan skip instalasi jika sudah ada:

### System Packages
- ✅ PHP 8.1+ (dengan extensions)
- ✅ Nginx
- ✅ Supervisor
- ✅ Git, Curl, Unzip

### PHP Extensions
- ✅ php8.1-fpm
- ✅ php8.1-cli
- ✅ php8.1-curl
- ✅ php8.1-json
- ✅ php8.1-sqlite3
- ✅ php8.1-mbstring
- ✅ php8.1-xml

### Services
- ✅ Composer
- ✅ Certbot (untuk SSL)

## 🔄 Deployment Modes

### Webhook Mode (Production)
- ✅ Untuk production dengan domain
- ✅ Lebih efisien resource
- ✅ Auto SSL dengan Let's Encrypt
- ✅ Nginx reverse proxy

### Polling Mode (Development)
- ✅ Untuk development/testing
- ✅ Tidak perlu domain
- ✅ Background service dengan systemd
- ✅ Auto restart on failure

## 📁 Directory Structure

```
/var/www/pterodactyl-bot/          # Bot directory
├── src/                           # Source code
├── logs/                          # Logs & database
├── .env                          # Configuration
└── vendor/                       # Dependencies

/etc/nginx/sites-available/        # Nginx config
/etc/systemd/system/              # Service config
/var/log/                         # System logs
/var/backups/pterodactyl-bot/     # Backups
```

## 🔧 Configuration Files

### Environment (.env)
```env
BOT_TOKEN=your_bot_token
OWNER_TELEGRAM_ID=your_telegram_id
PTERODACTYL_PANEL_URL=https://panel.domain.com
PTERODACTYL_APPLICATION_API_KEY=ptla_...
PTERODACTYL_CLIENT_API_KEY=ptlc_...
WEBHOOK_URL=https://bot.domain.com
```

### Nginx (/etc/nginx/sites-available/pterodactyl-bot)
- ✅ Auto-configured dengan domain
- ✅ SSL ready
- ✅ Security headers
- ✅ Rate limiting

### Systemd (/etc/systemd/system/pterodactyl-bot.service)
- ✅ Auto start on boot
- ✅ Auto restart on failure
- ✅ Proper logging
- ✅ Security restrictions

## 🔄 Updates & Maintenance

### Update Bot
```bash
cd /var/www/pterodactyl-bot
./update.sh
```

### Manual Commands
```bash
# Health check
php deploy.php health

# View stats
php deploy.php stats

# Cleanup logs
php deploy.php cleanup

# Test all components
php test.php
```

### Service Management
```bash
# Status
sudo systemctl status pterodactyl-bot

# Restart
sudo systemctl restart pterodactyl-bot

# Logs
sudo journalctl -u pterodactyl-bot -f
```

## 🛡️ Security Features

### Auto-configured
- ✅ Firewall rules (UFW)
- ✅ Nginx security headers
- ✅ Rate limiting
- ✅ SSL/TLS encryption
- ✅ File permissions

### Access Control
- ✅ Owner-only bot access
- ✅ Admin endpoints protection
- ✅ Input validation
- ✅ SQL injection prevention

## 📊 Monitoring

### Health Checks
```bash
# Bot health
curl https://your-domain.com/?mode=health

# Service status
systemctl is-active pterodactyl-bot

# Nginx status
nginx -t && systemctl status nginx
```

### Logs
```bash
# Bot logs
tail -f /var/www/pterodactyl-bot/logs/bot.log

# System logs
tail -f /var/log/pterodactyl-bot-*.log

# Service logs
journalctl -u pterodactyl-bot -f

# Nginx logs
tail -f /var/log/nginx/pterodactyl-bot-*.log
```

## 🔧 Troubleshooting

### Common Issues

#### Bot tidak merespon
```bash
# Check service
systemctl status pterodactyl-bot

# Check logs
journalctl -u pterodactyl-bot -n 50

# Test manually
cd /var/www/pterodactyl-bot
php deploy.php health
```

#### Webhook error
```bash
# Check webhook info
php deploy.php webhook-info

# Reset webhook
php deploy.php delete-webhook
php deploy.php webhook
```

#### Permission errors
```bash
# Fix permissions
sudo chown -R $USER:www-data /var/www/pterodactyl-bot
sudo chmod -R 755 /var/www/pterodactyl-bot
sudo chmod -R 777 /var/www/pterodactyl-bot/logs
```

#### SSL issues
```bash
# Renew certificate
sudo certbot renew

# Test SSL
curl -I https://your-domain.com
```

### Recovery

#### Restore from backup
```bash
# List backups
ls -la /var/backups/pterodactyl-bot/

# Restore
sudo systemctl stop pterodactyl-bot
sudo rm -rf /var/www/pterodactyl-bot
sudo tar -xzf /var/backups/pterodactyl-bot/backup-YYYYMMDD_HHMMSS.tar.gz -C /var/www/
sudo systemctl start pterodactyl-bot
```

#### Complete reinstall
```bash
# Remove old installation
sudo rm -rf /var/www/pterodactyl-bot
sudo rm -f /etc/nginx/sites-enabled/pterodactyl-bot
sudo rm -f /etc/systemd/system/pterodactyl-bot.service

# Reinstall
./install.sh
```

## 📞 Support

- 📧 Issues: GitHub Issues
- 💬 Telegram: [@ImTamaa](https://t.me/ImTamaa)
- 📖 Docs: README.md

## 🎯 Performance Tips

1. **Use webhook mode** untuk production
2. **Enable SSL** untuk keamanan
3. **Setup monitoring** dengan cron jobs
4. **Regular backups** otomatis
5. **Monitor logs** untuk error patterns
6. **Update regularly** untuk security patches

---

**⚠️ Important**: Selalu backup sebelum update atau perubahan konfigurasi!
