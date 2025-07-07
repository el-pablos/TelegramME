const axios = require('axios');
const fs = require('fs');
const path = require('path');

console.log('🐛 Debug Scrape Sender External Panel...\n');

// External panel configuration (updated)
const EXTERNAL_PANEL = {
    domain: 'https://panel-two.ndikafath.com',
    plta: 'ptla_6OSbM8oAbeedeLw0xm2tJeEK5s65GsaPAEsZs8s4yGC',
    pltc: 'ptlc_3RbaGq18XEwuxnwz8jIxQ589wzgsNlekBislRs78ba1'
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

// Debug scraping function
async function debugScrapeExternalSender() {
    try {
        console.log('\n🚀 Starting debug scrape external sender...');
        
        // Get servers from external panel
        console.log('📡 Getting servers from external panel...');
        const externalServers = await ExternalPteroAPI.getAllServers();

        console.log(`📊 External panel servers: ${externalServers.length}`);
        
        if (externalServers.length === 0) {
            console.log('❌ No external servers found');
            return;
        }

        let scrapedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const scrapedFiles = [];

        // Create output directory
        const outputDir = path.join(__dirname, OUTPUT_SCRAPE_SENDER_DIR);
        console.log(`📁 Creating output directory: ${outputDir}`);
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`✅ Created output directory: ${outputDir}`);
        } else {
            console.log(`✅ Output directory already exists: ${outputDir}`);
        }

        // Test with first 3 servers
        const testServers = externalServers.slice(0, 3);
        console.log(`\n🔍 Testing with first ${testServers.length} servers...`);

        for (const externalServer of testServers) {
            try {
                const externalUuid = externalServer.attributes.uuid;
                const externalName = externalServer.attributes.name;

                console.log(`\n🔍 Processing external server: ${externalName} (${externalUuid})`);

                // Check if external server has creds.json via API
                let credsFound = false;
                let credsContent = null;
                let foundPath = '';

                // Method 1: Check files in /files/session directory
                try {
                    console.log(`📁 Method 1: Checking /files/session directory for ${externalName}...`);
                    const sessionFilesResponse = await ExternalPteroAPI.clientRequest(`servers/${externalUuid}/files/list?directory=%2Ffiles%2Fsession`, 'GET');
                    
                    console.log(`📊 Session response status: ${sessionFilesResponse ? 'OK' : 'NULL'}`);
                    
                    if (sessionFilesResponse && sessionFilesResponse.data && sessionFilesResponse.data.length > 0) {
                        console.log(`📋 Found ${sessionFilesResponse.data.length} files in /files/session directory`);
                        
                        // List all files for debugging
                        sessionFilesResponse.data.forEach(file => {
                            const type = file.attributes.is_file ? '📄' : '📁';
                            console.log(`   ${type} ${file.attributes.name}`);
                        });
                        
                        // Look for JSON files
                        const jsonFiles = sessionFilesResponse.data.filter(file => 
                            file.attributes.is_file && file.attributes.name.endsWith('.json')
                        );
                        
                        console.log(`🔍 Found ${jsonFiles.length} JSON files in /files/session`);
                        
                        if (jsonFiles.length > 0) {
                            const credsFile = jsonFiles.find(file => file.attributes.name === 'creds.json') || jsonFiles[0];
                            console.log(`📄 Selected JSON file: ${credsFile.attributes.name}`);
                            foundPath = `/files/session/${credsFile.attributes.name}`;
                            
                            // Try to read the file content
                            try {
                                console.log(`📖 Reading file content from: ${foundPath}`);
                                const fileContentResponse = await ExternalPteroAPI.clientRequest(
                                    `servers/${externalUuid}/files/contents?file=%2Ffiles%2Fsession%2F${encodeURIComponent(credsFile.attributes.name)}`, 
                                    'GET'
                                );
                                
                                console.log(`📊 File content response type: ${typeof fileContentResponse}`);
                                console.log(`📊 File content length: ${fileContentResponse ? (typeof fileContentResponse === 'string' ? fileContentResponse.length : 'Not string') : 'NULL'}`);
                                
                                if (fileContentResponse && typeof fileContentResponse === 'string' && fileContentResponse.trim().length > 0) {
                                    credsContent = fileContentResponse;
                                    credsFound = true;
                                    console.log(`✅ Successfully read ${credsFile.attributes.name} from /files/session/ in ${externalName}`);
                                    console.log(`📊 Content preview: ${fileContentResponse.substring(0, 100)}...`);
                                } else {
                                    console.log(`⚠️ File content is empty or invalid format for ${credsFile.attributes.name}`);
                                }
                            } catch (readError) {
                                console.log(`❌ Failed to read ${credsFile.attributes.name}: ${readError.response?.status} - ${readError.message}`);
                            }
                        } else {
                            console.log(`⚠️ No JSON files found in /files/session for ${externalName}`);
                        }
                    } else {
                        console.log(`⚠️ /files/session directory is empty or not accessible for ${externalName}`);
                    }
                } catch (sessionError) {
                    console.log(`❌ Cannot access /files/session directory for ${externalName}: ${sessionError.response?.status} - ${sessionError.message}`);
                }

                // Final check if we found any creds
                if (!credsFound || !credsContent || credsContent.trim().length === 0) {
                    skippedCount++;
                    console.log(`⏭️ Skipping ${externalName}: No valid creds.json found via API`);
                    continue;
                }

                console.log(`🔧 Processing creds content for ${externalName}...`);
                console.log(`📊 Raw content length: ${credsContent.length}`);

                // Clean and validate JSON content
                try {
                    const cleanedContent = cleanJsonContent(credsContent);
                    console.log(`🧹 Cleaned content length: ${cleanedContent.length}`);
                    
                    // Validate JSON
                    const jsonData = JSON.parse(cleanedContent);
                    console.log(`✅ Valid JSON with ${Object.keys(jsonData).length} properties`);

                    // Create safe filename from server name
                    const safeFileName = externalName.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
                    const outputFilePath = path.join(outputDir, safeFileName);

                    console.log(`💾 Saving to: ${outputFilePath}`);

                    // Save to output-scrape-sender folder
                    fs.writeFileSync(outputFilePath, cleanedContent, 'utf8');
                    
                    // Verify file was written
                    if (fs.existsSync(outputFilePath)) {
                        const fileStats = fs.statSync(outputFilePath);
                        console.log(`✅ File saved successfully - Size: ${fileStats.size} bytes`);
                        
                        scrapedCount++;
                        scrapedFiles.push({
                            serverName: externalName,
                            serverUuid: externalUuid,
                            fileName: safeFileName,
                            filePath: outputFilePath,
                            foundPath: foundPath,
                            fileSize: fileStats.size
                        });

                        console.log(`✅ Scraped sender from ${externalName} → ${safeFileName} (${fileStats.size} bytes)`);
                    } else {
                        console.log(`❌ File was not saved: ${outputFilePath}`);
                        errorCount++;
                    }

                } catch (jsonError) {
                    console.log(`❌ Invalid JSON content for ${externalName}: ${jsonError.message}`);
                    errorCount++;
                    continue;
                }

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                errorCount++;
                console.error(`❌ Error scraping ${externalServer.attributes.name}:`, error.message);
            }
        }

        // Final results
        console.log(`\n📊 Final Debug Results:`);
        console.log(`📤 Total Scraped: ${scrapedCount}`);
        console.log(`⏭️ Dilewati: ${skippedCount}`);
        console.log(`❌ Error: ${errorCount}`);
        console.log(`📁 Output Directory: ${outputDir}`);

        if (scrapedCount > 0) {
            console.log(`\n📋 Scraped Files:`);
            scrapedFiles.forEach((file, index) => {
                console.log(`${index + 1}. ${file.serverName} → ${file.fileName} (${file.fileSize} bytes)`);
                console.log(`   📁 Source: ${file.foundPath}`);
                console.log(`   💾 Saved: ${file.filePath}`);
            });
        }

        console.log('\n✅ Debug scraping completed!');

    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
    }
}

// Run the debug test
debugScrapeExternalSender().catch(console.error);
