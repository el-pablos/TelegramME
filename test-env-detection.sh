#!/bin/bash

# Test .env Detection Logic
echo "🧪 Testing .env Detection Logic"
echo "==============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }

# Test function
check_existing_env() {
    if [ -f ".env" ]; then
        BOT_TOKEN=$(grep "^BOT_TOKEN=" .env 2>/dev/null | cut -d'=' -f2)
        OWNER_ID=$(grep "^OWNER_TELEGRAM_ID=" .env 2>/dev/null | cut -d'=' -f2)
        PANEL_URL=$(grep "^PTERODACTYL_PANEL_URL=" .env 2>/dev/null | cut -d'=' -f2)
        APP_KEY=$(grep "^PTERODACTYL_APPLICATION_API_KEY=" .env 2>/dev/null | cut -d'=' -f2)
        CLIENT_KEY=$(grep "^PTERODACTYL_CLIENT_API_KEY=" .env 2>/dev/null | cut -d'=' -f2)
        
        echo "📋 Found .env file with:"
        echo "   BOT_TOKEN: ${BOT_TOKEN:+${BOT_TOKEN:0:10}...}"
        echo "   OWNER_ID: $OWNER_ID"
        echo "   PANEL_URL: $PANEL_URL"
        echo "   APP_KEY: ${APP_KEY:+${APP_KEY:0:15}...}"
        echo "   CLIENT_KEY: ${CLIENT_KEY:+${CLIENT_KEY:0:15}...}"
        echo ""
        
        if [ -n "$BOT_TOKEN" ] && [ -n "$OWNER_ID" ] && [ -n "$PANEL_URL" ] && [ -n "$APP_KEY" ] && [ -n "$CLIENT_KEY" ]; then
            print_success "All required fields are configured!"
            return 0
        else
            echo "❌ Some required fields are missing"
            return 1
        fi
    else
        echo "❌ No .env file found"
        return 1
    fi
}

# Test 1: No .env file
echo "🧪 Test 1: No .env file"
if [ -f ".env" ]; then
    mv .env .env.backup
fi

if check_existing_env; then
    echo "❌ Test 1 FAILED: Should not find configuration"
else
    print_success "Test 1 PASSED: Correctly detected no .env"
fi
echo ""

# Test 2: Empty .env file
echo "🧪 Test 2: Empty .env file"
touch .env

if check_existing_env; then
    echo "❌ Test 2 FAILED: Should not find valid configuration"
else
    print_success "Test 2 PASSED: Correctly detected empty .env"
fi
echo ""

# Test 3: Partial .env file
echo "🧪 Test 3: Partial .env file"
cat > .env << EOF
BOT_TOKEN=test_token
OWNER_TELEGRAM_ID=123456
# Missing other fields
EOF

if check_existing_env; then
    echo "❌ Test 3 FAILED: Should not find complete configuration"
else
    print_success "Test 3 PASSED: Correctly detected incomplete .env"
fi
echo ""

# Test 4: Complete .env file
echo "🧪 Test 4: Complete .env file"
cat > .env << EOF
BOT_TOKEN=8037157858:AAEOqk1tY_j7kIFMRQ2f5wiOC7nLauPjah0
OWNER_TELEGRAM_ID=5476148500
PTERODACTYL_PANEL_URL=https://memek.tams.my.id
PTERODACTYL_APPLICATION_API_KEY=ptla_8UaCwgDdLFwe5L5pugIPlZvNqNGuTbHDVRg25zGX2hl
PTERODACTYL_CLIENT_API_KEY=ptlc_lvtvHGT2OVCehfx0COTTbxx3Oo3OOsuA4AflteWcqtI
EOF

if check_existing_env; then
    print_success "Test 4 PASSED: Correctly detected complete .env"
else
    echo "❌ Test 4 FAILED: Should find complete configuration"
fi
echo ""

# Cleanup
rm -f .env
if [ -f ".env.backup" ]; then
    mv .env.backup .env
fi

print_success "All .env detection tests completed!"
