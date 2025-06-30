#!/bin/bash

# Pterodactyl Bot Setup Script
# Author: Pablos (@ImTamaa)
# Usage: ./setup-bot.sh

echo "🚀 ===== PTERODACTYL BOT SETUP SCRIPT ====="
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

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Script berjalan sebagai root. Ini direkomendasikan untuk instalasi sistem."
fi

# Step 1: Update system
print_info "📦 Updating system packages..."
apt update -y
print_status "System packages updated"

# Step 2: Install Node.js if not exists
if ! command -v node &> /dev/null; then
    print_info "📥 Installing Node.js..."
    
    # Install NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    if command -v node &> /dev/null; then
        print_status "Node.js installed successfully"
        print_info "Node.js version: $(node --version)"
        print_info "NPM version: $(npm --version)"
    else
        print_error "Failed to install Node.js"
        exit 1
    fi
else
    print_status "Node.js already installed"
    print_info "Node.js version: $(node --version)"
    print_info "NPM version: $(npm --version)"
fi

# Step 3: Install Git if not exists
if ! command -v git &> /dev/null; then
    print_info "📥 Installing Git..."
    apt-get install -y git
    
    if command -v git &> /dev/null; then
        print_status "Git installed successfully"
    else
        print_error "Failed to install Git"
        exit 1
    fi
else
    print_status "Git already installed"
fi

# Step 4: Install PM2 globally (optional but recommended)
if ! command -v pm2 &> /dev/null; then
    print_info "📥 Installing PM2 (Process Manager)..."
    npm install -g pm2
    
    if command -v pm2 &> /dev/null; then
        print_status "PM2 installed successfully"
        
        # Setup PM2 startup
        print_info "Setting up PM2 startup..."
        pm2 startup
        print_info "Run the command above to enable PM2 auto-start on boot"
    else
        print_warning "PM2 installation failed, but bot can still work with other methods"
    fi
else
    print_status "PM2 already installed"
fi

# Step 5: Install screen (alternative process manager)
if ! command -v screen &> /dev/null; then
    print_info "📥 Installing screen..."
    apt-get install -y screen
    
    if command -v screen &> /dev/null; then
        print_status "Screen installed successfully"
    else
        print_warning "Screen installation failed"
    fi
else
    print_status "Screen already installed"
fi

# Step 6: Install bot dependencies
if [ -f "package.json" ]; then
    print_info "📦 Installing bot dependencies..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_status "Bot dependencies installed successfully"
    else
        print_error "Failed to install bot dependencies"
        exit 1
    fi
else
    print_warning "package.json not found, skipping dependency installation"
fi

# Step 7: Setup .env file if not exists
if [ ! -f ".env" ]; then
    print_info "🔧 Creating .env configuration file..."
    
    cat > .env << 'EOF'
# Telegram Bot Configuration
BOT_TOKEN=your_bot_token_here
OWNER_TELEGRAM_ID=5476148500

# Pterodactyl Panel Configuration
PTERODACTYL_PANEL_URL=https://your-panel.domain.com
PTERODACTYL_APPLICATION_API_KEY=your_application_api_key_here
PTERODACTYL_CLIENT_API_KEY=your_client_api_key_here

# Optional: Database Configuration (if needed)
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=pterodactyl
# DB_USER=pterodactyl
# DB_PASS=your_password_here
EOF
    
    print_status ".env file created"
    print_warning "PENTING: Edit file .env dengan konfigurasi yang benar!"
    print_info "Gunakan: nano .env"
    
else
    print_status ".env file already exists"
fi

# Step 8: Make scripts executable
print_info "🔧 Making scripts executable..."
chmod +x update.sh 2>/dev/null
chmod +x bot-manager.sh 2>/dev/null
chmod +x setup-bot.sh 2>/dev/null
print_status "Scripts made executable"

# Step 9: Test bot syntax if bot.js exists
if [ -f "bot.js" ]; then
    print_info "🧪 Testing bot syntax..."
    node -c bot.js
    
    if [ $? -eq 0 ]; then
        print_status "Bot syntax is valid"
    else
        print_error "Bot syntax has errors!"
        print_info "Please check bot.js file"
    fi
else
    print_warning "bot.js not found"
fi

# Step 10: Setup firewall (optional)
if command -v ufw &> /dev/null; then
    print_info "🔥 Checking firewall status..."
    ufw_status=$(ufw status | grep "Status:" | awk '{print $2}')
    
    if [ "$ufw_status" = "active" ]; then
        print_info "UFW firewall is active"
        print_info "Make sure required ports are open for your panel"
    else
        print_info "UFW firewall is inactive"
    fi
else
    print_info "UFW not installed, skipping firewall check"
fi

# Final summary
echo ""
echo "🎉 ===== SETUP SELESAI ====="
print_status "Pterodactyl Bot setup completed successfully!"
echo ""
print_info "📋 Yang telah diinstall:"
echo "   • Node.js: $(command -v node &> /dev/null && echo "✅" || echo "❌")"
echo "   • NPM: $(command -v npm &> /dev/null && echo "✅" || echo "❌")"
echo "   • Git: $(command -v git &> /dev/null && echo "✅" || echo "❌")"
echo "   • PM2: $(command -v pm2 &> /dev/null && echo "✅" || echo "❌")"
echo "   • Screen: $(command -v screen &> /dev/null && echo "✅" || echo "❌")"
echo ""
print_info "📁 File yang tersedia:"
echo "   • bot.js: $([ -f "bot.js" ] && echo "✅" || echo "❌")"
echo "   • .env: $([ -f ".env" ] && echo "✅" || echo "❌")"
echo "   • package.json: $([ -f "package.json" ] && echo "✅" || echo "❌")"
echo "   • update.sh: $([ -f "update.sh" ] && echo "✅" || echo "❌")"
echo "   • bot-manager.sh: $([ -f "bot-manager.sh" ] && echo "✅" || echo "❌")"
echo ""
print_info "🚀 Langkah selanjutnya:"
echo "   1. Edit file .env dengan konfigurasi yang benar"
echo "   2. Jalankan bot dengan: ./bot-manager.sh start"
echo "   3. Cek status dengan: ./bot-manager.sh status"
echo "   4. Update bot dengan: ./update.sh"
echo ""
print_info "💡 Tips:"
echo "   • Gunakan 'nano .env' untuk edit konfigurasi"
echo "   • Gunakan './bot-manager.sh' untuk mengelola bot"
echo "   • Gunakan './update.sh' untuk update dari GitHub"
echo ""
echo "📅 Setup completed at: $(date '+%Y-%m-%d %H:%M:%S')"
echo "🚀 ===== PTERODACTYL BOT SETUP SCRIPT ====="
