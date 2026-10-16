import config from '../config/env.js';
import { cacheService } from '../services/cache.service.js';
import { dedupService } from '../services/dedup.service.js';

export const getHealthStatus = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'vehicare-ai-service',
    environment: config.nodeEnv,
    configured_model: config.gemini.model,
    timestamp: new Date().toISOString(),
  });
};

export const getCacheStats = (req, res) => {
  res.status(200).json({
    status: 'ok',
    cache: cacheService.getStats(),
    in_flight: dedupService.getStats(),
    timestamp: new Date().toISOString(),
  });
};
