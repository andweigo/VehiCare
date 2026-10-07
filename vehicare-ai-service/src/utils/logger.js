const formatLog = (level, event, requestId, details = {}) => {
  const timestamp = new Date().toISOString();
  const reqStr = requestId ? ` [${requestId}]` : '';
  const detailStr = Object.keys(details).length > 0 ? ` ${JSON.stringify(details)}` : '';
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
