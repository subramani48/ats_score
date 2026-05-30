const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const result = await genAI.listModels();
        console.log('--- Available Models ---');
        result.models.forEach(model => {
            console.log(`Model: ${model.name} | Methods: ${model.supportedGenerationMethods.join(', ')}`);
        });
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
