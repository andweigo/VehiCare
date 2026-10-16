import { createHash } from 'crypto';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import {
  hashMedia,
  isContextDependentFollowUp,
  isRepairGuideIntent,
  normalizeText,
} from '../utils/symptom-normalizer.js';

class CacheService {
  constructor() {
    this.cache = new Map(); // JavaScript Map preserves insertion/access order for LRU
    this.maxEntries = config.cache.maxEntries;
    this.ttls = {
      conversation: config.cache.generalTtlSeconds * 1000,
      general: config.cache.generalTtlSeconds * 1000,
      diagnostic: config.cache.diagnosticTtlSeconds * 1000,
      repair: config.cache.repairGuideTtlSeconds * 1000,
    };
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      expirations: 0,
      bypasses: 0,
      errors: 0,
    };
  }

  /**
   * Produce a privacy-safe summary of a key for logging (no raw symptoms or private text).
   */
  safeKeySummary(key) {
    if (!key || typeof key !== 'string') return 'invalid-key';
    const parts = key.split(':');
    if (parts.length >= 6) {
      return `${parts.slice(0, 6).join(':')}:${key.slice(-8)}`;
    }
    return key.length > 24 ? `${key.slice(0, 16)}...${key.slice(-8)}` : key;
  }

  /**
   * Generate a deterministic, compact SHA-256 cache key.
   * Prevents raw user conversation/symptom text from leaking into cache keys or logs.
   * Returns null if the request is context-dependent without history or media is unhashable.
   */
  generateKey(params) {
    if (!params || typeof params !== 'object') {
      return null;
    }

    const {
      requestType = 'diagnostic',
      vehicleContext = {},
      symptoms = '',
      userLanguage = 'en',
      mediaBase64 = null,
      inputType = 'text',
      mediaMime = '',
      history = [],
      userContext = {},
      userId = null,
      historicalContext = {},
      diagnosticState = {},
      promptVersion = 'diagnosis-v2',
    } = params;

    // 1. Context-dependent follow-ups without conversation history must NOT be cached
    // to prevent cross-user context pollution (e.g. "What should I do next?").
    const hasHistory = Array.isArray(history) && history.length > 0;
    if (isContextDependentFollowUp(symptoms) && !hasHistory) {
      return null;
    }

    // 2. Media fingerprinting: if media input is declared, reliable hash is mandatory
    let mediaFingerprint = null;
    if (mediaBase64) {
      mediaFingerprint = hashMedia(mediaBase64);
      if (!mediaFingerprint) {
        // Corrupted, unreadable, or invalid media base64 cannot be safely identified
        return null;
      }
    }

    // 3. Classify intent (conversational, repair guidance, or diagnostic)
    const isRepair = isRepairGuideIntent(symptoms) || requestType === 'repair';
    const effectiveType = isRepair ? 'repair' : (requestType || 'diagnostic').toLowerCase().trim();

    // 4. Canonical vehicle descriptor
    const vType = (vehicleContext.type || 'vehicle').toLowerCase().trim();
    const vBrand = (vehicleContext.brand || 'unknown').toLowerCase().trim();
    const vModel = (vehicleContext.model || 'unknown').toLowerCase().trim();
    const vYear = String(vehicleContext.year || 'unknown').toLowerCase().trim();
    const vModelNumber = vehicleContext.model_number
      ? String(vehicleContext.model_number).toLowerCase().trim()
      : '';

    // 5. Normalized symptoms & language
    const normSymptoms = normalizeText(symptoms);
    const lang = (userLanguage || 'en').toLowerCase().trim();

    // 6. User scoping for personalized/conversational history
    let historyPart = null;
    if (hasHistory) {
      const resolvedUserId = userContext?.id ?? userId ?? null;
      const historyHash = createHash('sha256').update(JSON.stringify(history)).digest('hex');
      historyPart = `u${resolvedUserId || 'anon'}:${historyHash}`;
    }

    // 7. Canonical structured payload for hashing (scoped by subscription plan tier)
    const plan = (params.plan || params.entitlements?.plan || userContext?.plan || 'free').toLowerCase().trim();

    const canonicalPayload = {
      type: effectiveType,
      promptVersion,
      plan,
      vehicle: { vType, vBrand, vModel, vYear, vModelNumber },
      lang,
      symptoms: normSymptoms,
      media: mediaFingerprint
        ? { inputType: (inputType || 'image').toLowerCase(), mediaMime: (mediaMime || '').toLowerCase(), hash: mediaFingerprint }
        : null,
      history: historyPart,
      historicalContext: createHash('sha256').update(JSON.stringify(historicalContext || {})).digest('hex'),
      diagnosticState: createHash('sha256').update(JSON.stringify(diagnosticState || {})).digest('hex'),
    };

    const payloadHash = createHash('sha256')
      .update(JSON.stringify(canonicalPayload))
      .digest('hex');

    return `${effectiveType}:${plan}:${vType}:${vBrand}:${vModel}:${vYear}:${lang}:${payloadHash}`;
  }

  get(params, requestId) {
    try {
      const key = typeof params === 'string' ? params : this.generateKey(params);
      if (!key) {
        this.stats.bypasses++;
        logger.info('AI_CACHE_BYPASS', requestId, { reason: 'uneligible_or_context_dependent' });
        return null;
      }

      const item = this.cache.get(key);
      if (!item) {
        this.stats.misses++;
        logger.info('AI_CACHE_MISS', requestId, { key: this.safeKeySummary(key) });
        return null;
      }

      if (Date.now() > item.expiresAt) {
        this.cache.delete(key);
        this.stats.expirations++;
        logger.info('AI_CACHE_EXPIRED', requestId, { key: this.safeKeySummary(key) });
        return null;
      }

      // Refresh LRU order on hit
      this.cache.delete(key);
      this.cache.set(key, item);

      this.stats.hits++;
      logger.info('AI_CACHE_HIT', requestId, { key: this.safeKeySummary(key) });
      return item.data;
    } catch (err) {
      this.stats.errors++;
      logger.warn('AI_CACHE_GET_ERROR', requestId, { error: err.message });
      return null;
    }
  }

  delete(params) {
    const key = typeof params === 'string' ? params : this.generateKey(params);
    if (key) this.cache.delete(key);
  }

  set(params, diagnosisData, requestId) {
    try {
      // Only cache valid, successful, and complete responses
      if (!diagnosisData || typeof diagnosisData !== 'object') {
        return;
      }

      // Never cache temporary error, busy, or unvalidated responses
      if (
        diagnosisData.status === 'temporarily_busy' ||
        diagnosisData.status === 'failed' ||
        diagnosisData.status === 'error' ||
        diagnosisData.error
      ) {
        return;
      }

      // Do not cache clarification-needed states with insufficient confidence
      if (
        diagnosisData.confidence?.level === 'INSUFFICIENT' &&
        diagnosisData.status === 'needs_clarification'
      ) {
        return;
      }

      const key = typeof params === 'string' ? params : this.generateKey(params);
      if (!key) {
        return;
      }

      // Select TTL based on request/diagnosis intent
      let ttlMs = this.ttls.diagnostic;
      const symptomsText = typeof params === 'object' ? params.symptoms : '';
      if (
        (typeof params === 'object' && params.requestType === 'repair') ||
        diagnosisData.type === 'repair' ||
        isRepairGuideIntent(symptomsText)
      ) {
        ttlMs = this.ttls.repair;
      } else if (diagnosisData.type === 'conversation') {
        ttlMs = this.ttls.conversation;
      }

      // LRU eviction if maximum entries reached
      if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) {
          this.cache.delete(oldestKey);
          this.stats.evictions++;
          logger.info('AI_CACHE_EVICTED', requestId, { evictedKey: this.safeKeySummary(oldestKey) });
        }
      }

      this.cache.set(key, {
        data: diagnosisData,
        expiresAt: Date.now() + ttlMs,
      });

      this.stats.sets++;
      logger.info('AI_CACHE_SET', requestId, { key: this.safeKeySummary(key), ttlMs });
    } catch (err) {
      this.stats.errors++;
      logger.warn('AI_CACHE_SET_ERROR', requestId, { error: err.message });
    }
  }

  has(params) {
    try {
      const key = typeof params === 'string' ? params : this.generateKey(params);
      if (!key) return false;
      const item = this.cache.get(key);
      if (!item) return false;
      if (Date.now() > item.expiresAt) {
        this.cache.delete(key);
        this.stats.expirations++;
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
      bypasses: this.stats.bypasses,
      errors: this.stats.errors,
      entryCount: this.cache.size,
      maxEntries: this.maxEntries,
      hitRate: totalRequests > 0 ? Number((this.stats.hits / totalRequests).toFixed(4)) : 0,
    };
  }

  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      expirations: 0,
      bypasses: 0,
      errors: 0,
    };
  }
}

export const cacheService = new CacheService();
