#!/bin/bash

# TelegramME Bot Manager Script
# Author: Pablos (@ImTamaa)
# Usage: ./bot-manager.sh [start|stop|restart|status|logs]

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

# Function to check if bot is running
is_bot_running() {
    if pgrep -f "node.*bot.js" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to start bot
start_bot() {
    print_info "🚀 Memulai TelegramME..."
    
    if is_bot_running; then
        print_warning "Bot sudah berjalan!"
        return 1
    fi
    
    # Check if bot.js exists
    if [ ! -f "bot.js" ]; then
        print_error "bot.js tidak ditemukan!"
        return 1
    fi
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_error ".env tidak ditemukan!"
        return 1
    fi
    
    # Test syntax first
    node -c bot.js
    if [ $? -ne 0 ]; then
        print_error "Ada error syntax di bot.js!"
        return 1
    fi
    
    # Start bot based on available tools
    if command -v pm2 &> /dev/null; then
        print_info "Menggunakan PM2..."
        pm2 start bot.js --name "TelegramME" --watch --ignore-watch="node_modules .git *.log"
        pm2 save
        print_status "TelegramME berhasil dijalankan dengan PM2"

    elif command -v screen &> /dev/null; then
        print_info "Menggunakan screen..."
        screen -dmS TelegramME node bot.js
        print_status "TelegramME berhasil dijalankan dalam screen session 'TelegramME'"
        print_info "Gunakan 'screen -r TelegramME' untuk melihat log"

    else
        print_info "Menggunakan nohup..."
        nohup node bot.js > bot.log 2>&1 &
        print_status "TelegramME berhasil dijalankan dengan nohup"
        print_info "Log tersimpan di bot.log"
    fi
    
    # Verify bot started
    sleep 3
    if is_bot_running; then
        print_status "Bot berhasil berjalan!"
    else
        print_error "Bot gagal dijalankan!"
        return 1
    fi
}

# Function to stop bot
stop_bot() {
    print_info "🛑 Menghentikan TelegramME..."
    
    if ! is_bot_running; then
        print_warning "Bot tidak sedang berjalan!"
        return 1
    fi
    
    # Stop PM2 if available
    if command -v pm2 &> /dev/null; then
        pm2 stop TelegramME 2>/dev/null
        pm2 delete TelegramME 2>/dev/null
    fi

    # Kill screen session if exists
    screen -S TelegramME -X quit 2>/dev/null
    
    # Kill bot processes
    pkill -f "node.*bot.js" 2>/dev/null
    pkill -f "nodemon.*bot.js" 2>/dev/null
    
    # Wait and force kill if necessary
    sleep 2
    if is_bot_running; then
        print_warning "Force killing bot processes..."
        pkill -9 -f "node.*bot.js" 2>/dev/null
        pkill -9 -f "nodemon.*bot.js" 2>/dev/null
    fi
    
    sleep 1
    if ! is_bot_running; then
        print_status "Bot berhasil dihentikan"
    else
        print_error "Gagal menghentikan bot"
        return 1
    fi
}

# Function to restart bot
restart_bot() {
    print_info "🔄 Restart TelegramME..."
    stop_bot
    sleep 2
    start_bot
}

# Function to show bot status
show_status() {
    echo "📊 ===== STATUS TELEGRAMME ====="
    echo ""
    
    if is_bot_running; then
        print_status "Bot sedang BERJALAN"
        echo ""
        print_info "📋 Informasi Proses:"
        ps aux | grep "node.*bot.js" | grep -v grep
        
        # Show PM2 status if available
        if command -v pm2 &> /dev/null; then
            echo ""
            print_info "📊 Status PM2:"
            pm2 list | grep TelegramME
        fi

        # Show screen sessions
        if command -v screen &> /dev/null; then
            echo ""
            print_info "📺 Screen Sessions:"
            screen -ls | grep TelegramME || echo "   Tidak ada screen session"
        fi
        
    else
        print_error "Bot TIDAK BERJALAN"
    fi
    
    echo ""
    print_info "📁 File Status:"
    [ -f "bot.js" ] && echo "   • bot.js: ✅" || echo "   • bot.js: ❌"
    [ -f ".env" ] && echo "   • .env: ✅" || echo "   • .env: ❌"
    [ -f "package.json" ] && echo "   • package.json: ✅" || echo "   • package.json: ❌"
    [ -f "bot.log" ] && echo "   • bot.log: ✅" || echo "   • bot.log: ❌"
    
    echo ""
    print_info "🕒 Waktu: $(date '+%Y-%m-%d %H:%M:%S')"
}

# Function to show logs
show_logs() {
    print_info "📋 Menampilkan log TelegramME..."
    echo ""

    if command -v pm2 &> /dev/null && pm2 list | grep -q TelegramME; then
        print_info "📊 PM2 Logs:"
        pm2 logs TelegramME --lines 50

    elif [ -f "bot.log" ]; then
        print_info "📄 File Logs (bot.log):"
        tail -50 bot.log

    elif command -v screen &> /dev/null && screen -ls | grep -q TelegramME; then
        print_info "📺 Screen session tersedia: TelegramME"
        print_info "Gunakan 'screen -r TelegramME' untuk melihat log real-time"

    else
        print_warning "Tidak ada log yang tersedia"
    fi
}

# Main script logic
case "$1" in
    start)
        start_bot
        ;;
    stop)
        stop_bot
        ;;
    restart)
        restart_bot
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "🤖 ===== PTERODACTYL BOT MANAGER ====="
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Mulai bot"
        echo "  stop    - Hentikan bot"
        echo "  restart - Restart bot"
        echo "  status  - Lihat status bot"
        echo "  logs    - Lihat log bot"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 status"
        echo "  $0 logs"
        exit 1
        ;;
esac
