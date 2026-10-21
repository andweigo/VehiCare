export const sanitizeForLogging = (val) => {
  if (val === null || val === undefined) return val;

  if (typeof val === 'string') {
    return val
      .replace(/AIza[0-9A-Za-z_-]{25,45}/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/[A-Za-z0-9+/]{64,}={0,2}/g, '[REDACTED_BASE64_DATA]')
      .replace(/((?:api[_-]?key|secret|password|token)[=:\s]+["']?)([^&"'\s,]+)(["']?)/gi, '$1[REDACTED]$3');
  }

  if (Array.isArray(val)) {
    return val.map(sanitizeForLogging);
  }

  if (typeof val === 'object') {
    if (val instanceof Error) {
      return {
        name: val.name,
        message: sanitizeForLogging(val.message),
        code: val.code,
        stack: sanitizeForLogging(val.stack),
      };
    }

    const clean = {};
    for (const [key, prop] of Object.entries(val)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('apikey') ||
        lowerKey === 'authorization' ||
        lowerKey.includes('token')
      ) {
        clean[key] = '[REDACTED]';
      } else if (lowerKey.includes('base64') || lowerKey === 'media') {
        clean[key] = typeof prop === 'string'
          ? `[BASE64_DATA_LEN_${prop.length}]`
          : '[MEDIA_DATA]';
      } else {
        clean[key] = sanitizeForLogging(prop);
      }
    }
    return clean;
  }

  return val;
};

const formatLog = (level, event, requestId, details = {}) => {
  const timestamp = new Date().toISOString();
  const reqStr = requestId ? ` [${requestId}]` : '';
  const sanitizedDetails = sanitizeForLogging(details);
  const detailStr = sanitizedDetails && Object.keys(sanitizedDetails).length > 0
    ? ` ${JSON.stringify(sanitizedDetails)}`
    : '';
  return `[${timestamp}] [${level}]${reqStr} ${event}${detailStr}`;
};

export const logger = {
  info: (event, requestId, details) => {
    console.log(formatLog('INFO', event, requestId, details));
  },
  warn: (event, requestId, details) => {
    console.warn(formatLog('WARN', event, requestId, details));
  },
  error: (event, requestId, details) => {
    console.error(formatLog('ERROR', event, requestId, details));
  },
};

export default logger;
