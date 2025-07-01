#!/bin/bash

# Debug & Fix Script untuk Pterodactyl Telegram Bot
# Author: Pablos (@ImTamaa)

set -e

echo "🔧 Debug & Fix Pterodactyl Telegram Bot"
echo "======================================"
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
   print_info "Run: sudo su - then ./debug-fix.sh"
   exit 1
fi

print_info "Running as root - perfect!"
echo ""

# Step 1: Check current installation
print_info "🔍 Checking current installation..."

# Check where bot is installed
if [ -d "/root/pterodactyl-bot" ]; then
    BOT_DIR="/root/pterodactyl-bot"
    print_success "Found bot in: $BOT_DIR"
elif [ -d "/var/www/pterodactyl-bot" ]; then
    BOT_DIR="/var/www/pterodactyl-bot"
    print_success "Found bot in: $BOT_DIR"
elif [ -d "$(pwd)" ] && [ -f "$(pwd)/index.php" ]; then
    BOT_DIR="$(pwd)"
    print_success "Found bot in current directory: $BOT_DIR"
else
    print_error "Bot installation not found!"
    print_info "Please run ./root-setup.sh first"
    exit 1
fi

echo ""

# Step 2: Check service configuration
print_info "🔧 Checking service configuration..."

SERVICE_FILE="/etc/systemd/system/pterodactyl-bot.service"
if [ -f "$SERVICE_FILE" ]; then
    CURRENT_PATH=$(grep "WorkingDirectory=" $SERVICE_FILE | cut -d'=' -f2)
    CURRENT_EXEC=$(grep "ExecStart=" $SERVICE_FILE | cut -d'=' -f2-)
    
    print_info "Current service config:"
    echo "  WorkingDirectory: $CURRENT_PATH"
    echo "  ExecStart: $CURRENT_EXEC"
    
    if [[ "$CURRENT_PATH" != "$BOT_DIR" ]]; then
        print_warning "Service path mismatch! Fixing..."
        
        # Fix service file
        sed -i "s|WorkingDirectory=.*|WorkingDirectory=$BOT_DIR|g" $SERVICE_FILE
        sed -i "s|ExecStart=.*|ExecStart=/usr/bin/php $BOT_DIR/index.php polling|g" $SERVICE_FILE
        sed -i "s|EnvironmentFile=.*|EnvironmentFile=$BOT_DIR/.env|g" $SERVICE_FILE
        sed -i "s|ReadWritePaths=.*|ReadWritePaths=$BOT_DIR/logs|g" $SERVICE_FILE
        
        print_success "Service configuration fixed!"
    else
        print_success "Service configuration is correct"
    fi
else
    print_warning "Service file not found! Creating..."
    
    # Create service file
    cat > $SERVICE_FILE << EOF
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

# Security settings (relaxed for root compatibility)
NoNewPrivileges=false
PrivateTmp=false
ProtectSystem=false
ProtectHome=false
ReadWritePaths=$BOT_DIR/logs

[Install]
WantedBy=multi-user.target
EOF
    
    print_success "Service file created!"
fi

echo ""

# Step 3: Check .env file
print_info "📋 Checking .env configuration..."

if [ -f "$BOT_DIR/.env" ]; then
    BOT_TOKEN=$(grep "^BOT_TOKEN=" $BOT_DIR/.env 2>/dev/null | cut -d'=' -f2)
    OWNER_ID=$(grep "^OWNER_TELEGRAM_ID=" $BOT_DIR/.env 2>/dev/null | cut -d'=' -f2)
    PANEL_URL=$(grep "^PTERODACTYL_PANEL_URL=" $BOT_DIR/.env 2>/dev/null | cut -d'=' -f2)
    
    if [ -n "$BOT_TOKEN" ] && [ -n "$OWNER_ID" ] && [ -n "$PANEL_URL" ]; then
        print_success ".env configuration looks good"
        echo "  Bot Token: ${BOT_TOKEN:0:10}..."
        echo "  Owner ID: $OWNER_ID"
        echo "  Panel URL: $PANEL_URL"
    else
        print_error ".env configuration incomplete!"
        print_info "Please check $BOT_DIR/.env file"
    fi
else
    print_error ".env file not found!"
    print_info "Please run ./root-setup.sh to configure"
    exit 1
fi

echo ""

# Step 4: Test bot manually
print_info "🧪 Testing bot manually..."

cd $BOT_DIR

# Test health check
if php index.php health >/dev/null 2>&1; then
    print_success "Bot health check passed!"
else
    print_error "Bot health check failed!"
    print_info "Running health check with output:"
    php index.php health
    echo ""
fi

# Step 5: Fix permissions
print_info "🔒 Fixing permissions..."

chown -R root:root $BOT_DIR
chmod -R 755 $BOT_DIR
chmod -R 777 $BOT_DIR/logs

print_success "Permissions fixed!"
echo ""

# Step 6: Reload and restart service
print_info "🔄 Reloading and restarting service..."

systemctl daemon-reload
systemctl stop pterodactyl-bot 2>/dev/null || true
systemctl enable pterodactyl-bot
systemctl start pterodactyl-bot

sleep 3

# Check service status
if systemctl is-active --quiet pterodactyl-bot; then
    print_success "Service is running!"
    systemctl status pterodactyl-bot --no-pager -l
else
    print_error "Service failed to start!"
    print_info "Service logs:"
    journalctl -u pterodactyl-bot -n 20 --no-pager
    echo ""
    print_info "Manual test:"
    cd $BOT_DIR
    php index.php polling &
    MANUAL_PID=$!
    sleep 5
    kill $MANUAL_PID 2>/dev/null || true
    print_info "If manual test works, there might be a service configuration issue"
fi

echo ""

# Step 7: Final instructions
print_success "🎉 Debug & Fix completed!"
echo ""

print_info "📋 Summary:"
echo "  Bot Directory: $BOT_DIR"
echo "  Service File: $SERVICE_FILE"
echo "  User: root"
echo ""

print_info "🔧 Useful Commands:"
echo "  systemctl status pterodactyl-bot    # Check status"
echo "  systemctl restart pterodactyl-bot   # Restart service"
echo "  journalctl -u pterodactyl-bot -f    # View logs"
echo "  cd $BOT_DIR && php index.php health # Health check"
echo "  cd $BOT_DIR && php index.php polling # Manual start"
echo ""

print_info "📱 Test your Telegram bot now!"
print_info "Send /start to your bot and check if it responds"
