#!/bin/bash

# Test PHP Package Detection
echo "🧪 Testing PHP Package Detection"
echo "================================"

# Detect PHP version
if command -v php >/dev/null 2>&1; then
    PHP_VERSION=$(php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;")
    PHP_MAJOR=$(php -r "echo PHP_MAJOR_VERSION;")
    PHP_MINOR=$(php -r "echo PHP_MINOR_VERSION;")
    
    echo "✅ PHP Version: $PHP_VERSION"
    echo "   Major: $PHP_MAJOR"
    echo "   Minor: $PHP_MINOR"
    
    if [[ $PHP_MAJOR -eq 8 && $PHP_MINOR -ge 1 ]]; then
        PHP_PACKAGE="php${PHP_MAJOR}.${PHP_MINOR}"
        echo "✅ Using existing PHP $PHP_VERSION"
    else
        PHP_PACKAGE="php8.3"
        echo "⚠️ Will install PHP 8.3"
    fi
else
    PHP_PACKAGE="php8.3"
    echo "❌ PHP not found - will install PHP 8.3"
fi

echo ""
echo "📦 Package Selection:"
echo "   Base Package: $PHP_PACKAGE"

# Test package list generation
if [[ $PHP_PACKAGE == "php8.3" ]] || [[ $PHP_PACKAGE == "php8.4" ]]; then
    PACKAGES="$PHP_PACKAGE ${PHP_PACKAGE}-cli ${PHP_PACKAGE}-curl ${PHP_PACKAGE}-sqlite3 ${PHP_PACKAGE}-mbstring ${PHP_PACKAGE}-xml"
    echo "   Type: PHP 8.3+ (no json package needed)"
else
    PACKAGES="$PHP_PACKAGE ${PHP_PACKAGE}-cli ${PHP_PACKAGE}-curl ${PHP_PACKAGE}-json ${PHP_PACKAGE}-sqlite3 ${PHP_PACKAGE}-mbstring ${PHP_PACKAGE}-xml"
    echo "   Type: PHP 8.1/8.2 (with json package)"
fi

echo ""
echo "📋 Final Package List:"
echo "   $PACKAGES"

echo ""
echo "✅ PHP Package Detection Test Complete!"
