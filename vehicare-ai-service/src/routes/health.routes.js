import { Router } from 'express';
import { getHealthStatus, getCacheStats } from '../controllers/health.controller.js';
import { internalAuthMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/health', getHealthStatus);
router.get('/cache/stats', internalAuthMiddleware, getCacheStats);

export default router;
