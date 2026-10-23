import logger from '../utils/logger.js';

export const errorHandlerMiddleware = (err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || req.body?.request_id || null;
  const isPayloadTooLarge = err.type === 'entity.too.large' || err.code === 'MEDIA_TOO_LARGE';
  const isInvalidJson = err.type === 'entity.parse.failed' || err.code === 'INVALID_REQUEST_SCHEMA';
  const isRangeError = err instanceof RangeError;

  const statusCode = isPayloadTooLarge
    ? 413
    : isInvalidJson
      ? 400
      : err.statusCode || (
        err.code === 'QUEUE_FULL' || err.code === 'QUEUE_TIMEOUT'
          ? 429
          : isRangeError
            ? 400
            : 500
      );

  const errorCode = isPayloadTooLarge
    ? 'MEDIA_TOO_LARGE'
    : isInvalidJson
      ? 'INVALID_REQUEST_SCHEMA'
      : err.code || (isRangeError ? 'INVALID_MEDIA' : 'AI_SERVICE_UNAVAILABLE');

  const retryable = typeof err.retryable === 'boolean'
    ? err.retryable
    : isRangeError
      ? false
      : (statusCode === 429 || statusCode >= 500);

  let message = isPayloadTooLarge
    ? 'The request or attached media is too large to process.'
    : isInvalidJson
      ? 'The request body is not valid JSON.'
      : err.userMessage || (
        err.statusCode && err.code
          ? err.message
          : isRangeError
            ? 'The attached media or request input could not be processed.'
            : 'An internal error occurred in the AI microservice.'
      );

  if (typeof message === 'string' && message.startsWith('{') && message.endsWith('}')) {
    try {
      const parsed = JSON.parse(message);
      message = parsed?.error?.message || 'An error occurred while communicating with the AI model.';
    } catch {
      message = 'An error occurred while processing the AI request.';
    }
  }

  message = String(message)
    .replace(/AIza[0-9A-Za-z_-]{25,45}/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]')
    .replace(/Gemini/gi, 'VehiCare AI');

  const isOperational = statusCode < 500 || Boolean(err.statusCode && err.code);

  if (isOperational) {
    logger.warn('AI_HTTP_ERROR', requestId, {
      errorCode,
      errorMessage: err.message || String(err),
      statusCode,
      retryable,
    });
  } else {
    logger.error('UNHANDLED_EXCEPTION', requestId, {
      errorCode,
      errorMessage: err.message || String(err),
      statusCode,
      retryable,
      exception: err.constructor?.name || 'Error',
      stack: err.stack,
    });
  }

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
