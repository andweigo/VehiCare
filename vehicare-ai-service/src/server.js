import app from './app.js';
import config from './config/env.js';
import { queueService } from './services/queue.service.js';

const PORT = config.port;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[VehiCare AI Service] Running on http://${HOST}:${PORT}`);
  console.log(`[VehiCare AI Service] Gemini Model: ${config.gemini.model}`);
  console.log(`[VehiCare AI Service] Environment: ${config.nodeEnv}`);
  console.log(`[VehiCare AI Service] Concurrency: maxConcurrent=${config.concurrency.maxConcurrent}, maxQueueSize=${config.concurrency.maxQueueSize}, queueWaitTimeoutMs=${config.concurrency.maxQueueWaitMs}, maxPendingPerUser=${config.concurrency.maxPendingPerUser}`);
});

server.timeout = 88000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.on('error', (err) => {
  console.error('[FATAL ERROR] Server failed to start:', err?.message || err);
  process.exit(1);
});

let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[VehiCare AI Service] Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('[VehiCare AI Service] HTTP server closed. Draining queue...');
    try {
      await queueService.shutdown(8000);
      console.log('[VehiCare AI Service] Queue shutdown complete. Exiting cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('[VehiCare AI Service] Error during queue shutdown:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('[VehiCare AI Service] Graceful shutdown timeout reached. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
