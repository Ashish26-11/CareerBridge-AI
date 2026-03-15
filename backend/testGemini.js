require('dotenv').config();
const fetch = require('node-fetch');

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    console.log('🔍 Testing Gemini API...\n');
    console.log('API Key present:', apiKey ? '✅ Yes' : '❌ No');
    
    if (!apiKey) {
        console.log('\n❌ No API key found in .env file!');
        process.exit(1);
    }

    try {
        console.log('\n📡 Making request to Gemini API...');
        
        // ✅ Changed to gemini-2.5-flash
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Say "Hello from Gemini!" in JSON format: {"message": "your response"}'
                        }]
                    }]
                })
            }
        );

        console.log('Response status:', response.status, response.statusText);
        
        const data = await response.json();
        
        if (!response.ok) {
            console.log('\n❌ API Error Response:');
            console.log(JSON.stringify(data, null, 2));
            process.exit(1);
        }

        console.log('\n✅ SUCCESS! Gemini is working!\n');
        console.log('Response:', JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.log('\n❌ Error:', error.message);
        process.exit(1);
    }
}

testGemini();