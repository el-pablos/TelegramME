#!/bin/bash

# Pterodactyl Telegram Bot - Node.js Installation Script
# Author: Pablos (@ImTamaa)
# Simple, Clean, and Working!

set -e

echo "🚀 Pterodactyl Telegram Bot - Node.js Installation"
echo "================================================="
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
if [[ $EUID -eq 0 ]]; then
   print_info "Running as root - perfect for VPS!"
   RUNNING_AS_ROOT=true
else
   print_info "Running as regular user"
   RUNNING_AS_ROOT=false
fi

echo ""

# Set installation directory
BOT_DIR="/root/TelegramME"
if [[ $RUNNING_AS_ROOT != true ]]; then
    BOT_DIR="$HOME/TelegramME"
fi

print_info "Installation directory: $BOT_DIR"
echo ""

# Check for existing .env
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
        echo ""
        read -p "Use existing configuration? (y/n): " USE_EXISTING
        if [ "$USE_EXISTING" = "y" ]; then
            SKIP_CONFIG=true
        else
            SKIP_CONFIG=false
        fi
    else
        SKIP_CONFIG=false
    fi
else
    SKIP_CONFIG=false
fi

# Get configuration if needed
if [ "$SKIP_CONFIG" != "true" ]; then
    print_info "Setting up bot configuration..."
    echo ""
    read -p "🤖 Bot Token: " BOT_TOKEN
    read -p "👤 Your Telegram ID: " OWNER_ID
    read -p "🌐 Pterodactyl Panel URL: " PANEL_URL
    read -p "🔑 Application API Key: " APP_KEY
    read -p "🔑 Client API Key: " CLIENT_KEY
    echo ""
fi

print_info "Configuration:"
echo "  Bot Directory: $BOT_DIR"
echo "  Owner ID: $OWNER_ID"
echo "  Panel URL: $PANEL_URL"
echo ""

read -p "Continue with installation? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    print_error "Installation cancelled"
    exit 1
fi

echo ""

# Update system
print_info "Updating system packages..."
if [[ $RUNNING_AS_ROOT == true ]]; then
    apt update -qq
else
    sudo apt update -qq
fi

# Install Node.js if not present
if ! command -v node >/dev/null 2>&1; then
    print_info "Installing Node.js..."
    if [[ $RUNNING_AS_ROOT == true ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    else
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    print_success "Node.js installed"
else
    NODE_VERSION=$(node --version)
    print_success "Node.js already installed: $NODE_VERSION"
fi

# Install npm if not present
if ! command -v npm >/dev/null 2>&1; then
    print_info "Installing npm..."
    if [[ $RUNNING_AS_ROOT == true ]]; then
        apt-get install -y npm
    else
        sudo apt-get install -y npm
    fi
    print_success "npm installed"
else
    NPM_VERSION=$(npm --version)
    print_success "npm already installed: $NPM_VERSION"
fi

# Create bot directory
print_info "Creating bot directory..."
if [[ $RUNNING_AS_ROOT == true ]]; then
    mkdir -p $BOT_DIR
    chown root:root $BOT_DIR
else
    mkdir -p $BOT_DIR
fi

# Copy files
print_info "Copying bot files..."
cp package.json $BOT_DIR/
cp bot.js $BOT_DIR/
cp health.js $BOT_DIR/
cp setup.js $BOT_DIR/

# Create .env file
if [ "$SKIP_CONFIG" != "true" ]; then
    print_info "Creating configuration file..."
    cat > $BOT_DIR/.env << EOF
# Pterodactyl Telegram Bot Configuration
BOT_TOKEN=$BOT_TOKEN
BOT_USERNAME=pterodactyl_control_bot
OWNER_TELEGRAM_ID=$OWNER_ID
PTERODACTYL_PANEL_URL=$PANEL_URL
PTERODACTYL_APPLICATION_API_KEY=$APP_KEY
PTERODACTYL_CLIENT_API_KEY=$CLIENT_KEY
LOG_LEVEL=INFO
DEBUG_MODE=false
AUTHOR_NAME=Pablos
AUTHOR_TELEGRAM=@ImTamaa
EOF
else
    print_info "Using existing configuration..."
    cp .env $BOT_DIR/
fi

# Install dependencies
print_info "Installing Node.js dependencies..."
cd $BOT_DIR
npm install --production

# Set permissions
print_info "Setting permissions..."
if [[ $RUNNING_AS_ROOT == true ]]; then
    chown -R root:root $BOT_DIR
    chmod +x $BOT_DIR/bot.js
    chmod +x $BOT_DIR/health.js
else
    chmod +x $BOT_DIR/bot.js
    chmod +x $BOT_DIR/health.js
fi

# Create systemd service
print_info "Creating systemd service..."
SERVICE_CONTENT="[Unit]
Description=TelegramME Control Bot (Node.js)
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$BOT_DIR
ExecStart=/usr/bin/node $BOT_DIR/bot.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target"

if [[ $RUNNING_AS_ROOT == true ]]; then
    echo "$SERVICE_CONTENT" > /etc/systemd/system/TelegramME.service
    systemctl daemon-reload
    systemctl enable TelegramME
else
    echo "$SERVICE_CONTENT" | sudo tee /etc/systemd/system/TelegramME.service > /dev/null
    sudo systemctl daemon-reload
    sudo systemctl enable TelegramME
fi

# Test bot
print_info "Testing bot..."
cd $BOT_DIR
if node health.js >/dev/null 2>&1; then
    print_success "Bot health check passed!"
else
    print_warning "Bot health check failed - check configuration"
fi

# Start service
print_info "Starting bot service..."
if [[ $RUNNING_AS_ROOT == true ]]; then
    systemctl start TelegramME
else
    sudo systemctl start TelegramME
fi

sleep 3

# Check service status
if systemctl is-active --quiet TelegramME; then
    print_success "Bot service started successfully!"
else
    print_warning "Bot service failed to start - check logs"
fi

echo ""
print_success "🎉 Installation completed!"
echo ""

print_info "📋 Installation Summary:"
echo "  Bot Directory: $BOT_DIR"
echo "  Service: TelegramME"
echo "  Runtime: Node.js"
echo ""

print_info "🚀 Next Steps:"
echo "1. Send /start to your Telegram bot"
echo "2. Test bot features"
echo "3. Check service: systemctl status TelegramME"
echo "4. View logs: journalctl -u TelegramME -f"
echo ""

print_info "🔧 Useful Commands:"
echo "  cd $BOT_DIR && node health.js    # Health check"
echo "  cd $BOT_DIR && node bot.js       # Manual start"
echo "  systemctl restart TelegramME # Restart service"
echo ""

print_success "🤖 Your Node.js Telegram bot is ready!"
