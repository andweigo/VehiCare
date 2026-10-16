import app from './app.js';
import config from './config/env.js';

const PORT = config.port;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[VehiCare AI Service] Running on http://${HOST}:${PORT}`);
  console.log(`[VehiCare AI Service] Gemini Model: ${config.gemini.model}`);
  console.log(`[VehiCare AI Service] Environment: ${config.nodeEnv}`);
});

server.on('error', (err) => {
  console.error('[FATAL ERROR] Server failed to start:', err?.message || err);
  process.exit(1);
});

