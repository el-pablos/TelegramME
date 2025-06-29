#!/bin/bash

# Setup MySQL Database untuk Telegram Bot
# Author: Pablos (@ImTamaa)

echo "🗄️ Setup MySQL Database untuk Telegram Bot"
echo "=========================================="
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
   print_info "Run: sudo su - then ./setup-mysql.sh"
   exit 1
fi

print_info "Running as root - perfect!"
echo ""

# Check if MySQL/MariaDB is running
if systemctl is-active --quiet mysql || systemctl is-active --quiet mariadb; then
    print_success "MySQL/MariaDB is running"
else
    print_error "MySQL/MariaDB is not running!"
    print_info "Starting MySQL/MariaDB..."
    
    if systemctl start mysql 2>/dev/null; then
        print_success "MySQL started"
    elif systemctl start mariadb 2>/dev/null; then
        print_success "MariaDB started"
    else
        print_error "Failed to start MySQL/MariaDB"
        print_info "Please install and start MySQL/MariaDB first"
        exit 1
    fi
fi

echo ""

# Create database and user for telegram bot
print_info "Creating database and user for Telegram bot..."

# Try to connect to MySQL
if mysql -u root -e "SELECT 1;" >/dev/null 2>&1; then
    print_success "Connected to MySQL as root (no password)"
    MYSQL_CMD="mysql -u root"
elif mysql -u root -p -e "SELECT 1;" >/dev/null 2>&1; then
    print_info "MySQL root requires password"
    read -s -p "Enter MySQL root password: " MYSQL_ROOT_PASSWORD
    echo ""
    MYSQL_CMD="mysql -u root -p$MYSQL_ROOT_PASSWORD"
else
    print_error "Cannot connect to MySQL"
    print_info "Please check MySQL installation and root access"
    exit 1
fi

# Create database and tables
print_info "Creating telegram_bot database..."

$MYSQL_CMD << EOF
CREATE DATABASE IF NOT EXISTS telegram_bot;
USE telegram_bot;

CREATE TABLE IF NOT EXISTS telegram_update (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    update_id BIGINT UNSIGNED UNIQUE,
    update_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_bot_conversation (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status ENUM('active', 'cancelled', 'stopped') DEFAULT 'active',
    user_id BIGINT,
    chat_id BIGINT,
    command VARCHAR(160) DEFAULT '',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_bot_user (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNIQUE,
    username VARCHAR(191),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_bot_chat (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    chat_id BIGINT UNIQUE,
    chat_title VARCHAR(255),
    chat_type ENUM('private', 'group', 'supergroup', 'channel'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

GRANT ALL PRIVILEGES ON telegram_bot.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
EOF

if [ $? -eq 0 ]; then
    print_success "Database and tables created successfully!"
else
    print_error "Failed to create database"
    exit 1
fi

echo ""

# Test database connection
print_info "Testing database connection..."

if $MYSQL_CMD -e "USE telegram_bot; SELECT COUNT(*) FROM telegram_update;" >/dev/null 2>&1; then
    print_success "Database connection test passed!"
else
    print_error "Database connection test failed!"
    exit 1
fi

echo ""

# Update bot configuration if needed
BOT_DIR=""
if [ -d "/root/pterodactyl-bot" ]; then
    BOT_DIR="/root/pterodactyl-bot"
elif [ -d "/var/www/pterodactyl-bot" ]; then
    BOT_DIR="/var/www/pterodactyl-bot"
fi

if [ -n "$BOT_DIR" ]; then
    print_info "Bot found in: $BOT_DIR"
    
    # Test bot with MySQL
    cd $BOT_DIR
    if php index.php health >/dev/null 2>&1; then
        print_success "Bot health check passed with MySQL!"
    else
        print_warning "Bot health check failed - but bot will still work"
    fi
    
    # Restart bot service
    print_info "Restarting bot service..."
    systemctl restart pterodactyl-bot
    
    sleep 3
    
    if systemctl is-active --quiet pterodactyl-bot; then
        print_success "Bot service restarted successfully!"
    else
        print_warning "Bot service restart failed - check logs"
    fi
fi

echo ""
print_success "🎉 MySQL setup completed!"
echo ""

print_info "📋 Database Information:"
echo "  Database: telegram_bot"
echo "  User: root"
echo "  Host: localhost"
echo "  Tables: telegram_update, telegram_bot_conversation, telegram_bot_user, telegram_bot_chat"
echo ""

print_info "🔧 Useful Commands:"
echo "  mysql -u root -e 'USE telegram_bot; SHOW TABLES;'"
echo "  mysql -u root -e 'USE telegram_bot; SELECT COUNT(*) FROM telegram_update;'"
echo "  systemctl status pterodactyl-bot"
echo "  journalctl -u pterodactyl-bot -f"
echo ""

print_info "📱 Your Telegram bot should now work without MySQL errors!"
print_info "Send /start to your bot to test it"
