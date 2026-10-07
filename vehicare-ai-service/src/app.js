import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import diagnosisRoutes from './routes/diagnosis.routes.js';
import { errorHandlerMiddleware } from './middleware/error.middleware.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api', healthRoutes);
app.use('/api', diagnosisRoutes);

app.use(errorHandlerMiddleware);

export default app;
