#!/bin/bash

# Quick Setup Script untuk Pterodactyl Telegram Bot
# Author: Pablos (@ImTamaa)
# Version: 1.0 - One-command deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_header() { echo -e "${PURPLE}🔧 $1${NC}"; }

echo "🚀 Pterodactyl Telegram Bot - Quick Setup"
echo "========================================"
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "Please run as regular user with sudo privileges"
   exit 1
fi

# Quick configuration
print_header "Quick Configuration"
echo "This script will set up the bot with minimal prompts."
echo "For advanced configuration, use ./install.sh instead."
echo ""

# Essential configuration
read -p "🤖 Bot Token: " BOT_TOKEN
read -p "👤 Your Telegram ID: " OWNER_ID
read -p "🌐 Pterodactyl Panel URL: " PANEL_URL
read -p "🔑 Application API Key: " APP_KEY
read -p "🔑 Client API Key: " CLIENT_KEY

# Set defaults
BOT_DIR="/var/www/pterodactyl-bot"
DEPLOYMENT_MODE="polling"

print_info "Configuration:"
echo "  Bot Directory: $BOT_DIR"
echo "  Deployment: $DEPLOYMENT_MODE (Polling Mode)"
echo ""

read -p "Continue with installation? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    print_error "Installation cancelled"
    exit 1
fi

# Start installation
print_header "Starting Quick Installation"

# Update system
print_info "Updating system..."
sudo apt update -qq

# Install essential packages
print_info "Installing packages..."
sudo apt install -y php8.1 php8.1-cli php8.1-curl php8.1-json php8.1-sqlite3 php8.1-mbstring php8.1-xml curl unzip git supervisor -qq

# Install Composer if not exists
if ! command -v composer >/dev/null 2>&1; then
    print_info "Installing Composer..."
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
    sudo chmod +x /usr/local/bin/composer
fi

# Create bot directory
print_info "Setting up bot directory..."
sudo mkdir -p $BOT_DIR
sudo chown $USER:www-data $BOT_DIR

# Copy files
print_info "Deploying bot files..."
cp -r . $BOT_DIR/
cd $BOT_DIR

# Install dependencies
print_info "Installing dependencies..."
composer install --no-dev --optimize-autoloader -q

# Setup permissions
sudo chown -R $USER:www-data $BOT_DIR
sudo chmod -R 755 $BOT_DIR
sudo chmod -R 777 $BOT_DIR/logs

# Configure environment
print_info "Configuring environment..."
cp .env.example .env

# Update .env with user input
sed -i "s|BOT_TOKEN=.*|BOT_TOKEN=$BOT_TOKEN|g" .env
sed -i "s|OWNER_TELEGRAM_ID=.*|OWNER_TELEGRAM_ID=$OWNER_ID|g" .env
sed -i "s|PTERODACTYL_PANEL_URL=.*|PTERODACTYL_PANEL_URL=$PANEL_URL|g" .env
sed -i "s|PTERODACTYL_APPLICATION_API_KEY=.*|PTERODACTYL_APPLICATION_API_KEY=$APP_KEY|g" .env
sed -i "s|PTERODACTYL_CLIENT_API_KEY=.*|PTERODACTYL_CLIENT_API_KEY=$CLIENT_KEY|g" .env

# Setup service for polling mode
print_info "Setting up background service..."
sudo cp systemd.service /etc/systemd/system/pterodactyl-bot.service
sudo sed -i "s|/path/to/pterodactyl-telegram-bot|$BOT_DIR|g" /etc/systemd/system/pterodactyl-bot.service

sudo systemctl daemon-reload
sudo systemctl enable pterodactyl-bot
sudo systemctl start pterodactyl-bot

# Setup basic cron jobs
print_info "Setting up maintenance tasks..."
(crontab -l 2>/dev/null; echo "0 2 * * * $BOT_DIR/deploy.php cleanup") | crontab -

# Test installation
print_info "Testing installation..."
if php test.php >/dev/null 2>&1; then
    print_success "Installation test passed!"
else
    print_warning "Installation test failed - check configuration"
fi

# Final status
echo ""
print_success "🎉 Quick setup completed!"
echo ""

print_header "📋 Setup Summary"
echo "Bot Directory: $BOT_DIR"
echo "Mode: $DEPLOYMENT_MODE (Polling)"
echo ""

print_header "🚀 Next Steps"
echo "1. Send /start to your Telegram bot"
echo "2. Test with: cd $BOT_DIR && php index.php health"
echo "3. Check service: sudo systemctl status pterodactyl-bot"
echo "4. View logs: sudo journalctl -u pterodactyl-bot -f"
echo "5. Manual start: cd $BOT_DIR && php index.php polling"

echo ""
print_success "🤖 Your bot is ready! Happy botting!"
print_info "For advanced features, run: cd $BOT_DIR && ./install.sh"
