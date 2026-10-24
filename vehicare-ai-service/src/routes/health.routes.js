import { Router } from 'express';
import {
  getHealthStatus,
  getReadinessStatus,
  getCacheStats,
  getQueueStats,
} from '../controllers/health.controller.js';
import { internalAuthMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/health', getHealthStatus);
router.get('/health/ready', getReadinessStatus);
router.get('/cache/stats', internalAuthMiddleware, getCacheStats);
router.get('/queue/stats', internalAuthMiddleware, getQueueStats);

export default router;
