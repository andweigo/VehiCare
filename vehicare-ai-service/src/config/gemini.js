import { GoogleGenAI } from '@google/genai';
import config from './env.js';

let aiClientInstance = null;

export const getGeminiClient = () => {
  if (!aiClientInstance) {
    aiClientInstance = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
    });
  }
  return aiClientInstance;
};

export const getGeminiModelName = () => {
  return config.gemini.model;
};
