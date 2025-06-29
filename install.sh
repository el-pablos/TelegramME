#!/bin/bash

# Smart Installation script untuk Pterodactyl Telegram Bot
# Author: Pablos (@ImTamaa)
# Version: 2.0 - Smart Detection & Auto Deploy

set -e

echo "🚀 Pterodactyl Telegram Bot - Smart Installation Script"
echo "======================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

print_skip() {
    echo -e "${CYAN}⏭️ $1${NC}"
}

print_header() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as regular user with sudo privileges."
   exit 1
fi

# Check OS and version
check_os() {
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        print_error "This script is designed for Linux systems"
        exit 1
    fi

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
        print_info "Detected OS: $OS $VER"

        if [[ $ID != "ubuntu" ]]; then
            print_warning "This script is optimized for Ubuntu. Proceeding anyway..."
        fi
    else
        print_warning "Cannot detect OS version. Proceeding anyway..."
    fi
}

# Check if package is installed
is_installed() {
    dpkg -l | grep -q "^ii  $1 " 2>/dev/null
}

# Check if service exists
service_exists() {
    systemctl list-unit-files | grep -q "^$1.service" 2>/dev/null
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check PHP version
check_php_version() {
    if command_exists php; then
        PHP_VERSION=$(php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;")
        if [[ $(echo "$PHP_VERSION >= 8.0" | bc -l) -eq 1 ]]; then
            return 0
        fi
    fi
    return 1
}

# Get user input with default
get_input() {
    local prompt="$1"
    local default="$2"
    local result

    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " result
        echo "${result:-$default}"
    else
        read -p "$prompt: " result
        echo "$result"
    fi
}

# Variables
BOT_DIR="/var/www/pterodactyl-bot"
SERVICE_NAME="pterodactyl-bot"
REQUIRED_PACKAGES="php8.1 php8.1-cli php8.1-curl php8.1-json php8.1-sqlite3 php8.1-mbstring php8.1-xml curl unzip git supervisor"

# Start installation
print_header "Starting Smart Installation Process"
check_os

# Interactive configuration
print_header "Configuration Setup"
BOT_DIR=$(get_input "Bot installation directory" "$BOT_DIR")
DEPLOYMENT_MODE="polling"
print_info "Deployment mode: Polling (no web server needed)"

# 1. Update system
print_header "System Update"
if [ -f /var/lib/apt/periodic/update-success-stamp ]; then
    LAST_UPDATE=$(stat -c %Y /var/lib/apt/periodic/update-success-stamp)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_UPDATE))

    if [ $TIME_DIFF -lt 3600 ]; then
        print_skip "System updated recently (less than 1 hour ago)"
    else
        print_info "Updating system packages..."
        sudo apt update && sudo apt upgrade -y
        print_success "System updated"
    fi
else
    print_info "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    print_success "System updated"
fi

# 2. Install required packages
print_header "Package Installation"
PACKAGES_TO_INSTALL=""

for package in $REQUIRED_PACKAGES; do
    if is_installed "$package"; then
        print_skip "$package already installed"
    else
        PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL $package"
    fi
done

# Check for composer separately
if command_exists composer; then
    print_skip "Composer already installed"
else
    print_info "Installing Composer..."
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
    sudo chmod +x /usr/local/bin/composer
    print_success "Composer installed"
fi

if [ -n "$PACKAGES_TO_INSTALL" ]; then
    print_info "Installing packages:$PACKAGES_TO_INSTALL"
    sudo apt install -y $PACKAGES_TO_INSTALL
    print_success "New packages installed"
else
    print_skip "All required packages already installed"
fi

# 3. Create bot directory
print_header "Bot Directory Setup"
if [ -d "$BOT_DIR" ]; then
    print_warning "Bot directory already exists: $BOT_DIR"
    OVERWRITE=$(get_input "Overwrite existing installation? (y/n)" "n")
    if [ "$OVERWRITE" = "y" ]; then
        print_info "Backing up existing installation..."
        sudo mv "$BOT_DIR" "${BOT_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
        print_success "Backup created"
    else
        print_error "Installation cancelled"
        exit 1
    fi
fi

print_info "Creating bot directory..."
sudo mkdir -p $BOT_DIR
sudo chown $USER:www-data $BOT_DIR
sudo chmod 755 $BOT_DIR
print_success "Bot directory created: $BOT_DIR"

# 4. Copy files
print_header "File Deployment"
print_info "Copying bot files..."
cp -r . $BOT_DIR/
cd $BOT_DIR

# Remove unnecessary files
rm -f $BOT_DIR/*.zip $BOT_DIR/.git* 2>/dev/null || true
print_success "Files copied and cleaned"

# 5. Install dependencies
print_header "PHP Dependencies"
if [ -d "$BOT_DIR/vendor" ] && [ -f "$BOT_DIR/composer.lock" ]; then
    print_skip "Dependencies already installed"
    print_info "Updating dependencies..."
    composer update --no-dev --optimize-autoloader
else
    print_info "Installing PHP dependencies..."
    composer install --no-dev --optimize-autoloader
fi
print_success "Dependencies ready"

# 6. Setup permissions
print_header "Permissions Setup"
print_info "Setting up permissions..."
sudo chown -R $USER:www-data $BOT_DIR
sudo chmod -R 755 $BOT_DIR
sudo chmod -R 777 $BOT_DIR/logs
print_success "Permissions set"

# 7. Setup environment
print_header "Environment Configuration"
if [ ! -f "$BOT_DIR/.env" ]; then
    cp $BOT_DIR/.env.example $BOT_DIR/.env
    print_success ".env file created from template"

    # Interactive configuration
    print_info "Configuring bot settings..."
    BOT_TOKEN=$(get_input "Bot Token" "")
    OWNER_ID=$(get_input "Owner Telegram ID" "")
    PANEL_URL=$(get_input "Pterodactyl Panel URL" "")
    APP_KEY=$(get_input "Application API Key" "")
    CLIENT_KEY=$(get_input "Client API Key" "")

    # Update .env file
    sed -i "s|BOT_TOKEN=.*|BOT_TOKEN=$BOT_TOKEN|g" $BOT_DIR/.env
    sed -i "s|OWNER_TELEGRAM_ID=.*|OWNER_TELEGRAM_ID=$OWNER_ID|g" $BOT_DIR/.env
    sed -i "s|PTERODACTYL_PANEL_URL=.*|PTERODACTYL_PANEL_URL=$PANEL_URL|g" $BOT_DIR/.env
    sed -i "s|PTERODACTYL_APPLICATION_API_KEY=.*|PTERODACTYL_APPLICATION_API_KEY=$APP_KEY|g" $BOT_DIR/.env
    sed -i "s|PTERODACTYL_CLIENT_API_KEY=.*|PTERODACTYL_CLIENT_API_KEY=$CLIENT_KEY|g" $BOT_DIR/.env



    print_success "Environment configured"
else
    print_skip ".env file already exists"
fi

# 8. Skip web server (polling mode only)
print_header "Web Server Configuration"
print_skip "Web server not needed for polling mode"

# 9. Setup Service (Supervisor and Systemd)
print_header "Service Configuration"

# Setup Supervisor for polling mode
if [ -f "/etc/supervisor/conf.d/$SERVICE_NAME.conf" ]; then
    print_skip "Supervisor configuration already exists"
else
    print_info "Setting up Supervisor for polling mode..."
    sudo cp $BOT_DIR/supervisor.conf /etc/supervisor/conf.d/$SERVICE_NAME.conf
    sudo sed -i "s|/path/to/pterodactyl-telegram-bot|$BOT_DIR|g" /etc/supervisor/conf.d/$SERVICE_NAME.conf

    if sudo supervisorctl reread && sudo supervisorctl update; then
        print_success "Supervisor configured"
    else
        print_warning "Supervisor configuration may need manual review"
    fi
fi

# Setup systemd service (alternative)
if service_exists "$SERVICE_NAME"; then
    print_skip "Systemd service already exists"
else
    print_info "Setting up systemd service..."
    sudo cp $BOT_DIR/systemd.service /etc/systemd/system/$SERVICE_NAME.service
    sudo sed -i "s|/path/to/pterodactyl-telegram-bot|$BOT_DIR|g" /etc/systemd/system/$SERVICE_NAME.service

    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
    print_success "Systemd service configured"
fi

# 10. Setup cron jobs
print_header "Cron Jobs Setup"
if crontab -l 2>/dev/null | grep -q "pterodactyl-bot"; then
    print_skip "Cron jobs already configured"
else
    print_info "Setting up cron jobs..."
    # Create cron file with updated paths
    sed "s|/path/to/pterodactyl-telegram-bot|$BOT_DIR|g" $BOT_DIR/crontab.txt > /tmp/pterodactyl-bot-cron

    # Merge with existing crontab
    (crontab -l 2>/dev/null; cat /tmp/pterodactyl-bot-cron) | crontab -
    rm /tmp/pterodactyl-bot-cron
    print_success "Cron jobs configured"
fi

# 11. Create log directories
print_header "Logging Setup"
LOG_DIRS="/var/log/supervisor /var/log/nginx"
for dir in $LOG_DIRS; do
    if [ ! -d "$dir" ]; then
        sudo mkdir -p "$dir"
    fi
done

LOG_FILES="/var/log/pterodactyl-bot-cron.log /var/log/pterodactyl-bot-health.log"
for file in $LOG_FILES; do
    if [ ! -f "$file" ]; then
        sudo touch "$file"
        sudo chown $USER:www-data "$file"
    fi
done
print_success "Log directories and files ready"

# 12. SSL Setup (not needed for polling mode)
print_header "SSL Configuration"
print_skip "SSL not needed for polling mode"

# 13. Run tests
print_header "System Testing"
cd $BOT_DIR
print_info "Running comprehensive tests..."

if php test.php; then
    print_success "All tests passed!"
else
    print_warning "Some tests failed. Check the output above."
fi

# 14. Final setup and start services
print_header "Service Startup"
print_info "Starting polling service..."
if service_exists "$SERVICE_NAME"; then
    sudo systemctl start $SERVICE_NAME
    if sudo systemctl is-active --quiet $SERVICE_NAME; then
        print_success "Service started successfully"
    else
        print_warning "Service failed to start - check logs"
    fi
fi

# 15. Final health check
print_header "Final Health Check"
cd $BOT_DIR
if php deploy.php health >/dev/null 2>&1; then
    print_success "Health check passed!"
else
    print_warning "Health check failed - manual configuration may be needed"
fi

echo ""
print_success "🎉 Installation completed successfully!"
echo ""

print_header "📋 Installation Summary"
echo "Bot Directory: $BOT_DIR"
echo "Deployment Mode: $DEPLOYMENT_MODE (Polling)"
echo "Service: $SERVICE_NAME"
echo ""

print_header "🚀 Next Steps"
echo "1. Check service: sudo systemctl status $SERVICE_NAME"
echo "2. Send /start to your Telegram bot"
echo "3. Monitor logs: sudo journalctl -u $SERVICE_NAME -f"
echo "4. Manual start: cd $BOT_DIR && php index.php polling"
echo ""

print_header "🛠️ Useful Commands"
echo "• Health check: cd $BOT_DIR && php deploy.php health"
echo "• Bot stats: cd $BOT_DIR && php deploy.php stats"
echo "• Run tests: cd $BOT_DIR && php test.php"
echo "• Cleanup: cd $BOT_DIR && php deploy.php cleanup"
echo "• Restart service: sudo systemctl restart $SERVICE_NAME"
echo "• Check nginx: sudo nginx -t && sudo systemctl status nginx"
echo ""

print_header "📁 Important Files"
echo "• Configuration: $BOT_DIR/.env"
echo "• Service config: /etc/systemd/system/$SERVICE_NAME.service"
echo "• Supervisor config: /etc/supervisor/conf.d/$SERVICE_NAME.conf"
echo "• Bot logs: $BOT_DIR/logs/"
echo "• System logs: /var/log/pterodactyl-bot-*.log"
echo ""

print_success "🤖 Happy botting! Your Pterodactyl Telegram Bot is ready!"
echo ""
print_info "Need help? Contact @ImTamaa on Telegram"
