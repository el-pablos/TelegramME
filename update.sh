#!/bin/bash

# Update script untuk Pterodactyl Telegram Bot
# Author: Pablos (@ImTamaa)

set -e

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

echo "🔄 Pterodactyl Telegram Bot - Update Script"
echo "==========================================="
echo ""

BOT_DIR="/var/www/pterodactyl-bot"
SERVICE_NAME="pterodactyl-bot"
BACKUP_DIR="/var/backups/pterodactyl-bot"

# Check if bot is installed
if [ ! -d "$BOT_DIR" ]; then
    print_error "Bot not found in $BOT_DIR"
    print_info "Please run installation first: ./install.sh"
    exit 1
fi

cd $BOT_DIR

# Create backup
print_info "Creating backup..."
sudo mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d_%H%M%S).tar.gz"
sudo tar -czf $BACKUP_FILE -C $(dirname $BOT_DIR) $(basename $BOT_DIR)
print_success "Backup created: $BACKUP_FILE"

# Stop service if running
if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
    print_info "Stopping service..."
    sudo systemctl stop $SERVICE_NAME
    SERVICE_WAS_RUNNING=true
else
    SERVICE_WAS_RUNNING=false
fi

# Update dependencies
print_info "Updating dependencies..."
composer update --no-dev --optimize-autoloader

# Update permissions
print_info "Updating permissions..."
sudo chown -R $USER:www-data $BOT_DIR
sudo chmod -R 755 $BOT_DIR
sudo chmod -R 777 $BOT_DIR/logs

# Run tests
print_info "Running tests..."
if php test.php >/dev/null 2>&1; then
    print_success "Tests passed!"
else
    print_warning "Some tests failed"
fi

# Restart service if it was running
if [ "$SERVICE_WAS_RUNNING" = true ]; then
    print_info "Restarting service..."
    sudo systemctl start $SERVICE_NAME
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        print_success "Service restarted successfully"
    else
        print_error "Service failed to start"
        print_info "Restoring from backup..."
        sudo systemctl stop $SERVICE_NAME 2>/dev/null || true
        sudo rm -rf $BOT_DIR
        sudo tar -xzf $BACKUP_FILE -C $(dirname $BOT_DIR)
        sudo systemctl start $SERVICE_NAME
        print_warning "Restored from backup due to service failure"
        exit 1
    fi
fi

# Cleanup old backups (keep last 5)
print_info "Cleaning up old backups..."
sudo find $BACKUP_DIR -name "backup-*.tar.gz" -type f | sort -r | tail -n +6 | sudo xargs rm -f 2>/dev/null || true

print_success "Update completed successfully!"
print_info "Health check: php deploy.php health"
