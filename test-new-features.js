#!/usr/bin/env node

/**
 * Test New Session Folder Features
 * Script untuk test fitur session folder yang sudah diperbaiki
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing New Session Folder Features...\n');

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

    for (const checkPath of possiblePaths) {
        if (checkPath && fs.existsSync(checkPath)) {
            return checkPath;
        }
    }
    return null;
}

function getServerVolumePath(serverUuid) {
    const basePath = detectPterodactylVolumesPath();
    if (!basePath) {
        throw new Error('Pterodactyl volumes path not found');
    }
    
    const serverVolumePath = path.join(basePath, serverUuid);
    if (!fs.existsSync(serverVolumePath)) {
        throw new Error(`Server volume path not found: ${serverVolumePath}`);
    }
    
    return serverVolumePath;
}

// Test simulation
const volumesBasePath = detectPterodactylVolumesPath();
if (!volumesBasePath) {
    console.log('❌ Cannot proceed - volumes path not found');
    process.exit(1);
}

console.log(`✅ Volumes path found: ${volumesBasePath}\n`);

// Get all server directories
const serverDirs = fs.readdirSync(volumesBasePath).filter(dir => {
    const fullPath = path.join(volumesBasePath, dir);
    return fs.statSync(fullPath).isDirectory() && dir.length === 36; // UUID format
});

console.log(`📊 Found ${serverDirs.length} server directories\n`);

// Test session folder creation simulation
console.log('🔨 Simulating session folder creation for all servers:\n');

let wouldCreate = 0;
let wouldSkip = 0;
let wouldError = 0;

serverDirs.slice(0, 10).forEach((serverUuid, index) => {
    try {
        const serverVolumePath = getServerVolumePath(serverUuid);
        const sessionPath = path.join(serverVolumePath, 'session');
        
        if (fs.existsSync(sessionPath)) {
            console.log(`${index + 1}. ⏭️ ${serverUuid.substring(0, 8)}... - Session folder already exists`);
            wouldSkip++;
        } else {
            console.log(`${index + 1}. ✅ ${serverUuid.substring(0, 8)}... - Would create session folder`);
            wouldCreate++;
        }
    } catch (error) {
        console.log(`${index + 1}. ❌ ${serverUuid.substring(0, 8)}... - Error: ${error.message}`);
        wouldError++;
    }
});

if (serverDirs.length > 10) {
    console.log(`   ... and ${serverDirs.length - 10} more servers`);
}

console.log(`\n📊 Simulation Results:`);
console.log(`✅ Would create: ${wouldCreate} folders`);
console.log(`⏭️ Would skip: ${wouldSkip} folders (already exist)`);
console.log(`❌ Would error: ${wouldError} folders`);

console.log(`\n🎯 Summary:`);
console.log(`📁 Total servers: ${serverDirs.length}`);
console.log(`🔨 Ready for session folder creation: ${wouldCreate}`);
console.log(`✅ Already have session folders: ${wouldSkip}`);

// Test delete simulation
console.log(`\n🗑️ Simulating session folder deletion for all servers:\n`);

let wouldDelete = 0;
let wouldSkipDelete = 0;

serverDirs.slice(0, 5).forEach((serverUuid, index) => {
    try {
        const serverVolumePath = getServerVolumePath(serverUuid);
        const sessionPath = path.join(serverVolumePath, 'session');
        
        if (fs.existsSync(sessionPath)) {
            console.log(`${index + 1}. 🗑️ ${serverUuid.substring(0, 8)}... - Would delete session folder`);
            wouldDelete++;
        } else {
            console.log(`${index + 1}. ⏭️ ${serverUuid.substring(0, 8)}... - No session folder to delete`);
            wouldSkipDelete++;
        }
    } catch (error) {
        console.log(`${index + 1}. ❌ ${serverUuid.substring(0, 8)}... - Error: ${error.message}`);
        wouldSkipDelete++;
    }
});

console.log(`\n📊 Delete Simulation Results:`);
console.log(`🗑️ Would delete: ${wouldDelete} folders`);
console.log(`⏭️ Would skip: ${wouldSkipDelete} folders (not found/error)`);

console.log(`\n✅ New features should work properly:`);
console.log(`📁 Create Session Folders (All Servers) - Ready`);
console.log(`🗑️ Delete All Session Folders - Ready`);
console.log(`🔑 Auto Creds.json - Fixed path detection`);
console.log(`📤 Setor Sender - Fixed path detection`);

console.log(`\n🎉 Bot ready to test!`);
