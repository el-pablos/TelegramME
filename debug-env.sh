#!/bin/bash

# Debug Environment Variables
# Author: Pablos (@ImTamaa)

echo "🔍 Debug Environment Variables"
echo "============================="
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

# Find bot directory
if [ -d "/root/pterodactyl-bot" ]; then
    BOT_DIR="/root/pterodactyl-bot"
elif [ -d "/var/www/pterodactyl-bot" ]; then
    BOT_DIR="/var/www/pterodactyl-bot"
else
    print_error "Bot installation not found!"
    exit 1
fi

print_success "Found bot in: $BOT_DIR"
echo ""

# Check .env file
print_info "Checking .env file..."
if [ -f "$BOT_DIR/.env" ]; then
    print_success ".env file exists"
    
    echo ""
    print_info ".env file content:"
    echo "=================="
    cat $BOT_DIR/.env | grep -v "^#" | grep -v "^$"
    echo "=================="
    echo ""
    
    # Check specific variables
    BOT_TOKEN=$(grep "^BOT_TOKEN=" $BOT_DIR/.env 2>/dev/null | cut -d'=' -f2)
    OWNER_ID=$(grep "^OWNER_TELEGRAM_ID=" $BOT_DIR/.env 2>/dev/null | cut -d'=' -f2)
    PANEL_URL=$(grep "^PTERODACTYL_PANEL_URL=" $BOT_DIR/.env 2>/dev/null | cut -d'=' -f2)
    
    print_info "Environment variables:"
    if [ -n "$BOT_TOKEN" ]; then
        print_success "BOT_TOKEN: ${BOT_TOKEN:0:10}..."
    else
        print_error "BOT_TOKEN: Not found"
    fi
    
    if [ -n "$OWNER_ID" ]; then
        print_success "OWNER_TELEGRAM_ID: $OWNER_ID"
    else
        print_error "OWNER_TELEGRAM_ID: Not found"
    fi
    
    if [ -n "$PANEL_URL" ]; then
        print_success "PTERODACTYL_PANEL_URL: $PANEL_URL"
    else
        print_error "PTERODACTYL_PANEL_URL: Not found"
    fi
    
else
    print_error ".env file not found!"
    
    # Check if .env exists in current directory
    if [ -f ".env" ]; then
        print_info "Found .env in current directory, copying..."
        cp .env $BOT_DIR/.env
        print_success ".env copied to $BOT_DIR"
    else
        print_error "No .env file found anywhere!"
        exit 1
    fi
fi

echo ""

# Test loading .env manually
print_info "Testing .env loading..."
cd $BOT_DIR

if [ -f .env ]; then
    set -a
    source .env
    set +a
    
    if [ -n "$BOT_TOKEN" ]; then
        print_success "BOT_TOKEN loaded: ${BOT_TOKEN:0:10}..."
    else
        print_error "BOT_TOKEN not loaded"
    fi
    
    if [ -n "$OWNER_TELEGRAM_ID" ]; then
        print_success "OWNER_TELEGRAM_ID loaded: $OWNER_TELEGRAM_ID"
    else
        print_error "OWNER_TELEGRAM_ID not loaded"
    fi
else
    print_error "Cannot load .env file"
fi

echo ""

# Test PHP loading .env
print_info "Testing PHP .env loading..."
php -r "
require_once 'vendor/autoload.php';
\$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
\$dotenv->load();
echo 'BOT_TOKEN: ' . (\$_ENV['BOT_TOKEN'] ?? 'NOT FOUND') . PHP_EOL;
echo 'OWNER_TELEGRAM_ID: ' . (\$_ENV['OWNER_TELEGRAM_ID'] ?? 'NOT FOUND') . PHP_EOL;
"

echo ""

# Test bot health
print_info "Testing bot health..."
if php index.php health >/dev/null 2>&1; then
    print_success "Bot health check passed!"
else
    print_error "Bot health check failed!"
    print_info "Running health check with output:"
    php index.php health
fi

echo ""

# Check service file
print_info "Checking service file..."
if [ -f "/etc/systemd/system/pterodactyl-bot.service" ]; then
    print_success "Service file exists"
    echo ""
    print_info "Service file content:"
    echo "===================="
    cat /etc/systemd/system/pterodactyl-bot.service
    echo "===================="
else
    print_error "Service file not found!"
fi

echo ""
print_success "🔍 Debug completed!"
