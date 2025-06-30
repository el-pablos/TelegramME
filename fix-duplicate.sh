#!/bin/bash

# Fix Duplicate Bot Script
# Author: Pablos (@ImTamaa)
# Usage: ./fix-duplicate.sh

echo "🔧 ===== FIXING DUPLICATE BOT PROCESSES ====="
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

# Step 1: Show current processes
echo ""
print_info "📊 Current bot processes:"
ps aux | grep "node.*bot.js" | grep -v grep

# Step 2: Stop all PM2 processes
echo ""
print_info "🛑 Stopping all PM2 processes..."

if command -v pm2 &> /dev/null; then
    pm2 stop all 2>/dev/null
    pm2 delete all 2>/dev/null
    print_status "All PM2 processes stopped"
else
    print_warning "PM2 not found"
fi

# Step 3: Kill all bot processes
echo ""
print_info "🔪 Killing all bot processes..."

pkill -f "node.*bot.js" 2>/dev/null
pkill -f "nodemon.*bot.js" 2>/dev/null

# Wait for processes to stop
sleep 3

# Force kill if still running
if pgrep -f "node.*bot.js" > /dev/null; then
    print_warning "Force killing remaining processes..."
    pkill -9 -f "node.*bot.js" 2>/dev/null
    sleep 2
fi

print_status "All bot processes killed"

# Step 4: Start only TelegramME
echo ""
print_info "🚀 Starting TelegramME only..."

if [ ! -f "bot.js" ]; then
    print_error "bot.js not found! Make sure you're in the correct directory."
    exit 1
fi

# Start with PM2 if available
if command -v pm2 &> /dev/null; then
    print_info "Using PM2 to start TelegramME..."
    pm2 start bot.js --name "TelegramME" --watch --ignore-watch="node_modules .git *.log"
    pm2 save
    
    print_status "TelegramME started with PM2"
    
    echo ""
    print_info "📊 PM2 Status:"
    pm2 list
    
else
    print_info "Using nohup to start TelegramME..."
    nohup node bot.js > bot.log 2>&1 &
    print_status "TelegramME started with nohup"
fi

# Step 5: Verify only one process is running
echo ""
print_info "🔍 Verifying TelegramME is running..."

sleep 3

BOT_COUNT=$(pgrep -f "node.*bot.js" | wc -l)

if [ "$BOT_COUNT" -eq 1 ]; then
    print_status "Perfect! Only TelegramME is running"
    
    echo ""
    print_info "📊 Process info:"
    ps aux | grep "node.*bot.js" | grep -v grep
    
elif [ "$BOT_COUNT" -gt 1 ]; then
    print_warning "Multiple bot processes detected ($BOT_COUNT processes)"
    print_info "Processes:"
    ps aux | grep "node.*bot.js" | grep -v grep
    
else
    print_error "No bot process running!"
    exit 1
fi

# Step 6: Summary
echo ""
echo "🎉 ===== FIX COMPLETED ====="
print_status "TelegramME is now running as single process!"
echo ""
print_info "📋 Summary:"
echo "   • Duplicate processes: ❌ Removed"
echo "   • TelegramME running: ✅"
echo "   • Process count: $BOT_COUNT"
echo ""
print_info "💡 Tips:"
echo "   • Use 'pm2 logs TelegramME' to view logs"
echo "   • Use 'pm2 monit' for monitoring"
echo "   • Use './update.sh' for future updates"
echo ""
echo "📅 Completed at: $(date '+%Y-%m-%d %H:%M:%S')"
echo "🔧 ===== DUPLICATE FIX SCRIPT ====="
