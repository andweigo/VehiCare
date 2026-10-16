import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import diagnosisRoutes from './routes/diagnosis.routes.js';
import { errorHandlerMiddleware } from './middleware/error.middleware.js';

import logger from './utils/logger.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || null;

  logger.info('HTTP_REQUEST_STARTED', requestId, {
    method: req.method,
    path: req.path,
  });

  res.on('finish', () => {
    logger.info('HTTP_REQUEST_FINISHED', requestId, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
});

app.use('/api', healthRoutes);
app.use('/api', diagnosisRoutes);

app.use(errorHandlerMiddleware);

export default app;
