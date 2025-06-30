#!/bin/bash

# Pterodactyl Panel Real-time Monitor
# Author: Pablos (@ImTamaa)

echo "📊 Pterodactyl Panel Real-time Monitor"
echo "====================================="
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

while true; do
    clear
    echo "📊 Pterodactyl Panel Monitor - $(date)"
    echo "======================================="
    echo ""
    
    # System Resources
    print_info "💻 System Resources:"
    echo "  CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo "  Memory: $(free | awk 'FNR==2{printf "%.1f%% (%.1fG/%.1fG)\n", $3*100/$2, $3/1024/1024, $2/1024/1024}')"
    echo "  Disk: $(df -h / | awk 'NR==2{printf "%s (%s used)\n", $5, $3}')"
    echo "  Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    echo ""
    
    # Services Status
    print_info "🔧 Services Status:"
    PHP_VERSION=$(php -v | head -n1 | cut -d" " -f2 | cut -f1-2 -d".")
    
    if systemctl is-active --quiet php$PHP_VERSION-fpm; then
        print_success "PHP-FPM: Running"
    else
        print_error "PHP-FPM: Stopped"
    fi
    
    if systemctl is-active --quiet nginx; then
        print_success "Nginx: Running"
    else
        print_error "Nginx: Stopped"
    fi
    
    if systemctl is-active --quiet mysql || systemctl is-active --quiet mariadb; then
        print_success "Database: Running"
    else
        print_error "Database: Stopped"
    fi
    
    if systemctl is-active --quiet redis-server; then
        print_success "Redis: Running"
    else
        print_warning "Redis: Stopped"
    fi
    echo ""
    
    # Database Connections
    print_info "🗄️ Database Info:"
    DB_CONNECTIONS=$(mysql -e "SHOW STATUS LIKE 'Threads_connected';" 2>/dev/null | awk 'NR==2{print $2}' || echo "N/A")
    DB_QUERIES=$(mysql -e "SHOW STATUS LIKE 'Queries';" 2>/dev/null | awk 'NR==2{print $2}' || echo "N/A")
    echo "  Active Connections: $DB_CONNECTIONS"
    echo "  Total Queries: $DB_QUERIES"
    echo ""
    
    # PHP-FPM Status
    print_info "🐘 PHP-FPM Status:"
    FPM_ACTIVE=$(ps aux | grep php-fpm | grep -v grep | wc -l)
    FPM_MEMORY=$(ps aux | grep php-fpm | grep -v grep | awk '{sum+=$6} END {printf "%.1fMB\n", sum/1024}')
    echo "  Active Processes: $FPM_ACTIVE"
    echo "  Memory Usage: $FPM_MEMORY"
    echo ""
    
    # Nginx Status
    print_info "🌐 Nginx Status:"
    NGINX_CONNECTIONS=$(ss -tuln | grep :80 | wc -l)
    NGINX_MEMORY=$(ps aux | grep nginx | grep -v grep | awk '{sum+=$6} END {printf "%.1fMB\n", sum/1024}')
    echo "  Active Connections: $NGINX_CONNECTIONS"
    echo "  Memory Usage: $NGINX_MEMORY"
    echo ""
    
    # Top Processes
    print_info "🔝 Top CPU Processes:"
    ps aux --sort=-%cpu | head -6 | tail -5 | awk '{printf "  %-15s %5s%% %8s %s\n", $1, $3, $6/1024"MB", $11}'
    echo ""
    
    # Panel Specific
    print_info "🦅 Panel Status:"
    if [ -d "/var/www/pterodactyl" ]; then
        PANEL_SIZE=$(du -sh /var/www/pterodactyl 2>/dev/null | cut -f1)
        echo "  Panel Size: $PANEL_SIZE"
        
        # Check for common issues
        if [ -f "/var/www/pterodactyl/storage/logs/laravel.log" ]; then
            ERROR_COUNT=$(tail -100 /var/www/pterodactyl/storage/logs/laravel.log | grep -i error | wc -l)
            if [ $ERROR_COUNT -gt 0 ]; then
                print_warning "Recent Errors: $ERROR_COUNT (check logs)"
            else
                print_success "No Recent Errors"
            fi
        fi
    fi
    echo ""
    
    print_info "Press Ctrl+C to exit, refreshing in 5 seconds..."
    sleep 5
done
