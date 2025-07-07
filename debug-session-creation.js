#!/usr/bin/env node

/**
 * Debug Session Folder Creation Issue
 * Mari cari tahu kenapa folder tidak benar-benar dibuat
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Session Folder Creation Issue...\n');

// Target server yang harusnya sudah dibuat
const targetServer = '06d275e9-02ea-4f64-b779-c91bb810a6c0';

console.log(`🎯 Target server: ${targetServer}\n`);

// Test semua kemungkinan path
const possibleBasePaths = [
    '/var/lib/pterodactyl/volumes',           // Default Linux path
    '/opt/pterodactyl/volumes',               // Alternative Linux path  
    '/home/pterodactyl/volumes',              // Home directory path
    'C:\\pterodactyl\\volumes',               // Windows path 1
    'C:\\Program Files\\pterodactyl\\volumes', // Windows path 2
    process.env.PTERODACTYL_VOLUMES_PATH,     // Environment variable
    './volumes',                              // Relative path
    '../volumes'                              // Parent directory relative path
];

console.log('🔍 Testing all possible base paths:\n');

let validBasePath = null;

for (const basePath of possibleBasePaths) {
    if (basePath) {
        const exists = fs.existsSync(basePath);
        console.log(`${exists ? '✅' : '❌'} ${basePath} - ${exists ? 'EXISTS' : 'NOT FOUND'}`);
        
        if (exists && !validBasePath) {
            validBasePath = basePath;
            console.log(`   🎯 Using this as base path`);
            
            // Check server directory
            const serverPath = path.join(basePath, targetServer);
            const serverExists = fs.existsSync(serverPath);
            console.log(`   📁 Server dir: ${serverExists ? 'EXISTS' : 'NOT FOUND'} - ${serverPath}`);
            
            if (serverExists) {
                // List contents of server directory
                try {
                    const contents = fs.readdirSync(serverPath);
                    console.log(`   📋 Server dir contents: ${contents.join(', ')}`);
                    
                    // Check if session folder exists
                    const sessionPath = path.join(serverPath, 'session');
                    const sessionExists = fs.existsSync(sessionPath);
                    console.log(`   📁 Session folder: ${sessionExists ? 'EXISTS' : 'NOT FOUND'} - ${sessionPath}`);
                    
                    if (sessionExists) {
                        const stats = fs.statSync(sessionPath);
                        console.log(`   📅 Session created: ${stats.birthtime.toLocaleString('id-ID')}`);
                        console.log(`   📝 Session modified: ${stats.mtime.toLocaleString('id-ID')}`);
                    }
                } catch (error) {
                    console.log(`   ❌ Error reading server dir: ${error.message}`);
                }
            }
        }
    }
}

if (!validBasePath) {
    console.log('\n❌ NO VALID BASE PATH FOUND!');
    console.log('This explains why session folders are not being created.');
    process.exit(1);
}

console.log(`\n📊 Summary:`);
console.log(`✅ Valid base path: ${validBasePath}`);

// Try to create session folder right now as test
console.log(`\n🔨 Attempting to create session folder right NOW:\n`);

try {
    const serverPath = path.join(validBasePath, targetServer);
    const sessionPath = path.join(serverPath, 'session');
    
    console.log(`📁 Target session path: ${sessionPath}`);
    
    // Check if server directory exists
    if (!fs.existsSync(serverPath)) {
        console.log(`❌ Server directory does not exist: ${serverPath}`);
        process.exit(1);
    }
    
    // Check current session folder status
    if (fs.existsSync(sessionPath)) {
        console.log(`⏭️ Session folder already exists - deleting for fresh test`);
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    
    // Create session folder
    console.log(`🔨 Creating session folder...`);
    fs.mkdirSync(sessionPath, { recursive: true });
    
    // Set permissions (only on Unix-like systems)
    if (process.platform !== 'win32') {
        fs.chmodSync(sessionPath, 0o755);
        console.log(`🔒 Set permissions to 755`);
    }
    
    // Immediate verification
    if (fs.existsSync(sessionPath)) {
        const stats = fs.statSync(sessionPath);
        console.log(`✅ SUCCESS! Session folder created successfully`);
        console.log(`📅 Created at: ${stats.birthtime.toLocaleString('id-ID')}`);
        console.log(`📝 Path: ${sessionPath}`);
        
        // Create a test file inside to verify it's working
        const testFilePath = path.join(sessionPath, 'test-creation.txt');
        fs.writeFileSync(testFilePath, `Session folder created at ${new Date().toISOString()}\nBy debug script`);
        console.log(`📄 Test file created: ${testFilePath}`);
        
        console.log(`\n🌐 Check in panel web NOW:`);
        console.log(`https://memek.tams.my.id/server/${targetServer}/files#/session`);
        
    } else {
        console.log(`❌ FAILED! Session folder not found after creation attempt`);
    }
    
} catch (error) {
    console.log(`❌ ERROR creating session folder: ${error.message}`);
    console.log(`Stack trace:`, error.stack);
}

console.log(`\n💡 If this works, then the issue is in the bot code, not the system.`);
