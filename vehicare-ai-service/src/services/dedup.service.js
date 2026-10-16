import logger from '../utils/logger.js';

class DedupService {
  constructor() {
    this.inFlightRequests = new Map();
    this.inFlightHits = 0;
  }

  safeKeySummary(key) {
    if (!key || typeof key !== 'string') return 'invalid-key';
    const parts = key.split(':');
    if (parts.length >= 6) {
      return `${parts.slice(0, 6).join(':')}:${key.slice(-8)}`;
    }
    return key.length > 24 ? `${key.slice(0, 16)}...${key.slice(-8)}` : key;
  }

  has(cacheKey) {
    if (!cacheKey) return false;
    return this.inFlightRequests.has(cacheKey);
  }

  get(cacheKey) {
    if (!cacheKey) return undefined;
    return this.inFlightRequests.get(cacheKey);
  }

  async execute(cacheKey, fn, requestId) {
    // If no valid cache key (e.g. uncacheable / context-dependent request), execute without sharing
    if (!cacheKey) {
      return await fn();
    }

    if (this.inFlightRequests.has(cacheKey)) {
      this.inFlightHits++;
      logger.info('AI_INFLIGHT_HIT', requestId, { key: this.safeKeySummary(cacheKey) });
      return await this.inFlightRequests.get(cacheKey);
    }

    const promise = (async () => {
      try {
        return await fn();
      } finally {
        // Guaranteed cleanup: removes promise whether it succeeds or rejects
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, promise);
    return await promise;
  }

  getStats() {
    return {
      activeInFlightCount: this.inFlightRequests.size,
      totalInFlightHits: this.inFlightHits,
    };
  }

  clear() {
    this.inFlightRequests.clear();
    this.inFlightHits = 0;
  }
}

export const dedupService = new DedupService();
