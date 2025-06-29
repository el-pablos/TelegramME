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
   print_info "Running as root - will setup with root permissions"
   RUNNING_AS_ROOT=true
else
   print_info "Running as regular user with sudo"
   RUNNING_AS_ROOT=false
fi

# Quick configuration
print_header "Quick Configuration"
echo "This script will set up the bot with minimal prompts."
echo "For advanced configuration, use ./install.sh instead."
echo ""

# Set defaults
BOT_DIR="/var/www/pterodactyl-bot"
DEPLOYMENT_MODE="polling"

# Check if .env already exists and is configured
check_existing_env() {
    if [ -f ".env" ]; then
        BOT_TOKEN=$(grep "^BOT_TOKEN=" .env 2>/dev/null | cut -d'=' -f2)
        OWNER_ID=$(grep "^OWNER_TELEGRAM_ID=" .env 2>/dev/null | cut -d'=' -f2)
        PANEL_URL=$(grep "^PTERODACTYL_PANEL_URL=" .env 2>/dev/null | cut -d'=' -f2)
        APP_KEY=$(grep "^PTERODACTYL_APPLICATION_API_KEY=" .env 2>/dev/null | cut -d'=' -f2)
        CLIENT_KEY=$(grep "^PTERODACTYL_CLIENT_API_KEY=" .env 2>/dev/null | cut -d'=' -f2)

        if [ -n "$BOT_TOKEN" ] && [ -n "$OWNER_ID" ] && [ -n "$PANEL_URL" ] && [ -n "$APP_KEY" ] && [ -n "$CLIENT_KEY" ]; then
            print_success "Found existing .env configuration!"
            echo "  Bot Token: ${BOT_TOKEN:0:10}..."
            echo "  Owner ID: $OWNER_ID"
            echo "  Panel URL: $PANEL_URL"
            echo "  App Key: ${APP_KEY:0:15}..."
            echo "  Client Key: ${CLIENT_KEY:0:15}..."
            echo ""
            read -p "Use existing configuration? (y/n): " USE_EXISTING
            if [ "$USE_EXISTING" = "y" ]; then
                return 0
            fi
        fi
    fi
    return 1
}

# Check for existing configuration
if check_existing_env; then
    print_info "Using existing .env configuration"
    SKIP_ENV_CONFIG=true
else
    print_info "Setting up new configuration..."
    SKIP_ENV_CONFIG=false

    # Essential configuration
    read -p "🤖 Bot Token: " BOT_TOKEN
    read -p "👤 Your Telegram ID: " OWNER_ID
    read -p "🌐 Pterodactyl Panel URL: " PANEL_URL
    read -p "🔑 Application API Key: " APP_KEY
    read -p "🔑 Client API Key: " CLIENT_KEY
fi

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
if [[ $RUNNING_AS_ROOT == true ]]; then
    apt update -qq
else
    sudo apt update -qq
fi

# Detect PHP version
if command -v php >/dev/null 2>&1; then
    PHP_VERSION=$(php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;")
    PHP_MAJOR=$(php -r "echo PHP_MAJOR_VERSION;")
    PHP_MINOR=$(php -r "echo PHP_MINOR_VERSION;")

    if [[ $PHP_MAJOR -eq 8 && $PHP_MINOR -ge 1 ]]; then
        PHP_PACKAGE="php${PHP_MAJOR}.${PHP_MINOR}"
        print_info "Using existing PHP $PHP_VERSION"
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

# Fix PHP 8.3+ package names (json is built-in since PHP 8.0)
if [[ $PHP_PACKAGE == "php8.3" ]] || [[ $PHP_PACKAGE == "php8.4" ]]; then
    PACKAGES="$PHP_PACKAGE ${PHP_PACKAGE}-cli ${PHP_PACKAGE}-curl ${PHP_PACKAGE}-sqlite3 ${PHP_PACKAGE}-mbstring ${PHP_PACKAGE}-xml curl unzip git supervisor"
else
    PACKAGES="$PHP_PACKAGE ${PHP_PACKAGE}-cli ${PHP_PACKAGE}-curl ${PHP_PACKAGE}-json ${PHP_PACKAGE}-sqlite3 ${PHP_PACKAGE}-mbstring ${PHP_PACKAGE}-xml curl unzip git supervisor"
fi

print_info "Installing: $PACKAGES"
if [[ $RUNNING_AS_ROOT == true ]]; then
    apt install -y $PACKAGES -qq
else
    sudo apt install -y $PACKAGES -qq
fi

# Install Composer if not exists
if ! command -v composer >/dev/null 2>&1; then
    print_info "Installing Composer..."
    curl -sS https://getcomposer.org/installer | php
    if [[ $RUNNING_AS_ROOT == true ]]; then
        mv composer.phar /usr/local/bin/composer
        chmod +x /usr/local/bin/composer
    else
        sudo mv composer.phar /usr/local/bin/composer
        sudo chmod +x /usr/local/bin/composer
    fi
fi

# Create bot directory
print_info "Setting up bot directory..."
if [[ $RUNNING_AS_ROOT == true ]]; then
    mkdir -p $BOT_DIR
    chown root:root $BOT_DIR
else
    sudo mkdir -p $BOT_DIR
    sudo chown $USER:www-data $BOT_DIR
fi

# Copy files
print_info "Deploying bot files..."
cp -r . $BOT_DIR/
cd $BOT_DIR

# Install dependencies
print_info "Installing dependencies..."
composer install --no-dev --optimize-autoloader -q

# Setup permissions
if [[ $RUNNING_AS_ROOT == true ]]; then
    chown -R root:root $BOT_DIR
    chmod -R 755 $BOT_DIR
    chmod -R 777 $BOT_DIR/logs
else
    sudo chown -R $USER:www-data $BOT_DIR
    sudo chmod -R 755 $BOT_DIR
    sudo chmod -R 777 $BOT_DIR/logs
fi

# Configure environment
if [ "$SKIP_ENV_CONFIG" = "false" ]; then
    print_info "Configuring environment..."
    cp .env.example .env

    # Update .env with user input
    sed -i "s|BOT_TOKEN=.*|BOT_TOKEN=$BOT_TOKEN|g" .env
    sed -i "s|OWNER_TELEGRAM_ID=.*|OWNER_TELEGRAM_ID=$OWNER_ID|g" .env
    sed -i "s|PTERODACTYL_PANEL_URL=.*|PTERODACTYL_PANEL_URL=$PANEL_URL|g" .env
    sed -i "s|PTERODACTYL_APPLICATION_API_KEY=.*|PTERODACTYL_APPLICATION_API_KEY=$APP_KEY|g" .env
    sed -i "s|PTERODACTYL_CLIENT_API_KEY=.*|PTERODACTYL_CLIENT_API_KEY=$CLIENT_KEY|g" .env
    print_success "Environment configured"
else
    print_info "Using existing .env configuration"
    # Copy existing .env to bot directory if we're not already there
    if [ ! -f "$BOT_DIR/.env" ] && [ -f ".env" ]; then
        if [[ $RUNNING_AS_ROOT == true ]]; then
            cp .env $BOT_DIR/.env 2>/dev/null || true
        else
            sudo cp .env $BOT_DIR/.env 2>/dev/null || true
        fi
    fi
fi

# Setup service for polling mode
print_info "Setting up background service..."
if [[ $RUNNING_AS_ROOT == true ]]; then
    cp systemd.service /etc/systemd/system/pterodactyl-bot.service
    sed -i "s|/path/to/pterodactyl-telegram-bot|$BOT_DIR|g" /etc/systemd/system/pterodactyl-bot.service
    sed -i "s|User=www-data|User=root|g" /etc/systemd/system/pterodactyl-bot.service
    sed -i "s|Group=www-data|Group=root|g" /etc/systemd/system/pterodactyl-bot.service

    systemctl daemon-reload
    systemctl enable pterodactyl-bot
    systemctl start pterodactyl-bot
else
    sudo cp systemd.service /etc/systemd/system/pterodactyl-bot.service
    sudo sed -i "s|/path/to/pterodactyl-telegram-bot|$BOT_DIR|g" /etc/systemd/system/pterodactyl-bot.service

    sudo systemctl daemon-reload
    sudo systemctl enable pterodactyl-bot
    sudo systemctl start pterodactyl-bot
fi

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
