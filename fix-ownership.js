#!/usr/bin/env node

/**
 * Fix Session Folder Ownership for Pterodactyl Panel
 * Mari perbaiki ownership supaya panel web bisa lihat folder
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing Session Folder Ownership for Pterodactyl Panel...\n');

const targetServer = '06d275e9-02ea-4f64-b779-c91bb810a6c0';
const basePath = '/var/lib/pterodactyl/volumes';
const serverPath = path.join(basePath, targetServer);
const sessionPath = path.join(serverPath, 'session');

console.log(`🎯 Target session path: ${sessionPath}\n`);

// First check current ownership
console.log('📋 Current ownership check:');
try {
    const lsOutput = execSync(`ls -la "${serverPath}"`, { encoding: 'utf8' });
    console.log(lsOutput);
} catch (error) {
    console.log(`❌ Could not check ownership: ${error.message}`);
}

// Check what user/group the panel should use
console.log('\n🔍 Checking pterodactyl panel user/group:');

// Check common pterodactyl users
const commonUsers = ['pterodactyl', 'www-data', 'nginx', 'apache', 'root'];
let panelUser = null;
let panelGroup = null;

for (const user of commonUsers) {
    try {
        const userInfo = execSync(`id ${user}`, { encoding: 'utf8' });
        console.log(`✅ Found user ${user}: ${userInfo.trim()}`);
        if (!panelUser) {
            panelUser = user;
        }
    } catch (error) {
        console.log(`❌ User ${user} not found`);
    }
}

// Check file ownership pattern from existing files
console.log('\n🔍 Checking ownership pattern from "files" folder:');
try {
    const filesPath = path.join(serverPath, 'files');
    const filesStats = fs.statSync(filesPath);
    console.log(`📁 Files folder UID: ${filesStats.uid}, GID: ${filesStats.gid}`);
    
    // Try to get user/group names for these IDs
    try {
        const userNameOutput = execSync(`getent passwd ${filesStats.uid}`, { encoding: 'utf8' });
        const userName = userNameOutput.split(':')[0];
        console.log(`👤 Files folder owner: ${userName}`);
        if (!panelUser) panelUser = userName;
    } catch (error) {
        console.log(`❌ Could not get username for UID ${filesStats.uid}`);
    }
    
    try {
        const groupNameOutput = execSync(`getent group ${filesStats.gid}`, { encoding: 'utf8' });
        const groupName = groupNameOutput.split(':')[0];
        console.log(`👥 Files folder group: ${groupName}`);
        if (!panelGroup) panelGroup = groupName;
    } catch (error) {
        console.log(`❌ Could not get groupname for GID ${filesStats.gid}`);
    }
    
} catch (error) {
    console.log(`❌ Could not check files folder ownership: ${error.message}`);
}

// Try to fix ownership if we found the right user
if (panelUser) {
    console.log(`\n🔧 Attempting to fix ownership to ${panelUser}:${panelGroup || panelUser}...\n`);
    
    try {
        // Change ownership of session folder
        const chownCommand = `chown -R ${panelUser}:${panelGroup || panelUser} "${sessionPath}"`;
        console.log(`Running: ${chownCommand}`);
        execSync(chownCommand);
        console.log(`✅ Ownership changed successfully`);
        
        // Verify the change
        const verifyOutput = execSync(`ls -la "${sessionPath}"`, { encoding: 'utf8' });
        console.log(`📋 Session folder after ownership change:`);
        console.log(verifyOutput);
        
    } catch (error) {
        console.log(`❌ Could not change ownership: ${error.message}`);
        console.log(`💡 Try running with sudo: sudo node check-permissions.js`);
    }
} else {
    console.log(`\n❌ Could not determine pterodactyl panel user`);
    console.log(`💡 Manual fix suggestions:`);
    console.log(`1. Find pterodactyl process: ps aux | grep pterodactyl`);
    console.log(`2. Check panel config for user/group`);
    console.log(`3. Match session folder ownership to "files" folder`);
}

// Alternative: Match ownership to files folder exactly
console.log(`\n🔄 Alternative: Copy ownership from "files" folder...`);
try {
    const filesPath = path.join(serverPath, 'files');
    const filesStats = fs.statSync(filesPath);
    
    const chownCommand = `chown ${filesStats.uid}:${filesStats.gid} "${sessionPath}"`;
    console.log(`Running: ${chownCommand}`);
    execSync(chownCommand);
    console.log(`✅ Copied ownership from files folder`);
    
    // Also fix permissions to match
    const chmodCommand = `chmod 755 "${sessionPath}"`;
    console.log(`Running: ${chmodCommand}`);
    execSync(chmodCommand);
    console.log(`✅ Set permissions to 755`);
    
} catch (error) {
    console.log(`❌ Could not copy ownership: ${error.message}`);
}

console.log(`\n🔄 Recommendations:`);
console.log(`1. 🔄 Refresh panel web page (Ctrl+F5)`);
console.log(`2. 🔄 Restart pterodactyl panel service`);
console.log(`3. 🔄 Clear panel cache if available`);
console.log(`4. 🔍 Check panel web URL: https://memek.tams.my.id/server/${targetServer}/files`);

console.log(`\n🎯 Test URLs:`);
console.log(`📁 Server root: https://memek.tams.my.id/server/${targetServer}/files`);
console.log(`📁 Session folder: https://memek.tams.my.id/server/${targetServer}/files#/session`);
