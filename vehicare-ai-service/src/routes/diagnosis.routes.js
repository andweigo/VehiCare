import { Router } from 'express';
import { handleDiagnosis } from '../controllers/diagnosis.controller.js';
import { internalAuthMiddleware } from '../middleware/auth.middleware.js';
import { diagnosisRateLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();

router.post('/diagnosis', diagnosisRateLimiter, internalAuthMiddleware, handleDiagnosis);

export default router;
