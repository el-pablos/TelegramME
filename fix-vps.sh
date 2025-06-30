#!/bin/bash

# Fix VPS Bot - Complete Solution
# Author: Pablos (@ImTamaa)

echo "🔧 Fix VPS Bot - Complete Solution"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   print_info "Run: sudo su - then ./fix-vps.sh"
   exit 1
fi

print_info "Running as root - perfect!"
echo ""

# Find bot directory
if [ -d "/root/pterodactyl-bot" ]; then
    BOT_DIR="/root/pterodactyl-bot"
elif [ -d "/var/www/pterodactyl-bot" ]; then
    BOT_DIR="/var/www/pterodactyl-bot"
else
    print_error "Bot installation not found!"
    print_info "Please run ./root-setup.sh first"
    exit 1
fi

print_success "Found bot in: $BOT_DIR"
echo ""

# Stop service
print_info "Stopping bot service..."
systemctl stop pterodactyl-bot

# Check .env file
print_info "Checking .env configuration..."
if [ ! -f "$BOT_DIR/.env" ]; then
    print_error ".env file not found in $BOT_DIR"
    print_info "Copying .env from current directory..."
    if [ -f ".env" ]; then
        cp .env $BOT_DIR/.env
        print_success ".env copied"
    else
        print_error "No .env file found! Please configure manually"
        exit 1
    fi
fi

# Verify .env content
BOT_TOKEN=$(grep "^BOT_TOKEN=" $BOT_DIR/.env 2>/dev/null | cut -d'=' -f2)
if [ -z "$BOT_TOKEN" ]; then
    print_error "BOT_TOKEN not found in .env"
    exit 1
else
    print_success "BOT_TOKEN found: ${BOT_TOKEN:0:10}..."
fi

# Update Bot.php with latest version
print_info "Updating Bot.php with latest MySQL-free version..."
cp src/Bot.php $BOT_DIR/src/Bot.php

# Fix service file to include .env
print_info "Fixing service configuration..."
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

# Environment file
EnvironmentFile=$BOT_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

# Fix permissions
print_info "Fixing permissions..."
chown -R root:root $BOT_DIR
chmod -R 755 $BOT_DIR
mkdir -p $BOT_DIR/logs
chmod -R 777 $BOT_DIR/logs

# Test bot
print_info "Testing bot..."
cd $BOT_DIR

if php index.php health >/dev/null 2>&1; then
    print_success "Bot health check passed!"
else
    print_error "Bot health check failed!"
    php index.php health
    exit 1
fi

# Start service
print_info "Starting bot service..."
systemctl daemon-reload
systemctl enable pterodactyl-bot
systemctl start pterodactyl-bot

sleep 5

# Check service status
if systemctl is-active --quiet pterodactyl-bot; then
    print_success "Bot service started successfully!"
    
    echo ""
    print_info "Service status:"
    systemctl status pterodactyl-bot --no-pager -l | head -10
    
    echo ""
    print_info "Recent logs:"
    journalctl -u pterodactyl-bot -n 5 --no-pager
    
else
    print_error "Bot service failed to start!"
    print_info "Service logs:"
    journalctl -u pterodactyl-bot -n 10 --no-pager
    exit 1
fi

echo ""
print_success "🎉 VPS Bot fix completed!"
echo ""

print_info "📱 Test your Telegram bot:"
echo "  1. Send /start to your bot"
echo "  2. Try /restartall command"
echo "  3. Check if inline keyboard works"
echo ""

print_info "🔧 Monitor logs:"
echo "  journalctl -u pterodactyl-bot -f"
echo ""

print_success "🤖 Your bot should now work perfectly!"
