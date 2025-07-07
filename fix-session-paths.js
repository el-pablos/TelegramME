#!/usr/bin/env node

/**
 * Fix Session Folder Path Detection
 * Script untuk memperbaiki semua hardcoded path di bot.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting path detection fix...');

const botJsPath = path.join(__dirname, 'bot.js');

if (!fs.existsSync(botJsPath)) {
    console.error('❌ bot.js not found!');
    process.exit(1);
}

// Read current bot.js content
let content = fs.readFileSync(botJsPath, 'utf8');

// Replace all hardcoded paths with dynamic detection
const replacements = [
    {
        from: /\/var\/lib\/pterodactyl\/volumes\/\$\{serverUuid\}\/session/g,
        to: 'path.join(getServerVolumePath(serverUuid), "session")'
    },
    {
        from: /\/var\/lib\/pterodactyl\/volumes\/\$\{([^}]+)\}\/session/g,
        to: 'path.join(getServerVolumePath($1), "session")'
    },
    {
        from: /const sessionPath = `\/var\/lib\/pterodactyl\/volumes\/\$\{([^}]+)\}\/session`;/g,
        to: 'const sessionPath = path.join(getServerVolumePath($1), "session");'
    },
    {
        from: /\/var\/lib\/pterodactyl\/volumes\/\$\{([^}]+)\}/g,
        to: 'getServerVolumePath($1)'
    }
];

let changeCount = 0;

replacements.forEach((replacement, index) => {
    const before = content;
    content = content.replace(replacement.from, replacement.to);
    const matches = (before.match(replacement.from) || []).length;
    if (matches > 0) {
        console.log(`✅ Replacement ${index + 1}: ${matches} matches found and replaced`);
        changeCount += matches;
    }
});

if (changeCount > 0) {
    // Create backup
    const backupPath = path.join(__dirname, 'backup', `bot-fixed-${Date.now()}.js`);
    if (!fs.existsSync(path.dirname(backupPath))) {
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    }
    fs.writeFileSync(backupPath, fs.readFileSync(botJsPath, 'utf8'));
    
    // Write fixed content
    fs.writeFileSync(botJsPath, content);
    
    console.log(`🎉 Path detection fix completed!`);
    console.log(`📊 Total changes: ${changeCount}`);
    console.log(`💾 Backup saved to: ${backupPath}`);
    console.log(`\n✅ Bot should now properly detect session folder paths!`);
} else {
    console.log('ℹ️ No changes needed - all paths already use dynamic detection');
}
