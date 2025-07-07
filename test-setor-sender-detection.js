const fs = require('fs');
const path = require('path');

// Import the same functions from bot.js
function detectPterodactylVolumesPath() {
    const possiblePaths = [
        '/var/lib/pterodactyl/volumes',
        '/var/lib/docker/volumes/pterodactyl_app_data/_data/volumes',
        '/opt/pterodactyl/var/volumes',
        'C:\\pterodactyl\\volumes',
        'C:\\var\\lib\\pterodactyl\\volumes',
        './test-volumes'  // Add test environment path
    ];

    for (const testPath of possiblePaths) {
        if (testPath && fs.existsSync(testPath)) {
            console.log(`✅ Found Pterodactyl volumes path: ${testPath}`);
            return testPath;
        }
    }

    console.log('❌ No valid Pterodactyl volumes path found');
    return null;
}

function getServerVolumePath(serverUuid) {
    const basePath = detectPterodactylVolumesPath();
    if (!basePath) {
        throw new Error('Pterodactyl volumes path not found. Please check your panel configuration.');
    }
    
    const serverVolumePath = path.join(basePath, serverUuid);
    
    // Verify server volume exists
    if (!fs.existsSync(serverVolumePath)) {
        throw new Error(`Server volume path not found: ${serverVolumePath}`);
    }
    
    return serverVolumePath;
}

// Test function to simulate setor sender detection
async function testSetorSenderDetection() {
    console.log('🔍 Testing Setor Sender Detection Logic...\n');
    
    const basePath = detectPterodactylVolumesPath();
    if (!basePath) {
        console.log('❌ Cannot test - volumes path not found');
        return;
    }
    
    console.log(`📁 Base volumes path: ${basePath}\n`);
    
    // Get all server directories
    const serverDirs = fs.readdirSync(basePath).filter(dir => {
        const fullPath = path.join(basePath, dir);
        return fs.statSync(fullPath).isDirectory();
    });
    
    console.log(`📊 Found ${serverDirs.length} server directories\n`);
    
    let availableServers = 0;
    let serversWithoutSession = 0;
    let serversWithCreds = 0;
    
    for (const serverUuid of serverDirs) {
        try {
            const serverVolumePath = getServerVolumePath(serverUuid);
            const sessionPath = path.join(serverVolumePath, 'session');
            const credsPath = path.join(sessionPath, 'creds.json');
            
            console.log(`\n📋 Checking server: ${serverUuid}`);
            console.log(`📁 Session path: ${sessionPath}`);
            console.log(`📄 Creds path: ${credsPath}`);
            
            const sessionExists = fs.existsSync(sessionPath);
            const credsExists = fs.existsSync(credsPath);
            
            console.log(`📁 Session folder exists: ${sessionExists}`);
            console.log(`📄 Creds.json exists: ${credsExists}`);
            
            if (!sessionExists) {
                // No session folder - cannot receive creds
                serversWithoutSession++;
                console.log(`❌ Server ${serverUuid}: No session folder`);
            } else if (!credsExists) {
                // Has session folder but no creds.json - can receive creds
                availableServers++;
                console.log(`✅ Server ${serverUuid}: Ready to receive creds`);
            } else {
                // Has both session folder and creds.json - already has creds
                serversWithCreds++;
                console.log(`🔑 Server ${serverUuid}: Already has creds`);
            }
            
        } catch (pathError) {
            serversWithoutSession++;
            console.log(`❌ Server ${serverUuid}: Path error - ${pathError.message}`);
        }
    }
    
    console.log(`\n📊 Detection Summary:`);
    console.log(`📈 Total servers: ${serverDirs.length}`);
    console.log(`✅ Already has creds: ${serversWithCreds}`);
    console.log(`📁 Without session folder: ${serversWithoutSession}`);
    console.log(`🆓 Ready to receive creds: ${availableServers}`);
    
    console.log(`\n🎯 Status Panel:`);
    console.log(`🏠 Panel Utama: https://memek.tams.my.id`);
    console.log(`📈 Total Server: ${serverDirs.length}`);
    console.log(`✅ Sudah ada sender: ${serversWithCreds}`);
    console.log(`📁 Tanpa folder session: ${serversWithoutSession}`);
    console.log(`🆓 Siap terima sender: ${availableServers}`);
    
    if (availableServers === 0) {
        console.log(`\n❌ Tidak Ada Server yang Bisa Diisi Sender`);
        console.log(`\n⚠️ Catatan:`);
        console.log(`• Server tanpa folder session perlu dibuat dulu folder sessionnya`);
        console.log(`• Gunakan menu "📁 Session Folder" untuk membuat folder session`);
        console.log(`• Setelah folder session dibuat, baru bisa upload sender`);
    } else {
        console.log(`\n✅ Ada ${availableServers} server yang siap menerima sender!`);
    }
}

// Run the test
testSetorSenderDetection().catch(console.error);
