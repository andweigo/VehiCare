import logger from '../utils/logger.js';

class DedupService {
  constructor() {
    this.inFlightRequests = new Map();
  }

  has(cacheKey) {
    return this.inFlightRequests.has(cacheKey);
  }

  get(cacheKey) {
    return this.inFlightRequests.get(cacheKey);
  }

  async execute(cacheKey, fn, requestId) {
    if (this.inFlightRequests.has(cacheKey)) {
      logger.info('AI_INFLIGHT_HIT', requestId, { key: cacheKey });
      return await this.inFlightRequests.get(cacheKey);
    }

    const promise = (async () => {
      try {
        return await fn();
      } finally {
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, promise);
    return await promise;
  }

  clear() {
    this.inFlightRequests.clear();
  }
}

export const dedupService = new DedupService();
