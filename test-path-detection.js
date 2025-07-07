#!/usr/bin/env node

/**
 * Test Session Folder Detection
 * Script untuk test deteksi path volume Pterodactyl
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Pterodactyl Volume Path Detection...\n');

// Helper function to detect Pterodactyl volumes path (sama seperti di bot.js)
function detectPterodactylVolumesPath() {
    const possiblePaths = [
        '/var/lib/pterodactyl/volumes',           // Default Linux path
        '/opt/pterodactyl/volumes',               // Alternative Linux path
        '/home/pterodactyl/volumes',              // Home directory path
        'C:\\pterodactyl\\volumes',               // Windows path 1
        'C:\\Program Files\\pterodactyl\\volumes', // Windows path 2
        process.env.PTERODACTYL_VOLUMES_PATH,     // Environment variable
        './volumes',                              // Relative path
        '../volumes'                              // Parent directory relative path
    ];

    console.log('🔍 Checking possible paths:');
    
    for (const checkPath of possiblePaths) {
        if (checkPath) {
            const exists = fs.existsSync(checkPath);
            const status = exists ? '✅ EXISTS' : '❌ NOT FOUND';
            console.log(`   ${status} - ${checkPath}`);
            
            if (exists) {
                console.log(`\n🎉 Found Pterodactyl volumes path: ${checkPath}`);
                
                // Check if it has server directories
                try {
                    const contents = fs.readdirSync(checkPath);
                    const serverDirs = contents.filter(dir => {
                        const fullPath = path.join(checkPath, dir);
                        return fs.statSync(fullPath).isDirectory() && dir.length === 36; // UUID format
                    });
                    
                    console.log(`📊 Found ${serverDirs.length} server directories:`);
                    serverDirs.slice(0, 5).forEach(dir => {
                        console.log(`   📁 ${dir}`);
                    });
                    
                    if (serverDirs.length > 5) {
                        console.log(`   ... and ${serverDirs.length - 5} more`);
                    }
                } catch (error) {
                    console.log(`⚠️ Could not read directory contents: ${error.message}`);
                }
                
                return checkPath;
            }
        }
    }
    
    console.log('\n❌ No valid Pterodactyl volumes path found');
    console.log('\n💡 Solutions:');
    console.log('   1. Set PTERODACTYL_VOLUMES_PATH environment variable');
    console.log('   2. Check if Pterodactyl is properly installed');
    console.log('   3. Verify the correct path and update the detection logic');
    
    return null;
}

// Test the detection
const detectedPath = detectPterodactylVolumesPath();

if (detectedPath) {
    console.log(`\n✅ Path detection successful!`);
    console.log(`📂 Volume path: ${detectedPath}`);
    console.log('\n🔧 Your bot should now work properly for session folder creation.');
} else {
    console.log(`\n❌ Path detection failed!`);
    console.log('🔧 You need to configure the correct path before using session folder features.');
}

// Environment variable suggestion
console.log('\n📝 To set a custom path, add this to your .env file:');
console.log('PTERODACTYL_VOLUMES_PATH=/your/custom/path/to/volumes');
