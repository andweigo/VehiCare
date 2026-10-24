import { diagnosisInputSchema, sanitizeDiagnosisPayload } from '../validators/diagnosis.validator.js';
import { processDiagnosisRequest } from '../services/diagnosis.service.js';
import logger from '../utils/logger.js';

export const handleDiagnosis = async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || req.body?.request_id || `req_${Date.now()}`;

  const clientAbortController = new AbortController();
  req.on('close', () => {
    if (!res.writableEnded && !res.headersSent) {
      clientAbortController.abort();
    }
  });

  try {
    const parseResult = diagnosisInputSchema.safeParse(sanitizeDiagnosisPayload(req.body));

    if (!parseResult.success) {
      const details = parseResult.error.issues.map(({ code, path, message }) => ({
        code,
        path,
        message,
      }));
      logger.warn('AI_INVALID_INPUT_SCHEMA', requestId, { details });
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST_SCHEMA',
          message: 'Invalid diagnosis payload structure.',
          details,
        },
      });
    }

    const validatedPayload = parseResult.data;
    validatedPayload.request_id = requestId;
    validatedPayload.clientSignal = clientAbortController.signal;

    const result = await processDiagnosisRequest(validatedPayload);

    if (res.writableEnded || res.headersSent) {
      return;
    }

    return res.status(200).json(result);
  } catch (error) {
    if (clientAbortController.signal.aborted || res.writableEnded || res.headersSent) {
      logger.info('AI_REQUEST_ABORTED_BY_CLIENT', requestId);
      return;
    }
    next(error);
  }
};
