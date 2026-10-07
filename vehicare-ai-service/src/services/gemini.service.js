import config from '../config/env.js';
import { getGeminiClient } from '../config/gemini.js';
import logger from '../utils/logger.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const modelCooldowns = new Map();

const isTransientError = (error) => {
  if (!error) return false;

  const msg = String(error.message || error).toLowerCase();
  const code = error.status || error.code;

  return (
    code === 503 ||
    code === 429 ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('high demand') ||
    msg.includes('temporarily') ||
    msg.includes('temporary') ||
    msg.includes('gemini_timeout') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
};

const isModelUnavailableError = (error) => {
  if (!error) return false;

  const msg = String(error.message || error).toLowerCase();
  const code = error.status || error.code;

  return (
    code === 404 ||
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('no longer available') ||
    msg.includes('model not found') ||
    msg.includes('not supported')
  );
};

const isModelInCooldown = (modelName) => {
  const expiry = modelCooldowns.get(modelName);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    modelCooldowns.delete(modelName);
    return false;
  }
  return true;
};

const triggerModelCooldown = (modelName, requestId) => {
  const cooldownMs = config.cooldownMs || 30000;
  modelCooldowns.set(modelName, Date.now() + cooldownMs);
  logger.warn('AI_MODEL_COOLDOWN', requestId, {
    model: modelName,
    cooldownMs,
  });
};

const clearModelCooldown = (modelName) => {
  modelCooldowns.delete(modelName);
};

export const callGemini = async ({
  prompt,
  mediaBase64,
  mediaMime,
  requestId,
  requestType = 'diagnostic',
}) => {
  const ai = getGeminiClient();
  const primaryModel = requestType === 'conversation' || requestType === 'general'
    ? 'gemini-3.5-flash-lite'
    : config.gemini.model || 'gemini-3.8-flash';

  const fallbackModel = 'gemini-3.5-flash-lite';

  // Build model candidate list avoiding duplicates and models in active cooldown
  const candidateModels = [];

  if (!isModelInCooldown(primaryModel)) {
    candidateModels.push(primaryModel);
  } else {
    logger.info('AI_SKIPPING_COOLDOWN_MODEL', requestId, { model: primaryModel });
  }

  if (primaryModel !== fallbackModel && !isModelInCooldown(fallbackModel)) {
    candidateModels.push(fallbackModel);
  }

  // Fallback default if all candidates are cooling down
  if (candidateModels.length === 0) {
    candidateModels.push(fallbackModel);
  }

  const parts = [{ text: prompt }];

  if (mediaBase64) {
    parts.push({
      inlineData: {
        mimeType: mediaMime || 'image/jpeg',
        data: mediaBase64.replace(/^data:[^;]+;base64,/i, '').trim(),
      },
    });
  }

  let lastError = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const modelName = candidateModels[mIdx];
    const isPrimary = mIdx === 0;

    // Primary gets up to 2 attempts (1 initial + 1 short retry). Fallback gets 1 attempt.
    const maxAttempts = isPrimary ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      logger.info('AI_GEMINI_REQUEST_STARTED', requestId, {
        model: modelName,
        attempt,
        promptLength: prompt.length,
        hasMedia: Boolean(mediaBase64),
        requestType,
      });

      const timeoutMs = config.gemini.timeoutMs || 25000;
      let timeoutId;

      const geminiPromise = ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        config: {
          maxOutputTokens: 4096,
        },
      });

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const err = new Error(`Gemini API request timed out after ${timeoutMs}ms for model ${modelName}`);
          err.code = 'GEMINI_TIMEOUT';
          reject(err);
        }, timeoutMs);
      });

      const startTime = Date.now();

      try {
        const response = await Promise.race([geminiPromise, timeoutPromise]);
        clearTimeout(timeoutId);

        const durationMs = Date.now() - startTime;
        const textOutput = response?.text;

        if (textOutput && textOutput.trim()) {
          clearModelCooldown(modelName);
          logger.info('AI_GEMINI_REQUEST_COMPLETED', requestId, {
            model: modelName,
            attempt,
            durationMs,
            outputLength: textOutput.length,
            fallbackUsed: !isPrimary,
          });

          return {
            text: textOutput,
            modelUsed: modelName,
            fallbackUsed: !isPrimary,
            durationMs,
          };
        }

        const emptyResponseError = new Error(`Gemini returned an empty response for model ${modelName}`);
        lastError = emptyResponseError;
        logger.warn('AI_GEMINI_EMPTY_RESPONSE', requestId, { model: modelName, attempt });
        break;
      } catch (error) {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        lastError = error;

        logger.warn('AI_GEMINI_REQUEST_FAILED', requestId, {
          model: modelName,
          attempt,
          durationMs,
          error: error?.message || String(error),
          code: error?.code,
          status: error?.status,
        });

        if (isModelUnavailableError(error)) {
          triggerModelCooldown(modelName, requestId);
          break;
        }

        if (attempt < maxAttempts && isTransientError(error)) {
          const backoffMs = 1200;
          logger.info('AI_GEMINI_RETRY_BACKOFF', requestId, {
            model: modelName,
            nextAttempt: attempt + 1,
            backoffMs,
          });
          await delay(backoffMs);
          continue;
        }

        if (isTransientError(error)) {
          triggerModelCooldown(modelName, requestId);
        }

        break;
      }
    }

    if (mIdx < candidateModels.length - 1) {
      logger.info('AI_MODEL_FALLBACK', requestId, {
        failedModel: modelName,
        nextModel: candidateModels[mIdx + 1],
      });
    }
  }

  logger.error('AI_GEMINI_ALL_MODELS_FAILED', requestId, {
    attemptedModels: candidateModels,
    error: lastError?.message || 'All Gemini model candidates failed',
  });

  throw lastError || new Error('Failed to obtain response from Gemini API');
};