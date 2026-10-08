import config from '../config/env.js';
import logger from '../utils/logger.js';
import { hashMedia, normalizeText } from '../utils/symptom-normalizer.js';

class CacheService {
  constructor() {
    this.cache = new Map(); // Map maintains insertion/update order for LRU
    this.maxEntries = config.cache.maxEntries;
    this.ttls = {
      conversation: config.cache.generalTtlSeconds * 1000,
      general: config.cache.generalTtlSeconds * 1000,
      diagnostic: config.cache.diagnosticTtlSeconds * 1000,
      repair: config.cache.repairGuideTtlSeconds * 1000,
    };
  }

  generateKey({ requestType = 'diagnostic', vehicleContext = {}, symptoms = '', userLanguage = 'en', mediaBase64 = null, inputType = 'text', mediaMime = '' }) {
    const normSymptoms = normalizeText(symptoms);
    const vType = (vehicleContext.type || 'vehicle').toLowerCase().trim();
    const vBrand = (vehicleContext.brand || 'unknown').toLowerCase().trim();
    const vModel = (vehicleContext.model || 'unknown').toLowerCase().trim();
    const vYear = String(vehicleContext.year || 'unknown').toLowerCase().trim();
    const lang = (userLanguage || 'en').toLowerCase().trim();
    const type = (requestType || 'diagnostic').toLowerCase().trim();

    const mediaKey = mediaBase64 ? hashMedia(mediaBase64) : null;
    const mediaPart = mediaKey ? `:media-${inputType}-${mediaMime}-${mediaKey}` : '';

    return `${type}:${vType}:${vBrand}:${vModel}:${vYear}:${lang}:${normSymptoms}${mediaPart}`;
  }

  get(params, requestId) {
    const key = typeof params === 'string' ? params : this.generateKey(params);
    if (!key) return null;

    const item = this.cache.get(key);
    if (!item) {
      logger.info('AI_CACHE_MISS', requestId, { key });
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      logger.info('AI_CACHE_EXPIRED', requestId, { key });
      return null;
    }

    // Refresh LRU order on hit
    this.cache.delete(key);
    this.cache.set(key, item);

    logger.info('AI_CACHE_HIT', requestId, { key });
    return item.data;
  }

  set(params, diagnosisData, requestId) {
    // Only cache valid, successful responses
    if (!diagnosisData || typeof diagnosisData !== 'object') {
      return;
    }

    // Do not cache temporary error/fallback responses
    if (diagnosisData.status === 'temporarily_busy' || diagnosisData.confidence?.level === 'INSUFFICIENT' && diagnosisData.status === 'needs_clarification') {
      return;
    }

    const key = typeof params === 'string' ? params : this.generateKey(params);
    if (!key) return;

    const intentType = (diagnosisData.type || 'diagnostic').toLowerCase();
    const ttlMs = this.ttls[intentType] || this.ttls.diagnostic;

    // LRU eviction if full
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        logger.info('AI_CACHE_EVICTED', requestId, { evictedKey: oldestKey });
      }
    }

    this.cache.set(key, {
      data: diagnosisData,
      expiresAt: Date.now() + ttlMs,
    });

    logger.info('AI_CACHE_SET', requestId, { key, ttlMs });
  }

  has(params) {
    const key = typeof params === 'string' ? params : this.generateKey(params);
    if (!key) return false;
    const item = this.cache.get(key);
    if (!item) return false;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  clear() {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
