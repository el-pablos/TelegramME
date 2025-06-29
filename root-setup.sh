#!/bin/bash

# Root Setup Script untuk Pterodactyl Telegram Bot
# Author: Pablos (@ImTamaa)
# Optimized for root user on VPS

set -e

echo "🚀 Pterodactyl Telegram Bot - Root Setup"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   print_info "Run: sudo su - then ./root-setup.sh"
   exit 1
fi

print_info "Running as root - perfect for VPS setup!"
echo ""

# Essential configuration
read -p "🤖 Bot Token: " BOT_TOKEN
read -p "👤 Your Telegram ID: " OWNER_ID
read -p "🌐 Pterodactyl Panel URL: " PANEL_URL
read -p "🔑 Application API Key: " APP_KEY
read -p "🔑 Client API Key: " CLIENT_KEY

# Set defaults
BOT_DIR="/root/pterodactyl-bot"

print_info "Configuration:"
echo "  Bot Directory: $BOT_DIR"
echo "  User: root"
echo "  Mode: Polling"
echo ""

read -p "Continue with installation? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    print_error "Installation cancelled"
    exit 1
fi

# Start installation
print_info "Starting Root Installation..."

# Update system
print_info "Updating system..."
apt update -qq

# Detect PHP version
if command -v php >/dev/null 2>&1; then
    PHP_VERSION=$(php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;")
    PHP_MAJOR=$(php -r "echo PHP_MAJOR_VERSION;")
    PHP_MINOR=$(php -r "echo PHP_MINOR_VERSION;")
    
    if [[ $PHP_MAJOR -eq 8 && $PHP_MINOR -ge 1 ]]; then
        PHP_PACKAGE="php${PHP_MAJOR}.${PHP_MINOR}"
        print_success "Using existing PHP $PHP_VERSION"
    else
        PHP_PACKAGE="php8.3"
        print_info "Will install PHP 8.3"
    fi
else
    PHP_PACKAGE="php8.3"
    print_info "Will install PHP 8.3"
fi

# Install essential packages
print_info "Installing packages..."
PACKAGES="$PHP_PACKAGE ${PHP_PACKAGE}-cli ${PHP_PACKAGE}-curl ${PHP_PACKAGE}-json ${PHP_PACKAGE}-sqlite3 ${PHP_PACKAGE}-mbstring ${PHP_PACKAGE}-xml curl unzip git supervisor"
apt install -y $PACKAGES -qq

# Install Composer if not exists
if ! command -v composer >/dev/null 2>&1; then
    print_info "Installing Composer..."
    curl -sS https://getcomposer.org/installer | php
    mv composer.phar /usr/local/bin/composer
    chmod +x /usr/local/bin/composer
fi

# Create bot directory
print_info "Setting up bot directory..."
mkdir -p $BOT_DIR
chown root:root $BOT_DIR

# Copy files
print_info "Deploying bot files..."
cp -r . $BOT_DIR/
cd $BOT_DIR

# Install dependencies
print_info "Installing dependencies..."
composer install --no-dev --optimize-autoloader -q

# Setup permissions
chown -R root:root $BOT_DIR
chmod -R 755 $BOT_DIR
chmod -R 777 $BOT_DIR/logs

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
cp systemd.service /etc/systemd/system/pterodactyl-bot.service
sed -i "s|/path/to/pterodactyl-telegram-bot|$BOT_DIR|g" /etc/systemd/system/pterodactyl-bot.service
sed -i "s|User=www-data|User=root|g" /etc/systemd/system/pterodactyl-bot.service
sed -i "s|Group=www-data|Group=root|g" /etc/systemd/system/pterodactyl-bot.service

systemctl daemon-reload
systemctl enable pterodactyl-bot
systemctl start pterodactyl-bot

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
print_success "🎉 Root setup completed!"
echo ""

print_info "📋 Setup Summary:"
echo "  Bot Directory: $BOT_DIR"
echo "  User: root"
echo "  Mode: Polling"
echo ""

print_info "🚀 Next Steps:"
echo "1. Send /start to your Telegram bot"
echo "2. Test with: cd $BOT_DIR && php index.php health"
echo "3. Check service: systemctl status pterodactyl-bot"
echo "4. View logs: journalctl -u pterodactyl-bot -f"
echo "5. Manual start: cd $BOT_DIR && php index.php polling"

echo ""
print_success "🤖 Your bot is ready! Happy botting!"
print_info "All files are in: $BOT_DIR"
print_info "Service runs as root - perfect for VPS!"

echo ""
print_info "🔧 Useful Commands:"
echo "  systemctl status pterodactyl-bot    # Check status"
echo "  systemctl restart pterodactyl-bot   # Restart bot"
echo "  journalctl -u pterodactyl-bot -f    # View logs"
echo "  cd $BOT_DIR && php index.php health # Health check"
