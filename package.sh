#!/bin/bash

# Package script untuk Pterodactyl Telegram Bot
# Author: Pablos (@ImTamaa)

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }

echo "📦 Pterodactyl Telegram Bot - Package Creator"
echo "============================================="
echo ""

# Get version from user or use default
VERSION=$(date +%Y%m%d_%H%M%S)
read -p "Package version [$VERSION]: " INPUT_VERSION
VERSION=${INPUT_VERSION:-$VERSION}

PACKAGE_NAME="pterodactyl-telegram-bot-v$VERSION"
TEMP_DIR="/tmp/$PACKAGE_NAME"
ZIP_FILE="$PACKAGE_NAME.zip"

print_info "Creating package: $PACKAGE_NAME"

# Create temporary directory
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR

# Copy essential files
print_info "Copying project files..."

# Core files
cp -r src/ $TEMP_DIR/
cp -r logs/ $TEMP_DIR/ 2>/dev/null || mkdir -p $TEMP_DIR/logs

# Configuration files
cp .env.example $TEMP_DIR/
cp composer.json $TEMP_DIR/
cp index.php $TEMP_DIR/

# Scripts
cp install.sh $TEMP_DIR/
cp quick-setup.sh $TEMP_DIR/
cp update.sh $TEMP_DIR/
cp deploy.php $TEMP_DIR/
cp test.php $TEMP_DIR/

# Server configurations
cp nginx.conf $TEMP_DIR/
cp supervisor.conf $TEMP_DIR/
cp systemd.service $TEMP_DIR/
cp crontab.txt $TEMP_DIR/

# Documentation
cp README.md $TEMP_DIR/
cp DEPLOYMENT.md $TEMP_DIR/

# Make scripts executable
chmod +x $TEMP_DIR/*.sh

# Create installation info
cat > $TEMP_DIR/INSTALL.txt << EOF
🚀 Pterodactyl Telegram Bot - Installation Instructions
======================================================

📋 Quick Start (Ubuntu VPS):
1. Extract this zip file
2. cd pterodactyl-telegram-bot-v$VERSION/
3. chmod +x quick-setup.sh
4. ./quick-setup.sh
5. Follow the prompts

📖 Detailed Instructions:
- See README.md for complete documentation
- See DEPLOYMENT.md for deployment guide

🔧 Scripts Available:
- quick-setup.sh   : Quick 5-minute setup
- install.sh       : Advanced installation with options
- update.sh        : Update existing installation
- deploy.php       : Deployment utilities
- test.php         : Test all components

📞 Support:
- Telegram: @ImTamaa
- GitHub: [Repository URL]

Version: $VERSION
Created: $(date)
Author: Pablos (@ImTamaa)
EOF

# Create version info
cat > $TEMP_DIR/VERSION << EOF
$VERSION
EOF

# Create .gitignore for the package
cat > $TEMP_DIR/.gitignore << EOF
# Environment files
.env
.env.local

# Logs
logs/*.log
logs/*.db

# Vendor (will be installed by composer)
vendor/

# Temporary files
*.tmp
*.temp

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
EOF

# Clean up any existing vendor directory (will be installed fresh)
rm -rf $TEMP_DIR/vendor/

# Create the zip file
print_info "Creating zip package..."
cd /tmp
zip -r "$ZIP_FILE" "$PACKAGE_NAME/" -q

# Move to current directory
mv "/tmp/$ZIP_FILE" "$(pwd)/$ZIP_FILE"

# Cleanup
rm -rf $TEMP_DIR

# Show package info
print_success "Package created successfully!"
echo ""
print_info "Package Details:"
echo "  File: $ZIP_FILE"
echo "  Size: $(du -h "$ZIP_FILE" | cut -f1)"
echo "  Version: $VERSION"
echo ""

print_info "Package Contents:"
unzip -l "$ZIP_FILE" | head -20
echo "  ... (and more)"
echo ""

print_info "Installation Commands:"
echo "  wget https://your-server.com/$ZIP_FILE"
echo "  unzip $ZIP_FILE"
echo "  cd $PACKAGE_NAME/"
echo "  ./quick-setup.sh"
echo ""

print_success "📦 Package ready for deployment!"
print_warning "Don't forget to upload to your server or repository!"
