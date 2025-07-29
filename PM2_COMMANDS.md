# 🚀 PM2 Commands untuk TelegramME Bot

## ✅ Bot Status - BERHASIL DIJALANKAN!

Bot TelegramME sudah berhasil dijalankan dengan PM2 dan dikonfigurasi untuk auto-start saat server restart.

```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ TelegramME         │ fork     │ 0    │ online    │ 0%       │ 104.8mb  │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

## 📋 Commands PM2 Penting

### 🔍 Monitoring & Status
```bash
# Lihat status semua process
pm2 status

# Lihat status detail TelegramME
pm2 show TelegramME

# Monitor real-time (CPU, Memory, dll)
pm2 monit

# Lihat logs real-time
pm2 logs TelegramME

# Lihat logs dengan jumlah baris tertentu
pm2 logs TelegramME --lines 50
```

### 🔄 Control Bot
```bash
# Restart bot
pm2 restart TelegramME

# Stop bot
pm2 stop TelegramME

# Start bot (jika sudah di-stop)
pm2 start TelegramME

# Reload bot (zero-downtime restart)
pm2 reload TelegramME

# Delete bot dari PM2
pm2 delete TelegramME
```

### 💾 Save & Startup
```bash
# Save current process list (sudah dilakukan)
pm2 save

# Setup auto-start saat server restart (sudah dilakukan)
pm2 startup

# Restore saved processes
pm2 resurrect
```

### 📊 Advanced Monitoring
```bash
# Lihat memory usage detail
pm2 show TelegramME

# Reset restart counter
pm2 reset TelegramME

# Flush logs
pm2 flush TelegramME
```

## 🔧 Konfigurasi Bot

Bot sudah dikonfigurasi dengan:
- ✅ **Panel URL**: https://private-panel.tams.my.id
- ✅ **Owner ID**: 5476148500
- ✅ **PRIVATE IP Allocation**: 0.0.0.0 (DISABLED)
- ✅ **Nest**: 5, **Egg**: 15
- ✅ **Auto-start**: Enabled

## 📁 File Locations

```bash
# PM2 logs location
/root/.pm2/logs/TelegramME-out.log    # Output logs
/root/.pm2/logs/TelegramME-error.log  # Error logs

# PM2 config
/root/.pm2/dump.pm2                   # Saved processes
/etc/systemd/system/pm2-root.service  # Systemd service
```

## 🚨 Troubleshooting

### Bot tidak responding
```bash
# Cek status
pm2 status

# Lihat error logs
pm2 logs TelegramME --err

# Restart bot
pm2 restart TelegramME
```

### Memory usage tinggi
```bash
# Cek memory usage
pm2 monit

# Reload bot (zero-downtime)
pm2 reload TelegramME
```

### Bot crash terus
```bash
# Lihat error logs detail
pm2 logs TelegramME --lines 100

# Cek environment variables
cat .env

# Manual test
node bot.js
```

## 🎯 Quick Actions

```bash
# Restart bot cepat
pm2 restart TelegramME

# Lihat logs terbaru
pm2 logs TelegramME --lines 20

# Monitor real-time
pm2 monit

# Status check
pm2 status
```

## ✅ Bot Features yang Aktif

- 🤖 **Telegram Bot**: Online dan siap menerima commands
- 🌐 **Pterodactyl Integration**: Terhubung ke panel
- 🌹 **Rose Bot Features**: Admin, moderation, welcome, notes, locks
- 📁 **File Management**: Upload, session folders, creds management
- 🎯 **PRIVATE IP Allocation**: Configured (disabled by default)
- 🔒 **Security**: Blacklist management, input validation

Bot TelegramME siap digunakan! 🎉
