import rateLimit from 'express-rate-limit';
import config from '../config/env.js';
import logger from '../utils/logger.js';

export const diagnosisRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs || 60000,
  max: config.rateLimit.maxRequests || 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Prefer authenticated user ID if provided by Laravel context, fallback to IP
    const userId = req.body?.user_context?.id;
    if (userId) return `user_${userId}`;
    return req.ip || 'anonymous';
  },
  handler: (req, res) => {
    const requestId = req.headers['x-request-id'] || req.body?.request_id || null;
    logger.warn('AI_RATE_LIMITED', requestId, {
      ip: req.ip,
      userId: req.body?.user_context?.id || null,
      windowMs: config.rateLimit.windowMs,
      maxRequests: config.rateLimit.maxRequests,
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests to the AI infrastructure. Please try again shortly.',
      },
    });
  },
});

export const chatRateLimiter = diagnosisRateLimiter;
