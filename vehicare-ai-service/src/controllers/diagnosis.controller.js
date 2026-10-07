import { diagnosisInputSchema } from '../validators/diagnosis.validator.js';
import { processDiagnosisRequest } from '../services/diagnosis.service.js';
import logger from '../utils/logger.js';

export const handleDiagnosis = async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || req.body?.request_id || `req_${Date.now()}`;

  try {
    const parseResult = diagnosisInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      logger.warn('AI_INVALID_INPUT_SCHEMA', requestId, { errors: parseResult.error.format() });
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST_SCHEMA',
          message: 'Invalid diagnosis payload structure.',
          details: parseResult.error.errors,
        },
      });
    }

    const validatedPayload = parseResult.data;
    validatedPayload.request_id = requestId;

    const result = await processDiagnosisRequest(validatedPayload);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
