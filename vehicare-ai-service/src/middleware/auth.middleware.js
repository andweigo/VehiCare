import config from '../config/env.js';
import logger from '../utils/logger.js';

export const internalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const requestId = req.headers['x-request-id'] || req.body?.request_id || null;

  if (!authHeader.startsWith('Bearer ')) {
    logger.warn('AI_AUTH_FAILED', requestId, { reason: 'Missing Bearer prefix', ip: req.ip });
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header.',
      },
    });
  }

  const token = authHeader.substring(7).trim();

  if (token !== config.aiServiceSecret) {
    logger.warn('AI_AUTH_FAILED', requestId, { reason: 'Invalid secret token', ip: req.ip });
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid AI service authentication secret.',
      },
    });
  }

  next();
};
