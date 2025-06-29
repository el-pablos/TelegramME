#!/bin/bash

# Update Bot Script - Fix MySQL Error
# Author: Pablos (@ImTamaa)

echo "🔄 Update Pterodactyl Telegram Bot - Fix MySQL Error"
echo "=================================================="
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
   print_info "Run: sudo su - then ./update-bot.sh"
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

# Backup current Bot.php
print_info "Backing up current Bot.php..."
cp $BOT_DIR/src/Bot.php $BOT_DIR/src/Bot.php.backup

# Download latest Bot.php
print_info "Downloading latest Bot.php (MySQL-free version)..."
if curl -s -o $BOT_DIR/src/Bot.php.new https://raw.githubusercontent.com/el-pablos/ptero-panel-control/main/src/Bot.php; then
    mv $BOT_DIR/src/Bot.php.new $BOT_DIR/src/Bot.php
    print_success "Bot.php updated successfully!"
else
    print_error "Failed to download latest Bot.php"
    print_info "Restoring backup..."
    mv $BOT_DIR/src/Bot.php.backup $BOT_DIR/src/Bot.php
    exit 1
fi

# Fix permissions
print_info "Fixing permissions..."
chown -R root:root $BOT_DIR
chmod -R 755 $BOT_DIR

# Test bot
print_info "Testing updated bot..."
cd $BOT_DIR

if php index.php health >/dev/null 2>&1; then
    print_success "Bot health check passed!"
else
    print_error "Bot health check failed!"
    print_info "Restoring backup..."
    mv $BOT_DIR/src/Bot.php.backup $BOT_DIR/src/Bot.php
    exit 1
fi

# Start service
print_info "Starting bot service..."
systemctl start pterodactyl-bot

sleep 3

# Check service status
if systemctl is-active --quiet pterodactyl-bot; then
    print_success "Bot service started successfully!"
    
    # Show service status
    echo ""
    print_info "Service status:"
    systemctl status pterodactyl-bot --no-pager -l | head -15
    
    echo ""
    print_info "Recent logs (should be clean now):"
    journalctl -u pterodactyl-bot -n 5 --no-pager
    
else
    print_error "Bot service failed to start!"
    print_info "Restoring backup..."
    systemctl stop pterodactyl-bot
    mv $BOT_DIR/src/Bot.php.backup $BOT_DIR/src/Bot.php
    systemctl start pterodactyl-bot
    exit 1
fi

# Cleanup backup
rm -f $BOT_DIR/src/Bot.php.backup

echo ""
print_success "🎉 Bot update completed successfully!"
echo ""

print_info "📋 What was fixed:"
echo "  ❌ Removed MySQL dependency completely"
echo "  ✅ Direct Telegram API calls using cURL"
echo "  ✅ Simple manual update processing"
echo "  ✅ No more 'MySQL connection required' errors"
echo ""

print_info "📱 Test your Telegram bot:"
echo "  1. Open Telegram"
echo "  2. Send /start to your bot"
echo "  3. Bot should respond with menu"
echo ""

print_info "🔧 Useful commands:"
echo "  systemctl status pterodactyl-bot"
echo "  journalctl -u pterodactyl-bot -f"
echo "  cd $BOT_DIR && php index.php health"
echo ""

print_success "🤖 Your bot should now work without MySQL errors!"
