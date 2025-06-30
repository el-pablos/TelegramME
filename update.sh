#!/bin/bash

# Pterodactyl Bot Update Script
# Author: Pablos (@ImTamaa)
# Usage: ./update.sh

echo "🚀 ===== PTERODACTYL BOT UPDATE SCRIPT ====="
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

# Check if we're in the right directory
if [ ! -f "bot.js" ]; then
    print_error "bot.js tidak ditemukan! Pastikan Anda berada di direktori yang benar."
    exit 1
fi

print_info "Direktori bot ditemukan ✓"

# Step 1: Stop existing bot processes
echo ""
print_info "🛑 Menghentikan semua bot yang sedang berjalan..."

# Stop PM2 processes
if command -v pm2 &> /dev/null; then
    print_info "Menghentikan PM2 processes..."
    pm2 stop all 2>/dev/null
    pm2 delete all 2>/dev/null
fi

# Kill bot processes by name
pkill -f "node.*bot.js" 2>/dev/null
pkill -f "nodemon.*bot.js" 2>/dev/null

# Wait a moment for processes to stop
sleep 2

# Check if any bot process is still running
if pgrep -f "node.*bot.js" > /dev/null || pgrep -f "nodemon.*bot.js" > /dev/null; then
    print_warning "Masih ada proses bot yang berjalan, mencoba force kill..."
    pkill -9 -f "node.*bot.js" 2>/dev/null
    pkill -9 -f "nodemon.*bot.js" 2>/dev/null
    sleep 1
fi

print_status "Semua bot berhasil dihentikan"

# Step 2: Backup current version (optional)
echo ""
print_info "💾 Membuat backup versi saat ini..."
if [ -f "bot.js" ]; then
    cp bot.js "bot.js.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null
    print_status "Backup dibuat"
else
    print_warning "Tidak ada file untuk di-backup"
fi

# Step 3: Pull latest changes from GitHub
echo ""
print_info "📥 Mengambil update terbaru dari GitHub..."

# Check git status first
git status --porcelain > /dev/null 2>&1
if [ $? -ne 0 ]; then
    print_error "Bukan repository git atau ada masalah dengan git"
    exit 1
fi

# Stash any local changes
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Ada perubahan lokal, menyimpan ke stash..."
    git stash push -m "Auto stash before update $(date)"
fi

# Pull latest changes
print_info "Melakukan git pull..."
git pull origin main

if [ $? -eq 0 ]; then
    print_status "Update berhasil diunduh dari GitHub"
else
    print_error "Gagal melakukan git pull"
    exit 1
fi

# Step 4: Install/Update dependencies if package.json changed
echo ""
print_info "📦 Memeriksa dependencies..."

if [ -f "package.json" ]; then
    # Check if package.json was modified in the last pull
    if git diff HEAD~1 HEAD --name-only | grep -q "package.json"; then
        print_info "package.json berubah, mengupdate dependencies..."
        npm install
        if [ $? -eq 0 ]; then
            print_status "Dependencies berhasil diupdate"
        else
            print_warning "Ada masalah saat update dependencies, melanjutkan..."
        fi
    else
        print_info "Tidak ada perubahan dependencies"
    fi
else
    print_warning "package.json tidak ditemukan"
fi

# Step 5: Check .env file
echo ""
print_info "🔧 Memeriksa konfigurasi..."

if [ ! -f ".env" ]; then
    print_error ".env file tidak ditemukan!"
    print_info "Silakan buat file .env dengan konfigurasi yang diperlukan"
    exit 1
fi

print_status "File .env ditemukan"

# Step 6: Test bot syntax
echo ""
print_info "🧪 Testing syntax bot..."

node -c bot.js
if [ $? -eq 0 ]; then
    print_status "Syntax bot valid"
else
    print_error "Ada error syntax di bot.js!"
    exit 1
fi

# Step 7: Start bot
echo ""
print_info "🚀 Memulai bot..."

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    print_info "Menggunakan PM2 untuk menjalankan TelegramME..."

    # Start with PM2 - only TelegramME
    pm2 start bot.js --name "TelegramME" --watch --ignore-watch="node_modules .git *.log"
    pm2 save

    print_status "TelegramME berhasil dijalankan dengan PM2"

    # Show PM2 status
    echo ""
    print_info "📊 Status PM2:"
    pm2 list
    
elif command -v screen &> /dev/null; then
    print_info "Menggunakan screen untuk menjalankan TelegramME..."

    # Kill existing screen session
    screen -S TelegramME -X quit 2>/dev/null

    # Start in screen
    screen -dmS TelegramME node bot.js

    print_status "TelegramME berhasil dijalankan dalam screen session 'TelegramME'"
    print_info "Gunakan 'screen -r TelegramME' untuk melihat log"
    
else
    print_info "Menjalankan TelegramME dengan nohup..."

    # Start with nohup
    nohup node bot.js > bot.log 2>&1 &

    print_status "TelegramME berhasil dijalankan dengan nohup"
    print_info "Log tersimpan di bot.log"
fi

# Step 8: Verify bot is running
echo ""
print_info "🔍 Memverifikasi bot berjalan..."

sleep 3

if pgrep -f "node.*bot.js" > /dev/null; then
    print_status "TelegramME berhasil berjalan!"

    # Show process info
    echo ""
    print_info "📊 Informasi Proses TelegramME:"
    ps aux | grep "node.*bot.js" | grep -v grep

else
    print_error "TelegramME tidak berjalan! Periksa log untuk error."
    
    # Show recent logs if available
    if [ -f "bot.log" ]; then
        echo ""
        print_info "📋 Log terakhir:"
        tail -10 bot.log
    fi
    
    exit 1
fi

# Step 9: Show summary
echo ""
echo "🎉 ===== UPDATE SELESAI ====="
print_status "TelegramME berhasil diupdate dan dijalankan!"
echo ""
print_info "📋 Ringkasan:"
echo "   • Update dari GitHub: ✅"
echo "   • Dependencies: ✅"
echo "   • Syntax check: ✅"
echo "   • TelegramME running: ✅"
echo ""
print_info "💡 Tips:"
echo "   • Gunakan 'ps aux | grep bot' untuk cek status"
echo "   • Log bot tersimpan di bot.log (jika menggunakan nohup)"
echo "   • Gunakan 'pm2 logs TelegramME' untuk melihat log (jika menggunakan PM2)"
echo "   • Gunakan 'screen -r TelegramME' untuk melihat log (jika menggunakan screen)"
echo ""
echo "📅 Selesai pada: $(date '+%Y-%m-%d %H:%M:%S')"
echo "🚀 ===== TELEGRAMME UPDATE SCRIPT ====="
