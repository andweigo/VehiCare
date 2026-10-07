import app from './app.js';
import config from './config/env.js';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`[VehiCare AI Service] Running on http://127.0.0.1:${PORT}`);
  console.log(`[VehiCare AI Service] Gemini Model: ${config.gemini.model}`);
  console.log(`[VehiCare AI Service] Environment: ${config.nodeEnv}`);
});
