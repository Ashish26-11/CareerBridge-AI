require('dotenv').config();
const fetch = require('node-fetch');

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    console.log('🔍 Fetching available Gemini models...\n');
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            console.log('❌ Error:', JSON.stringify(data, null, 2));
            process.exit(1);
        }
        
        console.log('✅ Available models:\n');
        data.models.forEach(model => {
            console.log(`📦 ${model.name}`);
            console.log(`   Supports: ${model.supportedGenerationMethods?.join(', ')}`);
            console.log('');
        });
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

listModels();