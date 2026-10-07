import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

const requiredEnvVars = ['GEMINI_API_KEY', 'AI_SERVICE_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] || !process.env[envVar].trim()) {
    console.error(`[FATAL ERROR] Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY.trim(),
    model: (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim(),
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '25000', 10),
  },
  concurrency: {
    maxConcurrent: parseInt(process.env.AI_MAX_CONCURRENT_REQUESTS || '2', 10),
    maxQueueSize: parseInt(process.env.AI_MAX_QUEUE_SIZE || '20', 10),
    maxQueueWaitMs: parseInt(process.env.AI_MAX_QUEUE_WAIT_MS || '10000', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS || '20', 10),
  },
  cooldownMs: parseInt(process.env.AI_MODEL_COOLDOWN_MS || '30000', 10),
  cache: {
    generalTtlSeconds: parseInt(process.env.GENERAL_AI_CACHE_TTL_SECONDS || '86400', 10),
    diagnosticTtlSeconds: parseInt(process.env.DIAGNOSTIC_AI_CACHE_TTL_SECONDS || '21600', 10),
    repairGuideTtlSeconds: parseInt(process.env.REPAIR_GUIDE_CACHE_TTL_SECONDS || '86400', 10),
    maxEntries: parseInt(process.env.AI_CACHE_MAX_ENTRIES || '500', 10),
  },
  aiServiceSecret: process.env.AI_SERVICE_SECRET.trim(),
};

export default config;
