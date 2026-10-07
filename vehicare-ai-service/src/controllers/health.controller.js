import config from '../config/env.js';

export const getHealthStatus = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'vehicare-ai-service',
    environment: config.nodeEnv,
    configured_model: config.gemini.model,
    timestamp: new Date().toISOString(),
  });
};
