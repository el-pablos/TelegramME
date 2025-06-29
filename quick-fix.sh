#!/bin/bash

# Quick Fix untuk Pterodactyl Telegram Bot
# Author: Pablos (@ImTamaa)

echo "🚀 Quick Fix Pterodactyl Telegram Bot"
echo "===================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root"
   echo "ℹ️ Run: sudo su - then ./quick-fix.sh"
   exit 1
fi

echo "✅ Running as root - perfect!"
echo ""

# Find bot directory
if [ -d "/root/pterodactyl-bot" ]; then
    BOT_DIR="/root/pterodactyl-bot"
elif [ -d "/var/www/pterodactyl-bot" ]; then
    BOT_DIR="/var/www/pterodactyl-bot"
elif [ -f "index.php" ]; then
    BOT_DIR="$(pwd)"
else
    echo "❌ Bot not found! Please run ./root-setup.sh first"
    exit 1
fi

echo "✅ Found bot in: $BOT_DIR"
echo ""

# Stop service
echo "🛑 Stopping service..."
systemctl stop pterodactyl-bot 2>/dev/null || true

# Fix service file
echo "🔧 Fixing service configuration..."
cat > /etc/systemd/system/pterodactyl-bot.service << EOF
[Unit]
Description=Pterodactyl Telegram Control Bot
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=$BOT_DIR
ExecStart=/usr/bin/php $BOT_DIR/index.php polling
Restart=always
RestartSec=5
StartLimitInterval=60s
StartLimitBurst=3

[Install]
WantedBy=multi-user.target
EOF

# Fix permissions
echo "🔒 Fixing permissions..."
chown -R root:root $BOT_DIR
chmod -R 755 $BOT_DIR
mkdir -p $BOT_DIR/logs
chmod -R 777 $BOT_DIR/logs

# Test bot
echo "🧪 Testing bot..."
cd $BOT_DIR

if php index.php health >/dev/null 2>&1; then
    echo "✅ Bot health check passed!"
else
    echo "❌ Bot health check failed!"
    echo "ℹ️ Running health check:"
    php index.php health
    echo ""
fi

# Reload and start service
echo "🔄 Starting service..."
systemctl daemon-reload
systemctl enable pterodactyl-bot
systemctl start pterodactyl-bot

sleep 3

# Check status
if systemctl is-active --quiet pterodactyl-bot; then
    echo "✅ Service is running!"
    echo ""
    echo "📱 Your Telegram bot should now respond to /start"
    echo ""
    echo "🔧 Useful commands:"
    echo "  systemctl status pterodactyl-bot"
    echo "  journalctl -u pterodactyl-bot -f"
    echo "  cd $BOT_DIR && php index.php health"
else
    echo "❌ Service failed to start!"
    echo ""
    echo "📋 Debug info:"
    systemctl status pterodactyl-bot --no-pager
    echo ""
    echo "📝 Recent logs:"
    journalctl -u pterodactyl-bot -n 10 --no-pager
    echo ""
    echo "🔧 Try manual start:"
    echo "  cd $BOT_DIR"
    echo "  php index.php polling"
fi
