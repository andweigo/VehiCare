import config from '../config/env.js';
import { cacheService } from '../services/cache.service.js';
import { dedupService } from '../services/dedup.service.js';
import { queueService } from '../services/queue.service.js';

export const getHealthStatus = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'vehicare-ai-service',
    environment: config.nodeEnv,
    configured_model: config.gemini.model,
    timestamp: new Date().toISOString(),
  });
};

export const getReadinessStatus = (req, res) => {
  const stats = queueService.getStats();
  const isSaturated = stats.activeCount >= stats.maxConcurrent && stats.queueSize >= stats.maxQueueSize;
  const status = stats.isShuttingDown ? 'shutting_down' : isSaturated ? 'busy' : 'ready';
  const httpStatus = status === 'ready' ? 200 : 503;

  res.status(httpStatus).json({
    status,
    service: 'vehicare-ai-service',
    queue: {
      active: stats.activeCount,
      queued: stats.queueSize,
      max_concurrent: stats.maxConcurrent,
      max_queue_size: stats.maxQueueSize,
    },
    timestamp: new Date().toISOString(),
  });
};

export const getCacheStats = (req, res) => {
  res.status(200).json({
    status: 'ok',
    cache: cacheService.getStats(),
    in_flight: dedupService.getStats(),
    queue: queueService.getStats(),
    metrics: queueService.getMetrics(),
    timestamp: new Date().toISOString(),
  });
};

export const getQueueStats = (req, res) => {
  res.status(200).json({
    status: 'ok',
    queue: queueService.getStats(),
    metrics: queueService.getMetrics(),
    timestamp: new Date().toISOString(),
  });
};
