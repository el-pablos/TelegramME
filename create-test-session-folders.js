const fs = require('fs');
const path = require('path');

// Simulate creating test session folders for testing
function createTestSessionFolders() {
    console.log('🔧 Creating test session folders for setor sender testing...\n');
    
    // Create a test volumes directory structure
    const testVolumesPath = path.join(__dirname, 'test-volumes');
    
    // Create some test server UUIDs
    const testServers = [
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'b2c3d4e5-f6g7-8901-bcde-f23456789012',
        'c3d4e5f6-g7h8-9012-cdef-345678901234'
    ];
    
    console.log(`📁 Creating test volumes directory: ${testVolumesPath}`);
    
    // Create base test directory
    if (!fs.existsSync(testVolumesPath)) {
        fs.mkdirSync(testVolumesPath, { recursive: true });
        console.log('✅ Created test volumes directory');
    } else {
        console.log('📁 Test volumes directory already exists');
    }
    
    // Create server directories and session folders
    testServers.forEach((serverUuid, index) => {
        const serverPath = path.join(testVolumesPath, serverUuid);
        const sessionPath = path.join(serverPath, 'session');
        const credsPath = path.join(sessionPath, 'creds.json');
        
        console.log(`\n📋 Creating test server ${index + 1}: ${serverUuid}`);
        
        // Create server directory
        if (!fs.existsSync(serverPath)) {
            fs.mkdirSync(serverPath, { recursive: true });
            console.log(`✅ Created server directory: ${serverPath}`);
        }
        
        // Create session folder for first 2 servers (leave 1 without session)
        if (index < 2) {
            if (!fs.existsSync(sessionPath)) {
                fs.mkdirSync(sessionPath, { recursive: true });
                console.log(`✅ Created session folder: ${sessionPath}`);
            }
            
            // Add creds.json to first server only (leave 1 ready for sender)
            if (index === 0) {
                const testCreds = {
                    "session": "test-session-data",
                    "user_id": "123456789",
                    "created": new Date().toISOString()
                };
                
                fs.writeFileSync(credsPath, JSON.stringify(testCreds, null, 2));
                console.log(`✅ Created test creds.json: ${credsPath}`);
            } else {
                console.log(`📝 Session folder ready for sender (no creds.json)`);
            }
        } else {
            console.log(`📝 Server without session folder (needs creation first)`);
        }
    });
    
    console.log('\n📊 Test Environment Summary:');
    console.log(`📁 Test volumes path: ${testVolumesPath}`);
    console.log(`📈 Total test servers: ${testServers.length}`);
    console.log(`✅ Servers with creds: 1 (${testServers[0].substring(0, 8)}...)`);
    console.log(`🆓 Servers ready for sender: 1 (${testServers[1].substring(0, 8)}...)`);
    console.log(`📁 Servers without session: 1 (${testServers[2].substring(0, 8)}...)`);
    
    console.log('\n🔧 To test with this environment:');
    console.log('1. Modify detectPterodactylVolumesPath() in bot.js to include:');
    console.log(`   "${testVolumesPath}"`);
    console.log('2. Restart bot and test setor sender feature');
    console.log('3. Should show: 1 server ready to receive sender');
    
    return testVolumesPath;
}

// Run the function
const testPath = createTestSessionFolders();

console.log('\n✅ Test environment created successfully!');
console.log(`📁 Path: ${testPath}`);
