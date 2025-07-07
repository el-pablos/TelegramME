#!/usr/bin/env node

/**
 * Test Pterodactyl File Management API
 * Mari cari tahu endpoint untuk create folder via API
 */

require('dotenv').config();
const axios = require('axios');

const PANEL_URL = process.env.PTERODACTYL_PANEL_URL;
const CLIENT_API_KEY = process.env.PTERODACTYL_CLIENT_API_KEY;

console.log('🔍 Testing Pterodactyl File Management API...\n');

// Test server UUID
const testServerUuid = '06d275e9-02ea-4f64-b779-c91bb810a6c0';

console.log(`🎯 Test server: ${testServerUuid}`);
console.log(`🌐 Panel URL: ${PANEL_URL}`);
console.log(`🔑 API Key: ${CLIENT_API_KEY.substring(0, 15)}...\n`);

async function testFileAPI() {
    try {
        // Test 1: Get server files list
        console.log('📁 Test 1: Get server files list...');
        const filesResponse = await axios({
            method: 'GET',
            url: `${PANEL_URL}/api/client/servers/${testServerUuid}/files/list`,
            headers: {
                'Authorization': `Bearer ${CLIENT_API_KEY}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Files list success!');
        console.log('📋 Current files/folders:');
        if (filesResponse.data.data) {
            filesResponse.data.data.forEach(item => {
                const type = item.attributes.is_file ? '📄' : '📁';
                console.log(`   ${type} ${item.attributes.name}`);
            });
        }
        console.log('');
        
        // Test 2: Try to create a folder using create-folder endpoint
        console.log('📁 Test 2: Create session folder...');
        
        try {
            const createFolderResponse = await axios({
                method: 'POST',
                url: `${PANEL_URL}/api/client/servers/${testServerUuid}/files/create-folder`,
                headers: {
                    'Authorization': `Bearer ${CLIENT_API_KEY}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                data: {
                    root: '/',
                    name: 'session'
                }
            });
            
            console.log('✅ Create folder success!');
            console.log('📋 Response:', JSON.stringify(createFolderResponse.data, null, 2));
            
        } catch (createError) {
            console.log('❌ Create folder failed:');
            console.log('📊 Status:', createError.response?.status);
            console.log('📋 Response:', JSON.stringify(createError.response?.data, null, 2));
            
            // Try alternative method - write file endpoint to create folder
            console.log('\n📁 Test 2b: Alternative - try write-file endpoint...');
            
            try {
                const writeResponse = await axios({
                    method: 'POST',
                    url: `${PANEL_URL}/api/client/servers/${testServerUuid}/files/write`,
                    headers: {
                        'Authorization': `Bearer ${CLIENT_API_KEY}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    data: {
                        root: '/',
                        files: [
                            {
                                name: 'session/README.txt',
                                content: 'Session folder created by bot\nCreated at: ' + new Date().toISOString()
                            }
                        ]
                    }
                });
                
                console.log('✅ Write file (create folder) success!');
                console.log('📋 Response:', JSON.stringify(writeResponse.data, null, 2));
                
            } catch (writeError) {
                console.log('❌ Write file also failed:');
                console.log('📊 Status:', writeError.response?.status);
                console.log('📋 Response:', JSON.stringify(writeError.response?.data, null, 2));
            }
        }
        
        // Test 3: Check files again to see if folder was created
        console.log('\n📁 Test 3: Check files after creation attempt...');
        const filesAfterResponse = await axios({
            method: 'GET',
            url: `${PANEL_URL}/api/client/servers/${testServerUuid}/files/list`,
            headers: {
                'Authorization': `Bearer ${CLIENT_API_KEY}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Files list after creation:');
        if (filesAfterResponse.data.data) {
            filesAfterResponse.data.data.forEach(item => {
                const type = item.attributes.is_file ? '📄' : '📁';
                const isNew = item.attributes.name === 'session' ? ' 🆕 NEW!' : '';
                console.log(`   ${type} ${item.attributes.name}${isNew}`);
            });
        }
        
    } catch (error) {
        console.error('❌ API Test failed:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
    }
}

// Test available endpoints
async function testEndpoints() {
    console.log('\n🔍 Testing available file management endpoints...\n');
    
    const endpoints = [
        { name: 'List Files', method: 'GET', path: `/api/client/servers/${testServerUuid}/files/list` },
        { name: 'Create Folder', method: 'POST', path: `/api/client/servers/${testServerUuid}/files/create-folder` },
        { name: 'Write Files', method: 'POST', path: `/api/client/servers/${testServerUuid}/files/write` },
        { name: 'Upload Files', method: 'POST', path: `/api/client/servers/${testServerUuid}/files/upload` },
        { name: 'Compress Files', method: 'POST', path: `/api/client/servers/${testServerUuid}/files/compress` },
        { name: 'Decompress Files', method: 'POST', path: `/api/client/servers/${testServerUuid}/files/decompress` }
    ];
    
    for (const endpoint of endpoints) {
        try {
            if (endpoint.method === 'GET') {
                const response = await axios({
                    method: endpoint.method,
                    url: `${PANEL_URL}${endpoint.path}`,
                    headers: {
                        'Authorization': `Bearer ${CLIENT_API_KEY}`,
                        'Accept': 'application/json'
                    }
                });
                console.log(`✅ ${endpoint.name}: Available (${response.status})`);
            } else {
                // For POST endpoints, just check if they exist (will likely fail due to missing data)
                console.log(`🔍 ${endpoint.name}: ${PANEL_URL}${endpoint.path}`);
            }
        } catch (error) {
            const status = error.response?.status;
            if (status === 404) {
                console.log(`❌ ${endpoint.name}: Not Found (404)`);
            } else if (status === 422) {
                console.log(`✅ ${endpoint.name}: Available but needs data (422)`);
            } else {
                console.log(`⚠️ ${endpoint.name}: Error ${status || 'Unknown'}`);
            }
        }
    }
}

async function main() {
    await testEndpoints();
    await testFileAPI();
    
    console.log('\n🎯 Summary:');
    console.log('If create-folder or write-file worked, then we can use API to create session folders!');
    console.log('Check panel web now: https://memek.tams.my.id/server/06d275e9-02ea-4f64-b779-c91bb810a6c0/files');
}

main().catch(console.error);
