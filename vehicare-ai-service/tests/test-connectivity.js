import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

if (!apiKey || !apiKey.trim()) {
  console.error('[TEST ERROR] Missing GEMINI_API_KEY in .env file.');
  process.exit(1);
}

console.log('--------------------------------------------------');
console.log('VehiCare AI - Gemini Connectivity Test');
console.log(`Configured Model: ${modelName}`);
console.log('--------------------------------------------------');

const ai = new GoogleGenAI({
  apiKey: apiKey.trim(),
});

try {
  const response = await ai.models.generateContent({
    model: modelName,
    contents: 'Respond with exactly: VehiCare AI connection successful',
  });

  console.log('[SUCCESS] Gemini API request succeeded!');
  console.log(`Model Used: ${modelName}`);
  console.log(`Response Text: ${response.text?.trim()}`);
  console.log('--------------------------------------------------');
} catch (error) {
  console.error('[FAILED] Gemini API request failed.');
  console.error(`Model Used: ${modelName}`);
  console.error(`Error Code: ${error.code || error.status || 'UNKNOWN'}`);
  console.error(`Error Message: ${error.message}`);
  console.log('--------------------------------------------------');
  process.exit(1);
}
