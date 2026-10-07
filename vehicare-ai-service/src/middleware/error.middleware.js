import logger from '../utils/logger.js';

export const errorHandlerMiddleware = (err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || req.body?.request_id || null;

  logger.error('UNHANDLED_EXCEPTION', requestId, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.userMessage || 'An internal error occurred in the AI microservice.',
    },
  });
};
