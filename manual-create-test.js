#!/usr/bin/env node

/**
 * Manual Session Folder Creation Test
 * Script untuk test create session folder secara manual
 */

const fs = require('fs');
const path = require('path');

console.log('🔨 Manual Session Folder Creation Test...\n');

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

// Test creating session folders for first 3 servers as proof of concept
console.log('🔨 Creating session folders for first 3 servers as TEST:\n');

let createdCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (let i = 0; i < Math.min(3, serverDirs.length); i++) {
    const serverUuid = serverDirs[i];
    
    try {
        const serverVolumePath = getServerVolumePath(serverUuid);
        const sessionPath = path.join(serverVolumePath, 'session');
        
        console.log(`${i + 1}. Processing ${serverUuid.substring(0, 8)}...`);
        console.log(`   📁 Server path: ${serverVolumePath}`);
        console.log(`   🎯 Session path: ${sessionPath}`);
        
        // Check if session folder already exists
        if (fs.existsSync(sessionPath)) {
            skippedCount++;
            console.log(`   ⏭️ Session folder already exists - SKIPPED\n`);
            continue;
        }
        
        // Create session folder
        fs.mkdirSync(sessionPath, { recursive: true });
        
        // Set permissions (only on Unix-like systems)
        if (process.platform !== 'win32') {
            fs.chmodSync(sessionPath, 0o755);
        }
        
        // Verify creation
        if (fs.existsSync(sessionPath)) {
            createdCount++;
            console.log(`   ✅ Session folder CREATED successfully!`);
            
            // Get stats
            const stats = fs.statSync(sessionPath);
            console.log(`   📅 Created at: ${stats.birthtime.toLocaleString('id-ID')}`);
        } else {
            errorCount++;
            console.log(`   ❌ Session folder creation FAILED - not found after creation`);
        }
        
        console.log('');
        
    } catch (error) {
        errorCount++;
        console.log(`   ❌ ERROR: ${error.message}\n`);
    }
}

console.log(`📊 TEST RESULTS:`);
console.log(`✅ Created: ${createdCount} session folders`);
console.log(`⏭️ Skipped: ${skippedCount} session folders (already existed)`);
console.log(`❌ Errors: ${errorCount} session folders`);

if (createdCount > 0) {
    console.log(`\n🎉 SUCCESS! Session folder creation is WORKING!`);
    console.log(`\n🔍 Verify in panel web:`);
    for (let i = 0; i < Math.min(createdCount, serverDirs.length); i++) {
        const serverUuid = serverDirs[i];
        const sessionPath = path.join(volumesBasePath, serverUuid, 'session');
        if (fs.existsSync(sessionPath)) {
            console.log(`   📁 ${serverUuid} → https://memek.tams.my.id/server/${serverUuid}/files#/session`);
        }
    }
    
    console.log(`\n💡 Now test the bot feature "📁 Create Session Folders (All Servers)" for remaining ${serverDirs.length - 3} servers`);
} else {
    console.log(`\n❌ FAILED: No session folders were created. Check file system permissions.`);
}
