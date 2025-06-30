#!/bin/bash

# Clean All Bot Processes Script
# Author: Pablos (@ImTamaa)
# Usage: ./clean-all-bots.sh

echo "🧹 ===== CLEANING ALL BOT PROCESSES ====="
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

# Step 1: Show all current bot processes
echo ""
print_info "📊 Current bot processes from ALL directories:"
ps aux | grep -E "(node.*bot\.js|pterodactyl|TelegramME)" | grep -v grep

# Step 2: Stop ALL PM2 processes
echo ""
print_info "🛑 Stopping ALL PM2 processes..."

if command -v pm2 &> /dev/null; then
    print_info "PM2 processes before cleanup:"
    pm2 list
    
    pm2 stop all 2>/dev/null
    pm2 delete all 2>/dev/null
    pm2 kill 2>/dev/null
    
    print_status "All PM2 processes stopped and deleted"
else
    print_warning "PM2 not found"
fi

# Step 3: Kill ALL screen sessions
echo ""
print_info "🔪 Killing ALL screen sessions..."

# Kill specific bot screen sessions
screen -S pterodactyl-bot -X quit 2>/dev/null
screen -S TelegramME -X quit 2>/dev/null

# Show remaining screens
SCREENS=$(screen -ls 2>/dev/null | grep -c "Socket")
if [ "$SCREENS" -gt 0 ]; then
    print_info "Remaining screen sessions:"
    screen -ls
else
    print_status "No screen sessions found"
fi

# Step 4: Kill ALL bot processes from ANY directory
echo ""
print_info "💀 Killing ALL bot processes..."

# Kill by process name patterns
pkill -f "node.*bot\.js" 2>/dev/null
pkill -f "nodemon.*bot\.js" 2>/dev/null
pkill -f "pterodactyl" 2>/dev/null

# Wait for processes to stop
sleep 3

# Force kill if still running
REMAINING=$(pgrep -f "node.*bot\.js" | wc -l)
if [ "$REMAINING" -gt 0 ]; then
    print_warning "Force killing $REMAINING remaining processes..."
    pkill -9 -f "node.*bot\.js" 2>/dev/null
    pkill -9 -f "nodemon.*bot\.js" 2>/dev/null
    pkill -9 -f "pterodactyl" 2>/dev/null
    sleep 2
fi

print_status "All bot processes killed"

# Step 5: Verify cleanup
echo ""
print_info "🔍 Verifying cleanup..."

BOT_COUNT=$(pgrep -f "node.*bot\.js" | wc -l)
if [ "$BOT_COUNT" -eq 0 ]; then
    print_status "Perfect! No bot processes running"
else
    print_warning "Still found $BOT_COUNT bot processes:"
    ps aux | grep "node.*bot\.js" | grep -v grep
fi

# Step 6: Start ONLY TelegramME from current directory
echo ""
print_info "🚀 Starting TelegramME from current directory..."

if [ ! -f "bot.js" ]; then
    print_error "bot.js not found in current directory!"
    print_info "Current directory: $(pwd)"
    print_info "Please run this script from TelegramME directory"
    exit 1
fi

if [ ! -f ".env" ]; then
    print_error ".env not found in current directory!"
    exit 1
fi

# Test syntax
print_info "Testing bot syntax..."
node -c bot.js
if [ $? -ne 0 ]; then
    print_error "Syntax error in bot.js!"
    exit 1
fi

# Start with PM2 if available
if command -v pm2 &> /dev/null; then
    print_info "Starting TelegramME with PM2..."
    pm2 start bot.js --name "TelegramME" --watch --ignore-watch="node_modules .git *.log"
    pm2 save
    
    print_status "TelegramME started with PM2"
    
    echo ""
    print_info "📊 PM2 Status:"
    pm2 list
    
else
    print_info "Starting TelegramME with nohup..."
    nohup node bot.js > bot.log 2>&1 &
    print_status "TelegramME started with nohup"
fi

# Step 7: Final verification
echo ""
print_info "🔍 Final verification..."

sleep 5

FINAL_COUNT=$(pgrep -f "node.*bot\.js" | wc -l)
if [ "$FINAL_COUNT" -eq 1 ]; then
    print_status "SUCCESS! Only TelegramME is running"
    
    echo ""
    print_info "📊 Process info:"
    ps aux | grep "node.*bot\.js" | grep -v grep
    
    echo ""
    print_info "📁 Running from directory:"
    BOT_PID=$(pgrep -f "node.*bot\.js")
    BOT_DIR=$(pwdx $BOT_PID 2>/dev/null | cut -d: -f2 | xargs)
    echo "   Directory: $BOT_DIR"
    
elif [ "$FINAL_COUNT" -eq 0 ]; then
    print_error "No bot process running! Check logs for errors."
    if [ -f "bot.log" ]; then
        echo ""
        print_info "Recent logs:"
        tail -10 bot.log
    fi
    exit 1
    
else
    print_warning "Multiple processes detected ($FINAL_COUNT processes)"
    ps aux | grep "node.*bot\.js" | grep -v grep
fi

# Step 8: Summary
echo ""
echo "🎉 ===== CLEANUP COMPLETED ====="
print_status "TelegramME is now the ONLY bot running!"
echo ""
print_info "📋 Summary:"
echo "   • Old bot processes: ❌ Killed"
echo "   • PM2 processes: ❌ Cleaned"
echo "   • Screen sessions: ❌ Closed"
echo "   • TelegramME running: ✅"
echo "   • Process count: $FINAL_COUNT"
echo ""
print_info "💡 Next steps:"
echo "   • Test bot with /start command"
echo "   • Use 'pm2 logs TelegramME' to view logs"
echo "   • Use './update.sh' for future updates"
echo ""
echo "📅 Completed at: $(date '+%Y-%m-%d %H:%M:%S')"
echo "🧹 ===== ALL BOTS CLEANED ====="
