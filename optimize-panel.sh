#!/bin/bash

# Pterodactyl Panel Optimization Script
# For High Usage Panels with Many Servers
# Author: Pablos (@ImTamaa)

set -e

echo "🚀 Pterodactyl Panel Optimization Script"
echo "======================================="
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
   print_info "Jalankan: sudo su - kemudian ./optimize-panel.sh"
   exit 1
fi

print_info "Berjalan sebagai root - perfect!"
echo ""

# Detect panel directory
PANEL_DIR=""
if [ -d "/var/www/pterodactyl" ]; then
    PANEL_DIR="/var/www/pterodactyl"
elif [ -d "/var/www/html/pterodactyl" ]; then
    PANEL_DIR="/var/www/html/pterodactyl"
elif [ -d "/var/www/panel" ]; then
    PANEL_DIR="/var/www/panel"
else
    print_error "Panel Pterodactyl tidak ditemukan!"
    print_info "Pastikan panel terinstall di /var/www/pterodactyl"
    exit 1
fi

print_success "Panel ditemukan di: $PANEL_DIR"
echo ""

# System Information
print_info "Informasi Sistem:"
echo "  CPU Cores: $(nproc)"
echo "  Total RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "  Available RAM: $(free -h | awk '/^Mem:/ {print $7}')"
echo "  Disk Usage: $(df -h / | awk 'NR==2 {print $5}')"
echo ""

# 1. PHP Optimization
print_info "1. Optimasi PHP..."

# Backup original php.ini
cp /etc/php/*/fpm/php.ini /etc/php/*/fpm/php.ini.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Find PHP version
PHP_VERSION=$(php -v | head -n1 | cut -d" " -f2 | cut -f1-2 -d".")
PHP_INI="/etc/php/$PHP_VERSION/fpm/php.ini"

if [ -f "$PHP_INI" ]; then
    print_info "Mengoptimasi PHP $PHP_VERSION..."
    
    # PHP Memory and Performance Settings
    sed -i 's/memory_limit = .*/memory_limit = 2048M/' $PHP_INI
    sed -i 's/max_execution_time = .*/max_execution_time = 300/' $PHP_INI
    sed -i 's/max_input_time = .*/max_input_time = 300/' $PHP_INI
    sed -i 's/post_max_size = .*/post_max_size = 100M/' $PHP_INI
    sed -i 's/upload_max_filesize = .*/upload_max_filesize = 100M/' $PHP_INI
    sed -i 's/max_file_uploads = .*/max_file_uploads = 50/' $PHP_INI
    
    # Enable OPcache for better performance
    sed -i 's/;opcache.enable=.*/opcache.enable=1/' $PHP_INI
    sed -i 's/;opcache.memory_consumption=.*/opcache.memory_consumption=512/' $PHP_INI
    sed -i 's/;opcache.max_accelerated_files=.*/opcache.max_accelerated_files=10000/' $PHP_INI
    sed -i 's/;opcache.revalidate_freq=.*/opcache.revalidate_freq=2/' $PHP_INI
    
    print_success "PHP dioptimasi"
else
    print_warning "File php.ini tidak ditemukan"
fi

# 2. PHP-FPM Pool Optimization
print_info "2. Optimasi PHP-FPM Pool..."

PHP_FPM_POOL="/etc/php/$PHP_VERSION/fpm/pool.d/www.conf"
if [ -f "$PHP_FPM_POOL" ]; then
    cp $PHP_FPM_POOL $PHP_FPM_POOL.backup.$(date +%Y%m%d_%H%M%S)
    
    # High performance PHP-FPM settings
    sed -i 's/pm = .*/pm = dynamic/' $PHP_FPM_POOL
    sed -i 's/pm.max_children = .*/pm.max_children = 50/' $PHP_FPM_POOL
    sed -i 's/pm.start_servers = .*/pm.start_servers = 10/' $PHP_FPM_POOL
    sed -i 's/pm.min_spare_servers = .*/pm.min_spare_servers = 5/' $PHP_FPM_POOL
    sed -i 's/pm.max_spare_servers = .*/pm.max_spare_servers = 15/' $PHP_FPM_POOL
    sed -i 's/pm.max_requests = .*/pm.max_requests = 1000/' $PHP_FPM_POOL
    
    print_success "PHP-FPM Pool dioptimasi"
else
    print_warning "File PHP-FPM pool tidak ditemukan"
fi

# 3. MySQL/MariaDB Optimization
print_info "3. Optimasi Database..."

MYSQL_CNF="/etc/mysql/mariadb.conf.d/50-server.cnf"
if [ ! -f "$MYSQL_CNF" ]; then
    MYSQL_CNF="/etc/mysql/mysql.conf.d/mysqld.cnf"
fi

if [ -f "$MYSQL_CNF" ]; then
    cp $MYSQL_CNF $MYSQL_CNF.backup.$(date +%Y%m%d_%H%M%S)
    
    # Add optimized MySQL settings
    cat >> $MYSQL_CNF << 'EOF'

# Pterodactyl Panel Optimization
innodb_buffer_pool_size = 8G
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
query_cache_type = 1
query_cache_size = 256M
query_cache_limit = 2M
tmp_table_size = 256M
max_heap_table_size = 256M
max_connections = 500
thread_cache_size = 50
table_open_cache = 4000
EOF

    print_success "Database dioptimasi"
else
    print_warning "File konfigurasi MySQL tidak ditemukan"
fi

# 4. Redis Optimization
print_info "4. Optimasi Redis..."

REDIS_CNF="/etc/redis/redis.conf"
if [ -f "$REDIS_CNF" ]; then
    cp $REDIS_CNF $REDIS_CNF.backup.$(date +%Y%m%d_%H%M%S)
    
    # Redis optimization
    sed -i 's/# maxmemory <bytes>/maxmemory 2gb/' $REDIS_CNF
    sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' $REDIS_CNF
    sed -i 's/save 900 1/# save 900 1/' $REDIS_CNF
    sed -i 's/save 300 10/# save 300 10/' $REDIS_CNF
    sed -i 's/save 60 10000/# save 60 10000/' $REDIS_CNF
    
    print_success "Redis dioptimasi"
else
    print_warning "Redis tidak terinstall atau tidak ditemukan"
fi

# 5. Nginx Optimization
print_info "5. Optimasi Nginx..."

NGINX_CNF="/etc/nginx/nginx.conf"
if [ -f "$NGINX_CNF" ]; then
    cp $NGINX_CNF $NGINX_CNF.backup.$(date +%Y%m%d_%H%M%S)
    
    # Create optimized nginx config
    cat > $NGINX_CNF << 'EOF'
user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;
pid /run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    types_hash_max_size 2048;
    server_tokens off;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # File caching
    open_file_cache max=10000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

    print_success "Nginx dioptimasi"
else
    print_warning "Nginx tidak terinstall"
fi

# 6. Panel Cache Optimization
print_info "6. Optimasi Cache Panel..."

cd $PANEL_DIR

# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Optimize for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Update composer autoloader
composer dump-autoload --optimize

print_success "Cache panel dioptimasi"

# 7. System Optimization
print_info "7. Optimasi Sistem..."

# Increase file limits
cat > /etc/security/limits.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
root soft nofile 65535
root hard nofile 65535
EOF

# Optimize kernel parameters
cat > /etc/sysctl.d/99-pterodactyl.conf << 'EOF'
# Network optimization
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.core.netdev_max_backlog = 5000

# File system optimization
fs.file-max = 2097152
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

sysctl -p /etc/sysctl.d/99-pterodactyl.conf

print_success "Sistem dioptimasi"

# 8. Restart Services
print_info "8. Restart Services..."

systemctl restart php$PHP_VERSION-fpm
systemctl restart nginx
systemctl restart mysql || systemctl restart mariadb
systemctl restart redis-server 2>/dev/null || true

print_success "Services direstart"

# 9. Performance Test
print_info "9. Test Performa..."

echo ""
print_info "📊 Status Services:"
systemctl is-active php$PHP_VERSION-fpm && print_success "PHP-FPM: Running" || print_error "PHP-FPM: Failed"
systemctl is-active nginx && print_success "Nginx: Running" || print_error "Nginx: Failed"
systemctl is-active mysql && print_success "MySQL: Running" || systemctl is-active mariadb && print_success "MariaDB: Running" || print_error "Database: Failed"
systemctl is-active redis-server && print_success "Redis: Running" || print_warning "Redis: Not running"

echo ""
print_info "📊 Memory Usage After Optimization:"
free -h

echo ""
print_success "🎉 Optimasi Panel Selesai!"
echo ""

print_info "📋 Ringkasan Optimasi:"
echo "  ✅ PHP Memory: 2048M"
echo "  ✅ PHP-FPM: 50 max children"
echo "  ✅ MySQL Buffer Pool: 8GB"
echo "  ✅ Redis Memory: 2GB"
echo "  ✅ Nginx Workers: Auto"
echo "  ✅ File Limits: 65535"
echo "  ✅ Cache: Optimized"
echo ""

print_info "🚀 Langkah Selanjutnya:"
echo "1. Test panel di browser - seharusnya lebih cepat"
echo "2. Monitor penggunaan: htop"
echo "3. Cek logs jika ada error: journalctl -f"
echo "4. Restart server jika perlu: reboot"
echo ""

print_success "🤖 Panel Anda sekarang dioptimasi untuk high usage!"
