# 🚀 Pterodactyl Panel Control Bot

<div align="center">

![PHP](https://img.shields.io/badge/PHP-8.1+-777BB4?style=for-the-badge&logo=php&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)
![Pterodactyl](https://img.shields.io/badge/Pterodactyl-Panel-0E4B99?style=for-the-badge&logo=pterodactyl&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=for-the-badge)

**Professional Telegram Bot for Mass Pterodactyl Panel Control**

*Manage hundreds of servers with a single command - Restart, Reinstall, Optimize*

[🚀 Quick Start](#-quick-deployment) • [📖 Documentation](#-documentation) • [🔧 Features](#-features) • [💬 Support](#-support)

</div>

---

## ✨ Overview

**Pterodactyl Panel Control Bot** adalah solusi profesional untuk mengelola ratusan server Pterodactyl Panel melalui Telegram. Bot ini memungkinkan restart massal, reinstall tanpa kehilangan data, optimasi panel, dan monitoring real-time dengan UI/UX yang elegan.

### 🎯 **Perfect For**
- 🏢 **Hosting Providers** - Kelola ratusan server pelanggan
- 🎮 **Gaming Networks** - Restart semua game server sekaligus
- 🔧 **System Administrators** - Maintenance massal yang efisien
- 📊 **Panel Managers** - Monitoring dan optimasi terpusat

## 🚀 Features

### 🔥 **Core Operations**
- **🔄 Mass Restart** - Restart semua server secara paralel dengan progress tracking
- **🔧 Mass Reinstall** - Reinstall tanpa menghapus konfigurasi (data aman)
- **⚡ Panel Optimization** - Optimasi database, cache, logs untuk performa maksimal
- **🛠️ Individual Control** - Kelola server satuan dengan kontrol penuh
- **🔍 Smart Search** - Cari server berdasarkan nama atau ID

### 🛡️ **Security & Reliability**
- **� Owner-Only Access** - Kontrol akses ketat untuk keamanan
- **🛡️ Rate Limiting** - Perlindungan anti-spam dan abuse
- **✅ Input Validation** - Validasi ketat semua input user
- **📊 Operation Tracking** - Monitor operasi concurrent real-time
- **📝 Comprehensive Logging** - Audit trail lengkap semua aktivitas

### 📱 **Professional UI/UX**
- **⌨️ Inline Keyboard** - Navigasi intuitif dengan menu terstruktur
- **✔️❌ Smart Confirmations** - Dialog konfirmasi untuk operasi kritis
- **⏳ Live Progress** - Update progress real-time dengan loading indicators
- **🎨 Status Indicators** - Visual status dengan icon dan warna
- **📊 Rich Notifications** - Notifikasi detail dengan statistik

### � **Monitoring & Analytics**
- **🏥 Health Monitoring** - Real-time system health checks
- **📈 Usage Statistics** - Detailed analytics dan performance metrics
- **🔔 Smart Notifications** - Alert otomatis untuk owner
- **📋 Activity Logs** - Complete audit trail dengan SQLite database
- **🔄 Auto Recovery** - Backup dan restore otomatis

---

## 🚀 Quick Deployment

### ⚡ **One-Command Setup** (Ubuntu VPS)

#### 🔑 **Root User Setup** (Recommended for VPS)
```bash
# Download & Extract
wget https://github.com/el-pablos/ptero-panel-control/archive/main.zip
unzip main.zip && cd ptero-panel-control-main/

# Root Setup (3 minutes) - Perfect for VPS
chmod +x root-setup.sh
./root-setup.sh

# 🎯 Smart Features:
# ✅ Auto-detects existing .env configuration
# ✅ Auto-detects PHP version (8.1, 8.2, 8.3)
# ✅ Skips configured settings
# ✅ No permission issues
```

#### 👤 **Regular User Setup**
```bash
# Download & Extract
wget https://github.com/el-pablos/ptero-panel-control/archive/main.zip
unzip main.zip && cd ptero-panel-control-main/

# Quick Setup (5 minutes)
chmod +x quick-setup.sh
./quick-setup.sh
```

**Script akan menanyakan:**
- 🤖 Bot Token
- 👤 Your Telegram ID
- 🌐 Pterodactyl Panel URL
- 🔑 Application API Key
- 🔑 Client API Key

### 🔧 **Advanced Installation**

```bash
# Clone repository
git clone https://github.com/el-pablos/ptero-panel-control.git
cd ptero-panel-control/

# Advanced setup with SSL, multiple domains, etc.
chmod +x install.sh
./install.sh
```

### 📋 **Requirements**

- **OS**: Ubuntu 20.04+ (auto-detected)
- **PHP**: 8.1+ with extensions (auto-installed, supports 8.3)
- **User**: Root or regular user with sudo (both supported)
- **Database**: SQLite (auto-setup)
- **Dependencies**: Composer, Git, Curl (auto-installed)

Edit file `.env` dengan konfigurasi Anda:

```env
# Telegram Bot Configuration
BOT_TOKEN=your_bot_token_here
BOT_USERNAME=your_bot_username
OWNER_TELEGRAM_ID=your_telegram_id

# Pterodactyl Panel Configuration
PTERODACTYL_PANEL_URL=https://your-panel-domain.com
PTERODACTYL_APPLICATION_API_KEY=ptla_your_application_api_key
PTERODACTYL_CLIENT_API_KEY=ptlc_your_client_api_key

# Security Configuration
ALLOWED_USERS=your_telegram_id
MAX_CONCURRENT_OPERATIONS=10
OPERATION_TIMEOUT=300

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=logs/bot.log
LOG_MAX_FILES=7

# Bot Configuration
DEBUG_MODE=false
```

---

## 📖 Documentation

### 📱 **Telegram Commands**

| Command | Description | Features |
|---------|-------------|----------|
| `/start` | 🏠 Main dashboard | Interactive menu dengan inline keyboard |
| `/restartall` | 🔄 Mass restart | Parallel restart dengan progress tracking |
| `/reinstallall` | � Safe reinstall | Reinstall tanpa hapus config/data |
| `/optimize` | ⚡ Panel optimization | Cache, database, logs cleanup |
| `/manage` | 🛠️ Individual control | Single server management |

### 🔗 **CLI Commands**

| Command | Description |
|---------|-------------|
| `php index.php polling` | 🔄 Start bot in polling mode |
| `php index.php health` | 🏥 System health check |
| `php index.php stats` | 📊 Usage statistics |
| `php index.php cleanup` | 🧹 Cleanup old data |

### ⚙️ **Smart Features**

- **🔍 Auto Package Detection** - Skip installed packages
- **💾 Auto Backup** - Backup before updates
- ** Real-time Monitoring** - Health checks & alerts
- **🔄 Auto Recovery** - Rollback on failures
- **🛠️ Service Management** - Systemd & Supervisor integration
- **📝 Comprehensive Logging** - SQLite database & file logs
- **🔑 Root User Support** - Perfect for VPS deployment
- **🐘 PHP 8.3 Support** - Latest PHP version compatibility
- **🧠 Smart .env Detection** - Auto-detect existing configuration
- **📦 Smart Package Detection** - Auto-detect PHP version & packages

---

---

## 🔑 Root User Deployment

### 🚀 **Perfect for VPS**

Running as root eliminates permission issues and simplifies VPS deployment:

```bash
# As root user
sudo su -
cd /root
git clone https://github.com/el-pablos/ptero-panel-control.git
cd ptero-panel-control/
./root-setup.sh
```

### ✅ **Root Benefits**

- **🔧 No Permission Issues** - Full system access
- **📁 Simple File Management** - All files in `/root/pterodactyl-bot/`
- **🛠️ Easy Service Management** - Direct systemctl access
- **🔒 Secure VPS Setup** - Perfect for dedicated servers
- **⚡ Faster Installation** - No sudo overhead

### 🔧 **Root Commands**

```bash
# Service management
systemctl status pterodactyl-bot
systemctl restart pterodactyl-bot
journalctl -u pterodactyl-bot -f

# Bot management
cd /root/pterodactyl-bot
php index.php health
php index.php stats
php deploy.php cleanup
```

---

## 🛠️ Management Commands

### 🔧 **Deployment**

```bash
# Health check
php deploy.php health

# View statistics
php deploy.php stats

# Cleanup old data
php deploy.php cleanup
```

### 🔄 **Service Management**

```bash
# Service status
sudo systemctl status pterodactyl-bot

# Restart service
sudo systemctl restart pterodactyl-bot

# View logs
sudo journalctl -u pterodactyl-bot -f

# Update bot
./update.sh
```

---

## 📊 Monitoring & Analytics

### 🏥 **Health Monitoring**

```bash
# System health check
curl "https://your-domain.com/?mode=health"

# Response example
{
  "status": "ok",
  "timestamp": "2025-06-30 04:18:53",
  "checks": {
    "telegram_api": "ok",
    "database": "ok",
    "pterodactyl_api": "ok"
  }
}
```

### � **Usage Statistics**

```bash
# Bot statistics
php deploy.php stats

# View activity logs
tail -f logs/bot.log

# Database queries
sqlite3 logs/bot.db "SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 10;"
```

### 🔔 **Alerts & Notifications**

- **Real-time Alerts** - Owner notifications untuk critical events
- **Operation Reports** - Detailed reports untuk mass operations
- **Error Tracking** - Automatic error detection dan reporting
- **Performance Metrics** - Response time dan success rate monitoring

---

## 🛡️ Security & Best Practices

### 🔒 **Security Features**

- **🔐 Owner-Only Access** - Strict access control
- **🛡️ Rate Limiting** - Anti-spam protection
- **✅ Input Validation** - Comprehensive input sanitization
- **📝 Audit Logging** - Complete activity tracking
- **🔄 Auto Recovery** - Backup dan rollback capabilities

### � **Security Checklist**

- [ ] Change default credentials
- [ ] Enable HTTPS dengan SSL certificate
- [ ] Configure firewall rules
- [ ] Set strong webhook secret token
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup configuration files

### 🔧 **Production Deployment**

```bash
# Firewall setup
sudo ufw allow 22/tcp
sudo ufw enable

# Service monitoring
sudo systemctl enable pterodactyl-bot
sudo systemctl start pterodactyl-bot
```

---

## � Troubleshooting

### 🔧 **Common Issues**

<details>
<summary><strong>🐘 PHP 8.3 Package Error (FIXED!)</strong></summary>

```bash
# ❌ Old error: Package 'php8.3-json' has no installation candidate
# ✅ FIXED: JSON is built-in since PHP 8.0

# Script now auto-detects PHP version and skips json package for PHP 8.3+
# No manual intervention needed!

# Test PHP detection:
./test-php-packages.sh
```
</details>

<details>
<summary><strong>🧠 .env Auto-Detection</strong></summary>

```bash
# ✅ Script now auto-detects existing .env configuration
# If .env exists with all required fields, script will ask:
# "Use existing configuration? (y/n)"

# To force new configuration:
rm .env
./root-setup.sh

# Test .env detection:
./test-env-detection.sh
```
</details>

<details>
<summary><strong>🔑 Root vs Regular User</strong></summary>

```bash
# For root user (recommended for VPS):
./root-setup.sh
# Files in: /root/pterodactyl-bot/
# User: root
# No permission issues!

# For regular user:
./quick-setup.sh
# Files in: /var/www/pterodactyl-bot/
# User: www-data
# Requires sudo for some operations
```
</details>

<details>
<summary><strong>🤖 Bot tidak merespon</strong></summary>

```bash
# Check webhook status
php deploy.php webhook-info

# Check service status
sudo systemctl status pterodactyl-bot

# View recent logs
tail -f logs/bot.log

# Test bot manually
php test.php
```
</details>

<details>
<summary><strong>� API Connection Error</strong></summary>

```bash
# Test Pterodactyl API
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Accept: application/json" \
     https://panel.yourdomain.com/api/client

# Check API permissions
# Verify panel URL accessibility
# Check firewall rules
```
</details>

<details>
<summary><strong>🗄️ Database Issues</strong></summary>

```bash
# Check database permissions
ls -la logs/bot.db

# Test database connection
sqlite3 logs/bot.db ".tables"

# Fix permissions
chmod 777 logs/
chmod 666 logs/bot.db
```
</details>

### 🔍 **Debug Mode**

```env
# Enable in .env
DEBUG_MODE=true
LOG_LEVEL=DEBUG

# View debug logs
tail -f logs/bot.log | grep DEBUG
```

---

## � Performance & Scaling

### ⚡ **Optimization Tips**

- **🔄 Use Webhook Mode** untuk production (lebih efisien)
- **📊 Monitor Resource Usage** dengan `htop` dan `iotop`
- **🗄️ Regular Database Cleanup** dengan cron jobs
- **📝 Log Rotation** untuk mencegah disk penuh
- **🔧 Nginx Caching** untuk static assets

### 📈 **Scaling Considerations**

- **Load Balancing** untuk multiple bot instances
- **Database Optimization** untuk high-traffic scenarios
- **CDN Integration** untuk global deployment
- **Monitoring Stack** dengan Prometheus + Grafana

---

## 📝 Development & Contributing

### 🏗️ **Project Architecture**

```
ptero-panel-control/
├── 🤖 src/
│   ├── Commands/          # Telegram bot commands
│   │   ├── BaseCommand.php
│   │   ├── StartCommand.php
│   │   ├── RestartAllCommand.php
│   │   └── ...
│   ├── Services/          # Business logic services
│   │   ├── PteroApiService.php
│   │   ├── LoggingService.php
│   │   └── SecurityService.php
│   └── Bot.php           # Main bot controller
├── 🔧 Setup Scripts/
│   ├── install.sh        # Advanced installation
│   ├── quick-setup.sh    # Quick deployment
│   ├── update.sh         # Update script
│   └── deploy.php        # Deployment utilities
├── ⚙️ Config Files/
│   ├── nginx.conf        # Web server config
│   ├── supervisor.conf   # Process manager
│   └── systemd.service   # System service
├── 📊 logs/              # Logs & database
├── 📖 docs/              # Documentation
└── 🔧 index.php          # Entry point
```

### 🛠️ **Development Setup**

```bash
# Clone repository
git clone https://github.com/el-pablos/ptero-panel-control.git
cd ptero-panel-control/

# Install dependencies
composer install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Run tests
php test.php

# Start development server
php deploy.php polling
```

### 🧪 **Testing**

```bash
# Run all tests
php test.php

# Health check
php deploy.php health

# Manual testing
php index.php?mode=polling
```

### 🤝 **Contributing**

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

---

## 📞 Support & Community

<div align="center">

### 💬 **Get Help**

[![Telegram](https://img.shields.io/badge/Telegram-@ImTamaa-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/ImTamaa)
[![GitHub Issues](https://img.shields.io/badge/GitHub-Issues-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/el-pablos/ptero-panel-control/issues)
[![Email](https://img.shields.io/badge/Email-Support-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:yeteprem.end23juni@gmail.com)

### 🌟 **Show Your Support**

If this project helped you, please consider giving it a ⭐ on GitHub!

</div>

---

## 📄 License & Credits

### 📜 **License**
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### 👨‍💻 **Author**
**Pablos** ([@ImTamaa](https://t.me/ImTamaa))
- 🌐 GitHub: [@el-pablos](https://github.com/el-pablos)
- 📧 Email: yeteprem.end23juni@gmail.com

### 🙏 **Acknowledgments**
- [Pterodactyl Panel](https://pterodactyl.io/) - Amazing game server management panel
- [Telegram Bot API](https://core.telegram.org/bots/api) - Powerful bot platform
- [PHP Telegram Bot Library](https://github.com/php-telegram-bot/core) - Excellent PHP library

---

<div align="center">

### ⚠️ **Important Disclaimer**

**This bot can cause server downtime during mass operations.**
Always backup important data before performing mass restart/reinstall operations.
Use at your own risk and test thoroughly in development environment first.

---

**Made with ❤️ for the Pterodactyl community**

*Happy Server Management! 🚀*

</div>
