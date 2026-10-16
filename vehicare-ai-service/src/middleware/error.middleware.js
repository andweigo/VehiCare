import logger from '../utils/logger.js';

export const errorHandlerMiddleware = (err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || req.body?.request_id || null;
  const isPayloadTooLarge = err.type === 'entity.too.large';
  const isInvalidJson = err.type === 'entity.parse.failed';
  const statusCode = isPayloadTooLarge
    ? 413
    : isInvalidJson
      ? 400
      : err.statusCode || (err.code === 'QUEUE_FULL' || err.code === 'QUEUE_TIMEOUT' ? 429 : 500);
  const errorCode = isPayloadTooLarge
    ? 'MEDIA_TOO_LARGE'
    : isInvalidJson
      ? 'INVALID_REQUEST_SCHEMA'
      : err.code || 'AI_SERVICE_UNAVAILABLE';
  const retryable = typeof err.retryable === 'boolean'
    ? err.retryable
    : statusCode === 429 || statusCode >= 500;
  const message = isPayloadTooLarge
    ? 'The request or attached media is too large to process.'
    : isInvalidJson
      ? 'The request body is not valid JSON.'
      : err.userMessage || (
        err.statusCode && err.code
          ? err.message
          : 'An internal error occurred in the AI microservice.'
      );

  logger.error('UNHANDLED_EXCEPTION', requestId, {
    errorCode,
    statusCode,
    retryable,
    exception: err.constructor?.name || 'Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      retryable,
      request_id: requestId,
    },
  });
};
