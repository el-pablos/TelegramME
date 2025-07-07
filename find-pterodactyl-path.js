const fs = require('fs');
const path = require('path');

console.log('🔍 Searching for Pterodactyl volumes path...\n');

// Extended list of possible paths
const possiblePaths = [
    '/var/lib/pterodactyl/volumes',
    '/var/lib/docker/volumes/pterodactyl_app_data/_data/volumes',
    '/opt/pterodactyl/var/volumes',
    '/home/pterodactyl/volumes',
    '/usr/local/pterodactyl/volumes',
    'C:\\pterodactyl\\volumes',
    'C:\\var\\lib\\pterodactyl\\volumes',
    'C:\\Program Files\\pterodactyl\\volumes',
    'C:\\Users\\Administrator\\pterodactyl\\volumes',
    './volumes',
    '../volumes',
    '../../volumes'
];

console.log('📋 Checking possible paths:');
for (let i = 0; i < possiblePaths.length; i++) {
    const testPath = possiblePaths[i];
    console.log(`${i + 1}. ${testPath}`);
    
    try {
        if (fs.existsSync(testPath)) {
            console.log(`   ✅ EXISTS!`);
            
            // Check if it contains server directories (UUIDs)
            const contents = fs.readdirSync(testPath);
            const serverDirs = contents.filter(item => {
                const fullPath = path.join(testPath, item);
                return fs.statSync(fullPath).isDirectory() && 
                       item.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            });
            
            console.log(`   📁 Contains ${contents.length} items, ${serverDirs.length} server directories`);
            
            if (serverDirs.length > 0) {
                console.log(`   🎯 FOUND PTERODACTYL VOLUMES PATH: ${testPath}`);
                console.log(`   📊 Server UUIDs found:`);
                serverDirs.slice(0, 5).forEach(uuid => {
                    console.log(`      - ${uuid}`);
                });
                if (serverDirs.length > 5) {
                    console.log(`      ... and ${serverDirs.length - 5} more`);
                }
                
                // Check session folders in first server
                if (serverDirs.length > 0) {
                    const firstServerPath = path.join(testPath, serverDirs[0]);
                    const sessionPath = path.join(firstServerPath, 'session');
                    console.log(`   🔍 Checking session folder in first server:`);
                    console.log(`      Session path: ${sessionPath}`);
                    console.log(`      Session exists: ${fs.existsSync(sessionPath)}`);
                    
                    if (fs.existsSync(sessionPath)) {
                        const credsPath = path.join(sessionPath, 'creds.json');
                        console.log(`      Creds path: ${credsPath}`);
                        console.log(`      Creds exists: ${fs.existsSync(credsPath)}`);
                    }
                }
                
                break;
            }
        } else {
            console.log(`   ❌ Not found`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

console.log('\n🔍 Also checking current working directory and common locations...');

// Check current directory structure
const cwd = process.cwd();
console.log(`📁 Current working directory: ${cwd}`);

try {
    const cwdContents = fs.readdirSync(cwd);
    console.log(`📋 Contents: ${cwdContents.join(', ')}`);
} catch (error) {
    console.log(`❌ Cannot read current directory: ${error.message}`);
}

// Check if we're in a Docker environment
console.log('\n🐳 Checking Docker environment...');
if (fs.existsSync('/proc/1/cgroup')) {
    try {
        const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
        if (cgroup.includes('docker')) {
            console.log('✅ Running inside Docker container');
            console.log('🔍 Checking Docker volume mounts...');
            
            // Check common Docker volume mount points
            const dockerPaths = [
                '/app/volumes',
                '/pterodactyl/volumes',
                '/data/volumes',
                '/var/pterodactyl/volumes'
            ];
            
            dockerPaths.forEach(dockerPath => {
                if (fs.existsSync(dockerPath)) {
                    console.log(`✅ Found Docker volume: ${dockerPath}`);
                }
            });
        }
    } catch (error) {
        console.log(`❌ Cannot check Docker environment: ${error.message}`);
    }
}

console.log('\n✅ Search complete!');
