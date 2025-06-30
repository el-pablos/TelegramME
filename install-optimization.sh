#!/bin/bash

# Install Pterodactyl Panel Optimization Scripts
# Author: Pablos (@ImTamaa)

set -e

echo "🚀 Install Pterodactyl Panel Optimization"
echo "========================================"
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
   print_error "Script ini harus dijalankan sebagai root"
   print_info "Jalankan: sudo su - kemudian ./install-optimization.sh"
   exit 1
fi

print_info "Installing optimization scripts..."
echo ""

# Create optimization directory
mkdir -p /root/panel-optimization
cd /root/panel-optimization

# Download optimization scripts
print_info "Downloading optimization scripts..."

# Download from GitHub
wget -q https://raw.githubusercontent.com/el-pablos/ptero-panel-control/main/optimize-panel.sh -O optimize-panel.sh
wget -q https://raw.githubusercontent.com/el-pablos/ptero-panel-control/main/monitor-panel.sh -O monitor-panel.sh

# Make scripts executable
chmod +x optimize-panel.sh
chmod +x monitor-panel.sh

print_success "Scripts downloaded and made executable"

# Create quick access commands
print_info "Creating quick access commands..."

# Create symlinks for easy access
ln -sf /root/panel-optimization/optimize-panel.sh /usr/local/bin/optimize-panel
ln -sf /root/panel-optimization/monitor-panel.sh /usr/local/bin/monitor-panel

print_success "Quick access commands created"

# Install required packages
print_info "Installing required packages..."

apt update -qq
apt install -y htop iotop nethogs sysstat

print_success "Required packages installed"

# Create cron job for automatic optimization
print_info "Setting up automatic optimization..."

# Add cron job to run optimization weekly
(crontab -l 2>/dev/null; echo "0 2 * * 0 /root/panel-optimization/optimize-panel.sh > /var/log/panel-optimization.log 2>&1") | crontab -

print_success "Weekly automatic optimization scheduled"

echo ""
print_success "🎉 Installation completed!"
echo ""

print_info "📋 Available Commands:"
echo "  optimize-panel    - Run full panel optimization"
echo "  monitor-panel     - Real-time panel monitoring"
echo ""

print_info "📁 Script Locations:"
echo "  /root/panel-optimization/optimize-panel.sh"
echo "  /root/panel-optimization/monitor-panel.sh"
echo ""

print_info "⏰ Automatic Optimization:"
echo "  Scheduled: Every Sunday at 2:00 AM"
echo "  Log: /var/log/panel-optimization.log"
echo ""

print_info "🚀 Quick Start:"
echo "1. Run optimization: optimize-panel"
echo "2. Monitor panel: monitor-panel"
echo "3. Check logs: tail -f /var/log/panel-optimization.log"
echo ""

print_success "🤖 Panel optimization tools ready!"
