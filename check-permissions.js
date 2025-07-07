#!/usr/bin/env node

/**
 * Check Session Folder Permissions and Ownership
 * Mari check kenapa panel web tidak bisa lihat folder
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Checking Session Folder Permissions & Ownership...\n');

const targetServer = '06d275e9-02ea-4f64-b779-c91bb810a6c0';
const basePath = '/var/lib/pterodactyl/volumes';
const serverPath = path.join(basePath, targetServer);
const sessionPath = path.join(serverPath, 'session');

console.log(`🎯 Target paths:`);
console.log(`📁 Server: ${serverPath}`);
console.log(`📁 Session: ${sessionPath}\n`);

// Check basic existence
console.log('📋 Basic File System Check:');
console.log(`Server dir exists: ${fs.existsSync(serverPath) ? '✅' : '❌'}`);
console.log(`Session dir exists: ${fs.existsSync(sessionPath) ? '✅' : '❌'}\n`);

if (fs.existsSync(sessionPath)) {
    try {
        // Get stats
        const stats = fs.statSync(sessionPath);
        console.log('📊 Session Folder Stats:');
        console.log(`📅 Created: ${stats.birthtime.toLocaleString('id-ID')}`);
        console.log(`📝 Modified: ${stats.mtime.toLocaleString('id-ID')}`);
        console.log(`📏 Size: ${stats.size} bytes`);
        console.log(`🔒 Mode: ${stats.mode.toString(8)}`);
        console.log(`🆔 UID: ${stats.uid}`);
        console.log(`👥 GID: ${stats.gid}\n`);
        
        // Check contents
        const sessionContents = fs.readdirSync(sessionPath);
        console.log('📋 Session Folder Contents:');
        if (sessionContents.length > 0) {
            sessionContents.forEach(item => {
                console.log(`   📄 ${item}`);
            });
        } else {
            console.log('   📭 Empty folder');
        }
        console.log('');
        
    } catch (error) {
        console.log(`❌ Error reading session folder stats: ${error.message}\n`);
    }
}

// Compare with other folders in server directory
try {
    console.log('🔍 Comparing with other folders in server directory:');
    const serverContents = fs.readdirSync(serverPath);
    
    for (const item of serverContents) {
        const itemPath = path.join(serverPath, item);
        const itemStats = fs.statSync(itemPath);
        
        console.log(`📁 ${item}:`);
        console.log(`   🔒 Mode: ${itemStats.mode.toString(8)}`);
        console.log(`   🆔 UID: ${itemStats.uid}, GID: ${itemStats.gid}`);
        console.log(`   📅 Created: ${itemStats.birthtime.toLocaleString('id-ID')}`);
    }
    console.log('');
    
} catch (error) {
    console.log(`❌ Error comparing folders: ${error.message}\n`);
}

// Try to get detailed permissions using ls command (Linux)
try {
    console.log('🔍 Detailed permissions check (Linux ls command):');
    const lsOutput = execSync(`ls -la "${serverPath}"`, { encoding: 'utf8' });
    console.log(lsOutput);
} catch (error) {
    console.log(`❌ Could not run ls command: ${error.message}\n`);
}

// Check owner information
try {
    console.log('👤 Checking ownership information:');
    
    // Get current process info
    console.log(`🤖 Bot process UID: ${process.getuid ? process.getuid() : 'N/A'}`);
    console.log(`🤖 Bot process GID: ${process.getgid ? process.getgid() : 'N/A'}\n`);
    
    // Try to get user/group names
    try {
        const idOutput = execSync(`id`, { encoding: 'utf8' });
        console.log(`🤖 Bot running as: ${idOutput.trim()}`);
    } catch (idError) {
        console.log(`❌ Could not get ID info: ${idError.message}`);
    }
    
    // Check pterodactyl user if exists
    try {
        const pterodactylId = execSync(`id pterodactyl`, { encoding: 'utf8' });
        console.log(`🦕 Pterodactyl user: ${pterodactylId.trim()}`);
    } catch (pterodactylError) {
        console.log(`❌ Pterodactyl user not found: ${pterodactylError.message}`);
    }
    
} catch (error) {
    console.log(`❌ Error checking ownership: ${error.message}`);
}

// Recommendations
console.log('\n💡 Troubleshooting Recommendations:');
console.log('1. 🔄 Try refreshing the panel web page (Ctrl+F5)');
console.log('2. 🔒 Check if session folder has same permissions as other folders');
console.log('3. 👤 Check if session folder owner matches other folders');
console.log('4. 🐳 If using Docker, check if folder is created outside container');
console.log('5. 🔧 Check Pterodactyl panel configuration for file access');

console.log('\n🌐 Panel URLs to test:');
console.log(`📁 Server files: https://memek.tams.my.id/server/${targetServer}/files`);
console.log(`📁 Session folder: https://memek.tams.my.id/server/${targetServer}/files#/session`);
