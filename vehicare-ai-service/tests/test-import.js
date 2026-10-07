import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'test-key',
});

console.log('Google Gen AI SDK loaded successfully');
