#!/bin/bash

# Cleanup Pterodactyl-Bot References Script
# Author: Pablos (@ImTamaa)
# Usage: ./cleanup-pterodactyl-refs.sh

echo "🧹 ===== CLEANING PTERODACTYL-BOT REFERENCES ====="
echo "📅 Started at: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Step 1: Find all files with pterodactyl-bot references
echo ""
print_info "🔍 Scanning for pterodactyl-bot references..."

FILES_TO_CLEAN=(
    "debug-fix.sh"
    "optimize-panel.sh" 
    "clean-all-bots.sh"
    "create-package.ps1"
    "install.sh"
    "monitor-panel.sh"
    "bot-manager.sh"
    "crontab.txt"
    "package.sh"
    "update.sh"
    "fix-duplicate.sh"
)

# Step 2: Clean each file
for file in "${FILES_TO_CLEAN[@]}"; do
    if [ -f "$file" ]; then
        print_info "🔧 Cleaning $file..."
        
        # Create backup
        cp "$file" "$file.backup"
        
        # Replace pterodactyl-bot with TelegramME
        sed -i 's|/root/pterodactyl-bot|/root/TelegramME|g' "$file"
        sed -i 's|/var/www/pterodactyl-bot|/var/www/TelegramME|g' "$file"
        sed -i 's|pterodactyl-bot|TelegramME|g' "$file"
        sed -i 's|pterodactyl_bot|TelegramME|g' "$file"
        sed -i 's|PTERODACTYL_BOT|TELEGRAMME|g' "$file"
        
        # Fix specific patterns
        sed -i 's|Pterodactyl Telegram Control Bot|TelegramME Control Bot|g' "$file"
        sed -i 's|Pterodactyl Bot Manager|TelegramME Manager|g' "$file"
        sed -i 's|Pterodactyl Telegram Bot|TelegramME Bot|g' "$file"
        
        # Fix service names and descriptions
        sed -i 's|Description=.*Pterodactyl.*|Description=TelegramME Control Bot|g' "$file"
        
        print_status "Cleaned $file"
    else
        print_warning "$file not found, skipping..."
    fi
done

# Step 3: Clean systemd service references
echo ""
print_info "🔧 Cleaning systemd service references..."

# Stop old service if exists
if systemctl list-units --full -all | grep -Fq "pterodactyl-bot.service"; then
    print_info "Stopping old pterodactyl-bot service..."
    systemctl stop pterodactyl-bot 2>/dev/null || true
    systemctl disable pterodactyl-bot 2>/dev/null || true
    print_status "Old service stopped"
fi

# Remove old service file
if [ -f "/etc/systemd/system/pterodactyl-bot.service" ]; then
    print_info "Removing old service file..."
    rm -f /etc/systemd/system/pterodactyl-bot.service
    systemctl daemon-reload
    print_status "Old service file removed"
fi

# Step 4: Clean PM2 processes
echo ""
print_info "🔧 Cleaning PM2 process names..."

if command -v pm2 &> /dev/null; then
    # Stop old PM2 processes
    pm2 stop pterodactyl-bot 2>/dev/null || true
    pm2 delete pterodactyl-bot 2>/dev/null || true
    print_status "Old PM2 processes cleaned"
fi

# Step 5: Clean screen sessions
echo ""
print_info "🔧 Cleaning screen sessions..."

screen -S pterodactyl-bot -X quit 2>/dev/null || true
print_status "Old screen sessions cleaned"

# Step 6: Clean old directories (if they exist and are empty)
echo ""
print_info "🔧 Checking for old directories..."

OLD_DIRS=(
    "/root/pterodactyl-bot"
    "/var/www/pterodactyl-bot"
    "/home/*/pterodactyl-bot"
)

for dir in "${OLD_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        if [ "$(ls -A $dir 2>/dev/null)" ]; then
            print_warning "Directory $dir exists and is not empty - manual review needed"
        else
            print_info "Removing empty directory $dir..."
            rmdir "$dir" 2>/dev/null || true
        fi
    fi
done

# Step 7: Update crontab references
echo ""
print_info "🔧 Checking crontab for old references..."

if crontab -l 2>/dev/null | grep -q "pterodactyl-bot"; then
    print_warning "Found pterodactyl-bot references in crontab!"
    print_info "Please manually update your crontab with: crontab -e"
    print_info "Replace all 'pterodactyl-bot' with 'TelegramME'"
fi

# Step 8: Create new systemd service for TelegramME
echo ""
print_info "🔧 Creating new TelegramME service..."

SERVICE_CONTENT="[Unit]
Description=TelegramME Control Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/TelegramME
ExecStart=/usr/bin/node /root/TelegramME/bot.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target"

echo "$SERVICE_CONTENT" > /etc/systemd/system/TelegramME.service
systemctl daemon-reload
systemctl enable TelegramME
print_status "New TelegramME service created"

# Step 9: Summary
echo ""
echo "🎉 ===== CLEANUP COMPLETED ====="
print_status "All pterodactyl-bot references cleaned!"
echo ""

print_info "📋 Summary of changes:"
echo "   • File references: ✅ Updated to TelegramME"
echo "   • Directory paths: ✅ Updated to /root/TelegramME"
echo "   • Service names: ✅ Updated to TelegramME"
echo "   • PM2 processes: ✅ Cleaned"
echo "   • Screen sessions: ✅ Cleaned"
echo "   • Systemd service: ✅ Created TelegramME.service"
echo ""

print_info "📁 Backup files created:"
for file in "${FILES_TO_CLEAN[@]}"; do
    if [ -f "$file.backup" ]; then
        echo "   • $file.backup"
    fi
done
echo ""

print_info "🚀 Next steps:"
echo "   1. Review cleaned files for any missed references"
echo "   2. Test TelegramME service: systemctl start TelegramME"
echo "   3. Remove backup files when satisfied: rm *.backup"
echo "   4. Update any custom scripts you may have"
echo ""

print_warning "⚠️  Manual review needed:"
echo "   • Check crontab: crontab -l"
echo "   • Check custom scripts in other directories"
echo "   • Verify /root/pterodactyl-bot directory (if exists)"
echo ""

echo "📅 Completed at: $(date '+%Y-%m-%d %H:%M:%S')"
echo "🧹 ===== PTERODACTYL-BOT REFERENCES CLEANED ====="
