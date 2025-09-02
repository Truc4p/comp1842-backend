require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Test Gemini API directly
async function testGeminiAPI() {
  try {
    console.log('🧪 Testing Gemini API...');
    console.log('API Key:', process.env.GEMINI_API_KEY ? 'Set ✅' : 'Missing ❌');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "You are a skincare expert. Recommend 2 products for oily skin in 50 words.";
    
    console.log('📤 Sending prompt to Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini Response:');
    console.log(text);
    
  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('💡 Try getting a new API key from: https://makersuite.google.com/app/apikey');
    }
  }
}

testGeminiAPI();
