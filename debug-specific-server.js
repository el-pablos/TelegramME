const axios = require('axios');
const fs = require('fs');
const path = require('path');

console.log('🐛 Debug Specific Server Issue...\n');

// External panel configuration (updated)
const EXTERNAL_PANEL = {
    domain: 'https://panel-three.ndikafath.com',
    plta: 'ptla_IVUVn5BLp5ILW0U366RA7k7W9ZasObUafv1VXJsbMby',
    pltc: 'ptlc_fxVgEkxHt6d2hRR2YKVtwpGkjaVliCkD9CpwDLGVlPC'
};

const OUTPUT_SCRAPE_SENDER_DIR = 'output-scrape-sender';

// External Panel API helper
class ExternalPteroAPI {
    static async clientRequest(endpoint, method = 'GET', data = null) {
        try {
            const url = `${EXTERNAL_PANEL.domain}/api/client/${endpoint}`;
            const config = {
                method,
                url,
                headers: {
                    'Authorization': `Bearer ${EXTERNAL_PANEL.pltc}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            };

            if (data) config.data = data;

            console.log(`🌐 Client API Request: ${method} ${url}`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const response = await axios(config);
            console.log(`✅ Client API Response: ${response.status}`);

            return response.data;
        } catch (error) {
            console.error(`❌ Client API Error: ${error.response?.status} - ${error.message}`);
            throw error;
        }
    }
}

// Clean JSON content function
function cleanJsonContent(content) {
    if (!content || typeof content !== 'string') {
        return content;
    }
    
    // Remove line numbers like "1{...}" at the beginning
    let cleaned = content.replace(/^\d+\{/, '{');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
}

// Test specific servers that were found but skipped
async function debugSpecificServers() {
    try {
        console.log('\n🚀 Testing specific servers that had creds.json but were skipped...');
        
        // Test servers from the log that found creds.json
        const testServers = [
            { name: 'Chikuybotz', uuid: 'daeec164-e5cb-4f90-b2f4-aa5f3ed4b0eb' },
            { name: 'Albotz', uuid: '1aa57bc5-e6c4-48d0-9bc8-3040d8ae9306' }
        ];

        // Create output directory
        const outputDir = path.join(__dirname, OUTPUT_SCRAPE_SENDER_DIR);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`✅ Created output directory: ${outputDir}`);
        }

        for (const server of testServers) {
            console.log(`\n🔍 Testing server: ${server.name} (${server.uuid})`);

            let credsFound = false;
            let credsContent = null;
            let foundPath = '';

            try {
                // Check /session directory
                console.log(`📁 Checking /session directory...`);
                const sessionFiles = await ExternalPteroAPI.clientRequest(`servers/${server.uuid}/files/list?directory=%2Fsession`, 'GET');
                
                if (sessionFiles.data && sessionFiles.data.length > 0) {
                    console.log(`📋 Found ${sessionFiles.data.length} files in /session`);
                    
                    // Look for creds.json specifically
                    const credsFile = sessionFiles.data.find(file => 
                        file.attributes.is_file && file.attributes.name === 'creds.json'
                    );
                    
                    if (credsFile) {
                        console.log(`📄 Found creds.json in /session!`);
                        foundPath = `/session/creds.json`;
                        
                        // Try to read the file
                        try {
                            console.log(`📖 Reading creds.json from /session...`);
                            const fileContent = await ExternalPteroAPI.clientRequest(
                                `servers/${server.uuid}/files/contents?file=%2Fsession%2Fcreds.json`,
                                'GET'
                            );
                            
                            console.log(`📊 File content type: ${typeof fileContent}`);
                            console.log(`📊 File content exists: ${!!fileContent}`);
                            
                            if (fileContent && typeof fileContent === 'string' && fileContent.trim().length > 0) {
                                credsContent = fileContent;
                                credsFound = true;
                                console.log(`✅ Successfully read creds.json (string)!`);
                                console.log(`📊 Content length: ${fileContent.length}`);
                                console.log(`📊 Content preview: ${fileContent.substring(0, 100)}...`);
                            } else if (fileContent && typeof fileContent === 'object' && fileContent !== null) {
                                credsContent = JSON.stringify(fileContent, null, 2);
                                credsFound = true;
                                console.log(`✅ Successfully read creds.json (object)!`);
                                console.log(`📊 Content length: ${credsContent.length}`);
                                console.log(`📊 Content preview: ${credsContent.substring(0, 100)}...`);
                            } else {
                                console.log(`⚠️ File content is empty or invalid`);
                                console.log(`📊 Raw response: ${JSON.stringify(fileContent).substring(0, 200)}...`);
                            }
                            
                        } catch (readError) {
                            console.log(`❌ Failed to read creds.json: ${readError.response?.status} - ${readError.message}`);
                        }
                    } else {
                        console.log(`⚠️ No creds.json found in /session`);
                        
                        // List all JSON files for debugging
                        const jsonFiles = sessionFiles.data.filter(file => 
                            file.attributes.is_file && file.attributes.name.endsWith('.json')
                        );
                        
                        if (jsonFiles.length > 0) {
                            console.log(`📋 Found ${jsonFiles.length} other JSON files:`);
                            jsonFiles.forEach(file => {
                                console.log(`   📄 ${file.attributes.name}`);
                            });
                        }
                    }
                } else {
                    console.log(`⚠️ /session directory is empty or not accessible`);
                }
                
            } catch (error) {
                console.log(`❌ Error checking server ${server.name}: ${error.response?.status} - ${error.message}`);
            }

            // Final check simulation (same as bot logic)
            console.log(`\n🔍 Final check for ${server.name}:`);
            console.log(`   credsFound: ${credsFound}`);
            console.log(`   credsContent exists: ${!!credsContent}`);
            console.log(`   credsContent type: ${typeof credsContent}`);
            console.log(`   credsContent length: ${credsContent ? credsContent.length : 'NULL'}`);
            
            if (!credsFound || !credsContent || (typeof credsContent === 'string' && credsContent.trim().length === 0)) {
                console.log(`⏭️ Would skip ${server.name}: No valid creds.json found`);
                console.log(`   Reason: credsFound=${credsFound}, credsContent=${!!credsContent}, length=${credsContent ? credsContent.length : 'NULL'}`);
                continue;
            }

            // If we get here, try to save the file
            console.log(`🔧 Processing creds content for ${server.name}...`);
            
            try {
                const cleanedContent = cleanJsonContent(credsContent);
                const jsonData = JSON.parse(cleanedContent);
                console.log(`✅ Valid JSON with ${Object.keys(jsonData).length} properties`);
                
                // Save to file
                const safeFileName = server.name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
                const outputFilePath = path.join(outputDir, safeFileName);
                
                console.log(`💾 Saving to: ${outputFilePath}`);
                fs.writeFileSync(outputFilePath, cleanedContent, 'utf8');
                
                // Verify file was saved
                if (fs.existsSync(outputFilePath)) {
                    const fileStats = fs.statSync(outputFilePath);
                    console.log(`✅ File saved successfully - Size: ${fileStats.size} bytes`);
                    console.log(`📁 File location: ${outputFilePath}`);
                    
                    console.log(`\n🎉 SUCCESS! ${server.name} scraped and saved!`);
                } else {
                    console.log(`❌ File was not saved: ${outputFilePath}`);
                }
                
            } catch (jsonError) {
                console.log(`❌ Invalid JSON: ${jsonError.message}`);
                console.log(`📊 Raw content: ${credsContent.substring(0, 200)}...`);
            }
            
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        console.log('\n✅ Debug test completed!');

    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
    }
}

// Run the debug test
debugSpecificServers().catch(console.error);
