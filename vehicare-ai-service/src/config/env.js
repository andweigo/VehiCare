import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

const readInteger = (name, fallback, minimum = 1) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
};

const requiredEnvVars = ['GEMINI_API_KEY', 'AI_SERVICE_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] || !process.env[envVar].trim()) {
    console.error(`[FATAL ERROR] Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Validate concurrency settings if explicitly provided
if (process.env.AI_MAX_CONCURRENT_REQUESTS !== undefined) {
  const val = Number.parseInt(process.env.AI_MAX_CONCURRENT_REQUESTS, 10);
  if (!Number.isFinite(val) || val < 1 || val > 50) {
    console.error(`[FATAL ERROR] Invalid AI_MAX_CONCURRENT_REQUESTS: must be an integer between 1 and 50. Received: "${process.env.AI_MAX_CONCURRENT_REQUESTS}"`);
    process.exit(1);
  }
}

if (process.env.AI_MAX_QUEUE_SIZE !== undefined) {
  const val = Number.parseInt(process.env.AI_MAX_QUEUE_SIZE, 10);
  if (!Number.isFinite(val) || val < 1 || val > 200) {
    console.error(`[FATAL ERROR] Invalid AI_MAX_QUEUE_SIZE: must be an integer between 1 and 200. Received: "${process.env.AI_MAX_QUEUE_SIZE}"`);
    process.exit(1);
  }
}

const rawQueueWait = process.env.AI_QUEUE_WAIT_TIMEOUT_MS || process.env.AI_MAX_QUEUE_WAIT_MS;
if (rawQueueWait !== undefined) {
  const val = Number.parseInt(rawQueueWait, 10);
  if (!Number.isFinite(val) || val < 1000 || val > 120000) {
    console.error(`[FATAL ERROR] Invalid AI_QUEUE_WAIT_TIMEOUT_MS: must be an integer between 1000 and 120000 ms. Received: "${rawQueueWait}"`);
    process.exit(1);
  }
}

if (process.env.AI_MAX_PENDING_PER_USER !== undefined) {
  const val = Number.parseInt(process.env.AI_MAX_PENDING_PER_USER, 10);
  if (!Number.isFinite(val) || val < 1 || val > 20) {
    console.error(`[FATAL ERROR] Invalid AI_MAX_PENDING_PER_USER: must be an integer between 1 and 20. Received: "${process.env.AI_MAX_PENDING_PER_USER}"`);
    process.exit(1);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY.trim(),
    model: (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim(),
    fallbackModel: (process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite').trim(),
    conversationModel: (process.env.GEMINI_CONVERSATION_MODEL || process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim(),
    timeoutMs: readInteger('GEMINI_TIMEOUT_MS', 28000),
    totalTimeoutMs: readInteger('AI_TOTAL_TIMEOUT_MS', readInteger('GEMINI_TIMEOUT_MS', 28000)),
    totalTimeouts: {
      text: readInteger('AI_TOTAL_TEXT_TIMEOUT_MS', readInteger('AI_TOTAL_TIMEOUT_MS', 28000)),
      image: readInteger('AI_TOTAL_IMAGE_TIMEOUT_MS', 42000),
      audio: readInteger('AI_TOTAL_AUDIO_TIMEOUT_MS', 60000),
      video: readInteger('AI_TOTAL_VIDEO_TIMEOUT_MS', 75000),
    },
    timeouts: {
      text: readInteger('AI_PRIMARY_TEXT_TIMEOUT', readInteger('AI_TEXT_TIMEOUT', 13500)),
      fallbackText: readInteger('AI_FALLBACK_TEXT_TIMEOUT', 10500),
      image: readInteger('AI_IMAGE_TIMEOUT', 22000),
      fallbackImage: readInteger('AI_FALLBACK_IMAGE_TIMEOUT', 15000),
      audio: readInteger('AI_AUDIO_TIMEOUT', 28000),
      fallbackAudio: readInteger('AI_FALLBACK_AUDIO_TIMEOUT', 16000),
      video: readInteger('AI_VIDEO_TIMEOUT', 38000),
      fallbackVideo: readInteger('AI_FALLBACK_VIDEO_TIMEOUT', 18000),
    },
    maxOutputTokens: {
      diagnostic: readInteger('AI_MAX_OUTPUT_TOKENS_DIAGNOSTIC', 4096),
      conversation: readInteger('AI_MAX_OUTPUT_TOKENS_CONVERSATION', 1024),
    },
    mediaProcessingTimeoutMs: readInteger('AI_MEDIA_PROCESSING_TIMEOUT', 35000),
    mediaPollIntervalMs: readInteger('AI_MEDIA_POLL_INTERVAL', 1500),
    maxRetries: readInteger('AI_MAX_RETRIES', 1, 0),
  },
  concurrency: {
    maxConcurrent: readInteger('AI_MAX_CONCURRENT_REQUESTS', 3, 1),
    maxQueueSize: readInteger('AI_MAX_QUEUE_SIZE', 25, 1),
    maxQueueWaitMs: readInteger('AI_QUEUE_WAIT_TIMEOUT_MS', readInteger('AI_MAX_QUEUE_WAIT_MS', 25000, 1000), 1000),
    maxPendingPerUser: readInteger('AI_MAX_PENDING_PER_USER', 2, 1),
  },
  rateLimit: {
    windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS || '20', 10),
  },
  cooldownMs: parseInt(process.env.AI_MODEL_COOLDOWN_MS || '15000', 10),
  cache: {
    generalTtlSeconds: parseInt(process.env.GENERAL_AI_CACHE_TTL_SECONDS || '86400', 10),
    diagnosticTtlSeconds: parseInt(process.env.DIAGNOSTIC_AI_CACHE_TTL_SECONDS || '21600', 10),
    repairGuideTtlSeconds: parseInt(process.env.REPAIR_GUIDE_CACHE_TTL_SECONDS || '86400', 10),
    maxEntries: parseInt(process.env.AI_CACHE_MAX_ENTRIES || '500', 10),
  },
  aiServiceSecret: process.env.AI_SERVICE_SECRET.trim(),
};

export default config;
