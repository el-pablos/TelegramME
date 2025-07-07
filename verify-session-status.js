#!/usr/bin/env node

/**
 * Verify Session Folder Status
 * Script untuk check status session folder dan timestamp
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Session Folder Status...\n');

// Helper function to detect Pterodactyl volumes path
function detectPterodactylVolumesPath() {
    const possiblePaths = [
        '/var/lib/pterodactyl/volumes',
        '/opt/pterodactyl/volumes',
        '/home/pterodactyl/volumes',
        'C:\\pterodactyl\\volumes',
        'C:\\Program Files\\pterodactyl\\volumes',
        process.env.PTERODACTYL_VOLUMES_PATH,
        './volumes',
        '../volumes'
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

const volumesBasePath = detectPterodactylVolumesPath();
if (!volumesBasePath) {
    console.log('❌ Cannot proceed - volumes path not found');
    process.exit(1);
}

console.log(`✅ Volumes path: ${volumesBasePath}\n`);

// Get all server directories
const serverDirs = fs.readdirSync(volumesBasePath).filter(dir => {
    const fullPath = path.join(volumesBasePath, dir);
    return fs.statSync(fullPath).isDirectory() && dir.length === 36;
});

console.log(`📊 Found ${serverDirs.length} server directories\n`);

// Check specific server that user mentioned
const targetServer = '2f9a77ec-84b6-43cd-ae02-a3fb1fc62dee';
console.log(`🎯 Checking specific server: ${targetServer.substring(0, 8)}...\n`);

if (serverDirs.includes(targetServer)) {
    try {
        const serverVolumePath = getServerVolumePath(targetServer);
        const sessionPath = path.join(serverVolumePath, 'session');
        
        if (fs.existsSync(sessionPath)) {
            const stats = fs.statSync(sessionPath);
            const createdTime = stats.birthtime || stats.ctime;
            const modifiedTime = stats.mtime;
            
            console.log(`✅ Server ${targetServer.substring(0, 8)}... HAS session folder:`);
            console.log(`📁 Path: ${sessionPath}`);
            console.log(`📅 Created: ${createdTime.toLocaleString('id-ID')}`);
            console.log(`📝 Modified: ${modifiedTime.toLocaleString('id-ID')}`);
            
            // Check if created recently (within last hour)
            const now = new Date();
            const hourAgo = new Date(now.getTime() - (60 * 60 * 1000));
            
            if (createdTime > hourAgo) {
                console.log(`🆕 BARU DIBUAT (dalam 1 jam terakhir)`);
            } else {
                console.log(`⏰ FOLDER LAMA (dibuat sebelumnya)`);
            }
        } else {
            console.log(`❌ Server ${targetServer.substring(0, 8)}... does NOT have session folder`);
        }
    } catch (error) {
        console.log(`❌ Error checking server ${targetServer.substring(0, 8)}...: ${error.message}`);
    }
} else {
    console.log(`❌ Server ${targetServer.substring(0, 8)}... not found in volumes`);
}

console.log(`\n📋 Status Summary for ALL servers:\n`);

let hasSession = 0;
let noSession = 0;
let recentlyCreated = 0;
const hourAgo = new Date(Date.now() - (60 * 60 * 1000));

serverDirs.forEach((serverUuid, index) => {
    try {
        const serverVolumePath = getServerVolumePath(serverUuid);
        const sessionPath = path.join(serverVolumePath, 'session');
        
        if (fs.existsSync(sessionPath)) {
            hasSession++;
            const stats = fs.statSync(sessionPath);
            const createdTime = stats.birthtime || stats.ctime;
            
            if (createdTime > hourAgo) {
                recentlyCreated++;
                console.log(`${index + 1}. ✅ ${serverUuid.substring(0, 8)}... - HAS session folder (🆕 RECENT: ${createdTime.toLocaleString('id-ID')})`);
            } else {
                console.log(`${index + 1}. ✅ ${serverUuid.substring(0, 8)}... - HAS session folder (⏰ OLD: ${createdTime.toLocaleString('id-ID')})`);
            }
        } else {
            noSession++;
            console.log(`${index + 1}. ❌ ${serverUuid.substring(0, 8)}... - NO session folder`);
        }
    } catch (error) {
        noSession++;
        console.log(`${index + 1}. ❌ ${serverUuid.substring(0, 8)}... - ERROR: ${error.message}`);
    }
});

console.log(`\n📊 FINAL SUMMARY:`);
console.log(`✅ Servers WITH session folder: ${hasSession}`);
console.log(`❌ Servers WITHOUT session folder: ${noSession}`);
console.log(`🆕 Recently created (last hour): ${recentlyCreated}`);
console.log(`⏰ Old folders: ${hasSession - recentlyCreated}`);

if (recentlyCreated > 0) {
    console.log(`\n🎉 SUCCESS: ${recentlyCreated} new session folder(s) were recently created!`);
} else if (hasSession > 0) {
    console.log(`\n💡 INFO: ${hasSession} session folders exist, but they are OLD (not created by recent bot run)`);
} else {
    console.log(`\n❌ No session folders found at all`);
}

console.log(`\n🔍 To create NEW session folders, run the bot and use "📁 Create Session Folders (All Servers)"`);
