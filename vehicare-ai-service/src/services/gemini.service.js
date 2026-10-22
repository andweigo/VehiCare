import fs from 'fs';
import os from 'os';
import path from 'path';
import config from '../config/env.js';
import { getGeminiClient } from '../config/gemini.js';
import logger from '../utils/logger.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const modelCooldowns = new Map();
const MAX_RETRIES = Math.max(0, Math.min(3, config.gemini.maxRetries || 0));

const makeError = (code, message, statusCode, retryable = false, cause = null) => {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  error.statusCode = statusCode;
  error.retryable = retryable;
  return error;
};

export const sanitizeErrorMessage = (msg) => {
  if (!msg) return 'Unknown error';
  let cleaned = String(msg)
    .replace(/AIza[0-9A-Za-z_-]{25,45}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/key=[^&\s]+/gi, 'key=[REDACTED]');

  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed?.error?.message) {
        cleaned = parsed.error.message;
      }
    } catch {}
  }

  const lower = cleaned.toLowerCase();
  if (lower.includes('api key not valid') || lower.includes('api_key_invalid')) {
    return 'Invalid Gemini API key configuration.';
  }
  if (lower.includes('quota exceeded') || lower.includes('resource_exhausted')) {
    return 'Gemini API quota exceeded for this model.';
  }
  if (lower.includes('high demand') || lower.includes('spikes in demand')) {
    return 'Gemini model is currently experiencing high demand.';
  }
  if (lower.includes('timed out') || lower.includes('deadline_exceeded')) {
    return 'Gemini request timed out.';
  }

  return cleaned.length > 200 ? `${cleaned.slice(0, 197)}...` : cleaned;
};

export const extractGeminiErrorInfo = (error) => {
  let status = Number(error?.status || error?.statusCode || 0);
  let code = error?.code || null;
  let rawMessage = typeof error?.message === 'string' ? error.message : String(error || '');
  let retryDelayMs = null;
  let details = null;

  if (rawMessage.startsWith('{') && rawMessage.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawMessage);
      if (parsed?.error) {
        status = Number(parsed.error.code || status || 0);
        code = parsed.error.status || code;
        if (parsed.error.message) rawMessage = parsed.error.message;
        details = parsed.error.details || null;
      }
    } catch {}
  }

  if (Array.isArray(details)) {
    const retryInfo = details.find(
      (d) => d?.['@type']?.includes('RetryInfo') || d?.retryDelay !== undefined
    );
    if (retryInfo?.retryDelay) {
      if (typeof retryInfo.retryDelay === 'string') {
        const match = retryInfo.retryDelay.match(/^([\d.]+)\s*s$/i);
        if (match) {
          retryDelayMs = Math.round(parseFloat(match[1]) * 1000);
        }
      } else if (typeof retryInfo.retryDelay === 'number') {
        retryDelayMs = Math.round(retryInfo.retryDelay * 1000);
      } else if (typeof retryInfo.retryDelay === 'object' && retryInfo.retryDelay.seconds) {
        retryDelayMs = (Number(retryInfo.retryDelay.seconds) || 0) * 1000;
      }
    }
  }

  const retryHeader = error?.response?.headers?.get?.('retry-after') || error?.headers?.['retry-after'];
  if (retryHeader && retryDelayMs === null) {
    const parsedHeader = Number(retryHeader);
    if (!isNaN(parsedHeader)) {
      retryDelayMs = parsedHeader * 1000;
    }
  }

  const lowerMsg = rawMessage.toLowerCase();
  const lowerCode = String(code || '').toLowerCase();

  const isRateLimit = status === 429 || lowerCode.includes('resource_exhausted') || lowerMsg.includes('resource_exhausted') || lowerMsg.includes('quota exceeded') || lowerMsg.includes('rate limit');
  const isOverloaded = status === 503 || lowerCode.includes('unavailable') || lowerMsg.includes('high demand') || lowerMsg.includes('temporarily unavailable') || lowerMsg.includes('overloaded');
  const isTimeout = status === 504 || status === 408 || lowerCode.includes('deadline_exceeded') || lowerCode.includes('gemini_timeout') || lowerCode.includes('etimedout') || lowerMsg.includes('timed out');
  const isModelNotFound = status === 404 || lowerCode.includes('not_found') || lowerMsg.includes('not found') || lowerMsg.includes('no longer available');
  const isAuthOrClient = !isModelNotFound && (status === 400 || status === 401 || status === 403 || lowerCode.includes('permission_denied') || lowerCode.includes('unauthenticated') || lowerCode.includes('invalid_argument') || lowerMsg.includes('api key not valid'));

  const isTransient = isRateLimit || isOverloaded || isTimeout || status === 500 || status === 502 || ['econnreset', 'eai_again', 'enotfound'].includes(lowerCode);

  return {
    status: status || (isRateLimit ? 429 : isOverloaded ? 503 : isTimeout ? 504 : 500),
    code: code || (isRateLimit ? 'RESOURCE_EXHAUSTED' : isOverloaded ? 'UNAVAILABLE' : isTimeout ? 'DEADLINE_EXCEEDED' : 'UNKNOWN'),
    message: sanitizeErrorMessage(rawMessage),
    retryDelayMs,
    isRateLimit,
    isOverloaded,
    isTimeout,
    isModelNotFound,
    isAuthOrClient,
    isTransient,
  };
};

const getStatusCode = (error) => {
  return extractGeminiErrorInfo(error).status;
};

const isTransientError = (error) => {
  return extractGeminiErrorInfo(error).isTransient;
};

const isModelUnavailableError = (error) => {
  return extractGeminiErrorInfo(error).isModelNotFound;
};

export const isModelInCooldown = (modelName) => {
  const expiry = modelCooldowns.get(modelName);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    modelCooldowns.delete(modelName);
    return false;
  }
  return true;
};

export const triggerModelCooldown = (modelName, requestId, reason = 'TRANSIENT', customDurationMs = null) => {
  const durationMs = customDurationMs
    ? Math.min(customDurationMs, 300000)
    : (config.cooldownMs || 15000);
  modelCooldowns.set(modelName, Date.now() + durationMs);
  logger.warn('AI_MODEL_COOLDOWN', requestId, { model: modelName, reason, cooldownMs: durationMs });
};

export const clearModelCooldown = (modelName) => modelCooldowns.delete(modelName);

export const clearAllModelCooldowns = () => modelCooldowns.clear();

const inferMediaType = (inputType, mimeType) => {
  const expectedType = inputType === 'voice' || inputType === 'audio'
    ? 'audio'
    : ['image', 'video'].includes(inputType)
      ? inputType
      : null;
  const mimeTypeKind = mimeType.startsWith('image/')
    ? 'image'
    : mimeType.startsWith('audio/')
      ? 'audio'
      : mimeType.startsWith('video/')
        ? 'video'
        : null;

  if (expectedType && mimeTypeKind && expectedType !== mimeTypeKind) {
    throw makeError('UNSUPPORTED_MEDIA_TYPE', `The uploaded media does not match the declared ${inputType} input type.`, 415);
  }
  return expectedType || mimeTypeKind || inputType;
};

const hasValidMediaSignature = (mediaType, mimeType, bytes) => {
  if (!bytes || bytes.length < 4) return false;
  const ascii = (start, end) => bytes.toString('ascii', start, end);
  const isFtyp = bytes.length >= 8 && ascii(4, 8) === 'ftyp';

  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/webp') return bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    return isFtyp && ['heic', 'heif', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(ascii(8, 12));
  }
  if (mediaType === 'video') return isFtyp;

  const isAac = bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0;
  const isMp3 = (bytes.length >= 3 && ascii(0, 3) === 'ID3') || (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  const isWav = bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE';
  const isOgg = bytes.length >= 4 && ascii(0, 4) === 'OggS';
  const isWebm = bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  const isAmr = bytes.length >= 6 && ascii(0, 6) === '#!AMR\n';

  if (mediaType === 'audio') {
    return isFtyp || isAac || isMp3 || isWav || isOgg || isWebm || isAmr;
  }
  return false;
};

export const isValidBase64 = (str) => {
  if (typeof str !== 'string' || str.length === 0 || str.length % 4 !== 0) {
    return false;
  }
  return /^[A-Za-z0-9+/]+={0,2}$/.test(str);
};

export const validateAndDecodeMedia = (mediaBase64, inputType, mediaMime) => {
  const declaredMimeType = String(mediaMime || '').trim().toLowerCase();
  const mimeAliases = {
    'audio/m4a': 'audio/mp4',
    'audio/mp3': 'audio/mpeg',
    'audio/x-m4a': 'audio/mp4',
    'image/jpg': 'image/jpeg',
  };
  const mimeType = mimeAliases[declaredMimeType] || declaredMimeType;
  const mediaType = inferMediaType(inputType, mimeType);
  const supportedMimes = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    audio: ['audio/aac', 'audio/amr', 'audio/3gpp', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-aac', 'audio/x-wav'],
    video: ['video/3gpp', 'video/mp4', 'video/quicktime', 'video/x-m4v'],
  };

  if (!supportedMimes[mediaType] || !supportedMimes[mediaType].includes(mimeType)) {
    throw makeError('UNSUPPORTED_MEDIA_TYPE', `The ${mediaType || 'uploaded'} media format is not supported.`, 415);
  }

  const cleanBase64 = String(mediaBase64)
    .replace(/^data:[^;]+;base64,/i, '')
    .trim();

  if (!cleanBase64 || !isValidBase64(cleanBase64)) {
    throw makeError('INVALID_MEDIA', 'The uploaded media is empty or unreadable.', 400);
  }

  let bytes;
  try {
    bytes = Buffer.from(cleanBase64, 'base64');
  } catch (error) {
    if (error instanceof RangeError) {
      throw makeError('MEDIA_TOO_LARGE', 'The uploaded media exceeds the supported memory limit.', 413, false, error);
    }
    throw makeError('INVALID_MEDIA', 'The uploaded media could not be decoded.', 400, false, error);
  }
  if (!bytes.length || !hasValidMediaSignature(mediaType, mimeType, bytes)) {
    throw makeError('INVALID_MEDIA', 'The uploaded media content is unreadable or does not match its declared format.', 400);
  }

  return {
    mediaType,
    mimeType,
    cleanBase64,
    bytes,
  };
};

const withTimeout = async (operation, timeoutMs, code, message) => {
  const controller = new AbortController();
  let timedOut = false;
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(makeError(code, message, 504, true));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } catch (error) {
    if (timedOut) {
      throw makeError(code, message, 504, true, error);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const uploadMedia = async ({ ai, bytes, mimeType, mediaType, requestId }) => {
  const uploadStartedAt = Date.now();
  const uploadTimeoutMs = config.gemini.mediaProcessingTimeoutMs;
  const ext = mimeType.includes('/') ? mimeType.split('/')[1].replace(/[^a-zA-Z0-9]/g, '') : 'tmp';
  const tempFilePath = path.join(os.tmpdir(), `vehicare_${requestId || Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`);

  let uploadedFile;
  try {
    await fs.promises.writeFile(tempFilePath, bytes);
    uploadedFile = await withTimeout(
      (abortSignal) => ai.files.upload({
        file: tempFilePath,
        config: {
          mimeType,
          displayName: `vehicare-${mediaType}-${requestId}`,
          abortSignal,
        },
      }),
      uploadTimeoutMs,
      'MEDIA_UPLOAD_TIMEOUT',
      'Gemini did not accept the uploaded media before the upload timed out.',
    );
  } catch (error) {
    logger.warn('AI_MEDIA_UPLOAD_FAILED', requestId, {
      mediaType,
      mimeType,
      error: error?.message || String(error),
    });
    if (error.code) throw error;
    throw makeError('MEDIA_UPLOAD_FAILED', 'Gemini could not accept the uploaded media.', 502, isTransientError(error), error);
  } finally {
    fs.promises.unlink(tempFilePath).catch(() => {});
  }

  logger.info('AI_MEDIA_UPLOADED', requestId, {
    mediaType,
    state: uploadedFile?.state || 'unknown',
    fileName: uploadedFile?.name || null,
    fileUri: uploadedFile?.uri || null,
    uploadDurationMs: Date.now() - uploadStartedAt,
  });

  if (!uploadedFile?.name) {
    throw makeError('MEDIA_UPLOAD_FAILED', 'Gemini did not return an uploaded media file.', 502, false);
  }

  try {
    const processDeadline = Date.now() + config.gemini.mediaProcessingTimeoutMs;
    let pollCount = 0;

    while (uploadedFile.state === 'PROCESSING' || uploadedFile.state === 'PENDING') {
      if (Date.now() >= processDeadline) {
        throw makeError('MEDIA_PROCESSING_TIMEOUT', 'Gemini could not process the uploaded media within the allowed time.', 504, true);
      }

      const waitMs = Math.min(
        config.gemini.mediaPollIntervalMs * (2 ** pollCount),
        10000,
        processDeadline - Date.now(),
      );
      await delay(Math.max(0, waitMs));
      pollCount++;

      try {
        uploadedFile = await withTimeout(
          (abortSignal) => ai.files.get({
            name: uploadedFile.name,
            config: {
              abortSignal,
            },
          }),
          Math.max(1000, processDeadline - Date.now()),
          'MEDIA_PROCESSING_TIMEOUT',
          'Gemini could not process the uploaded media within the allowed time.',
        );
      } catch (error) {
        if (error.code === 'MEDIA_PROCESSING_TIMEOUT') throw error;
        throw makeError(
          'MEDIA_PROCESSING_FAILED',
          'Gemini could not confirm that the uploaded media is ready.',
          502,
          isTransientError(error),
          error,
        );
      }

      logger.info('AI_MEDIA_PROCESSING_STATE', requestId, {
        mediaType,
        state: uploadedFile?.state || 'unknown',
        pollCount,
        processingDurationMs: Date.now() - uploadStartedAt,
      });
    }

    if (uploadedFile.state !== 'ACTIVE' && uploadedFile.state !== 'READY') {
      throw makeError('MEDIA_PROCESSING_FAILED', `Gemini media processing failed (state: ${uploadedFile.state || 'unknown'}).`, 502, false);
    }

    if (!uploadedFile.uri) {
      throw makeError('MEDIA_PROCESSING_FAILED', 'Gemini processed the media but did not return a usable file reference.', 502, false);
    }

    logger.info('AI_MEDIA_READY', requestId, {
      mediaType,
      state: uploadedFile.state,
      processingDurationMs: Date.now() - uploadStartedAt,
    });

    return uploadedFile;
  } catch (error) {
    await cleanupUploadedFile(ai, uploadedFile, requestId);
    throw error;
  }
};

const getGenerationTimeout = (mediaType) => (
  config.gemini.timeouts[mediaType] || config.gemini.timeouts.text
);

const cleanupUploadedFile = async (ai, uploadedFile, requestId) => {
  if (!uploadedFile?.name) return;
  try {
    await ai.files.delete({ name: uploadedFile.name });
    logger.info('AI_MEDIA_CLEANUP_COMPLETED', requestId, { fileName: uploadedFile.name });
  } catch (error) {
    logger.warn('AI_MEDIA_CLEANUP_FAILED', requestId, {
      fileName: uploadedFile.name,
      error: error?.message || String(error),
    });
  }
};

export const normalizeGeminiError = (error) => {
  if (error?.statusCode && error?.code && !error.message?.startsWith('{')) return error;

  const info = extractGeminiErrorInfo(error);

  if (info.isAuthOrClient) {
    const isKey = info.message.toLowerCase().includes('api key');
    return makeError(
      'GEMINI_AUTH_ERROR',
      isKey ? 'Gemini API authentication failed. Please verify your API key.' : 'Invalid request to Gemini API.',
      isKey ? 401 : 400,
      false,
      error
    );
  }

  if (info.isModelNotFound) {
    return makeError('GEMINI_MODEL_UNAVAILABLE', 'The requested Gemini model is unavailable or deprecated.', 503, false, error);
  }

  if (info.isRateLimit) {
    return makeError('GEMINI_RATE_LIMIT', 'Gemini is rate-limiting requests. Please try again shortly.', 429, true, error);
  }

  if (info.isOverloaded) {
    return makeError('GEMINI_OVERLOADED', 'Gemini is temporarily overloaded. Please try again shortly.', 503, true, error);
  }

  if (info.isTimeout) {
    return makeError('GEMINI_TIMEOUT', 'Gemini analysis timed out. Please try again.', 504, true, error);
  }

  if (info.isTransient) {
    return makeError('GEMINI_UNAVAILABLE', 'Gemini is temporarily unavailable. Please try again shortly.', 503, true, error);
  }

  return makeError('GEMINI_REQUEST_FAILED', 'Gemini could not complete the request.', 502, false, error);
};

let mockGeminiHandler = null;

export const __setMockCallGemini = (handler) => {
  mockGeminiHandler = handler;
};

export const __resetMockCallGemini = () => {
  mockGeminiHandler = null;
};

export const callGemini = async (params, client = null) => {
  if (typeof mockGeminiHandler === 'function') {
    return await mockGeminiHandler(params, client);
  }

  const {
    prompt,
    mediaBase64,
    mediaMime,
    requestId,
    requestType = 'diagnostic',
    inputType = 'text',
    startTime = Date.now(),
    totalBudgetMs = config.gemini.totalTimeoutMs || 24000,
  } = params || {};
  const ai = client || getGeminiClient();
  const isConversation = requestType === 'conversation' || requestType === 'general';
  const primaryModel = isConversation
    ? config.gemini.conversationModel
    : config.gemini.model;
  const fallbackModel = isConversation
    ? config.gemini.model
    : config.gemini.fallbackModel;

  const requestDeadline = startTime + totalBudgetMs;
  const maxOutputTokens = isConversation
    ? (config.gemini.maxOutputTokens?.conversation || 1024)
    : (config.gemini.maxOutputTokens?.diagnostic || 2048);

  const media = mediaBase64
    ? validateAndDecodeMedia(
      mediaBase64,
      inputType,
      mediaMime || (inputType === 'video' ? 'video/mp4' : ['voice', 'audio'].includes(inputType) ? 'audio/mp4' : 'image/jpeg'),
    )
    : null;
  const parts = [{ text: prompt }];
  let uploadedFile = null;

  const isInlineCandidate = Boolean(
    media && media.mediaType === 'image' && media.cleanBase64
  );

  logger.info('AI_GEMINI_MEDIA_REQUEST', requestId, {
    requestType,
    inputType,
    hasMedia: Boolean(media),
    mimeType: media?.mimeType || null,
    mediaSizeBytes: media?.bytes?.length || 0,
    uploadMethod: isInlineCandidate ? 'inline_data' : media ? 'gemini_files_api' : 'none',
  });

  try {
    if (isInlineCandidate && media?.cleanBase64) {
      parts.push({
        inlineData: {
          mimeType: media.mimeType,
          data: media.cleanBase64,
        },
      });
    } else if (media) {
      uploadedFile = await uploadMedia({
        ai,
        bytes: media.bytes,
        mimeType: media.mimeType,
        mediaType: media.mediaType,
        requestId,
      });
      parts.push({
        fileData: {
          mimeType: uploadedFile.mimeType || media.mimeType,
          fileUri: uploadedFile.uri,
        },
      });
    }

    const candidateModels = [];
    for (const modelName of [primaryModel, fallbackModel]) {
      if (modelName && !candidateModels.includes(modelName) && !isModelInCooldown(modelName)) {
        candidateModels.push(modelName);
      } else if (modelName && isModelInCooldown(modelName)) {
        logger.info('AI_SKIPPING_COOLDOWN_MODEL', requestId, { model: modelName });
      }
    }
    if (candidateModels.length === 0) {
      candidateModels.push(fallbackModel || primaryModel);
    }

    let lastError = null;

    for (let modelIndex = 0; modelIndex < candidateModels.length; modelIndex++) {
      const modelName = candidateModels[modelIndex];
      const fallbackUsed = modelName !== primaryModel;
      const hasNextModel = modelIndex < candidateModels.length - 1;

      const remainingOverallMs = requestDeadline - Date.now();
      if (remainingOverallMs < 2000) {
        logger.warn('AI_REQUEST_DEADLINE_APPROACHING', requestId, {
          remainingMs: remainingOverallMs,
          model: modelName,
        });
        break;
      }

      const defaultTimeout = fallbackUsed
        ? (config.gemini.timeouts.fallbackText || 9000)
        : (config.gemini.timeouts[media?.mediaType || 'text'] || config.gemini.timeouts.text);

      let timeoutMs;
      if (hasNextModel) {
        const reserveForNextMs = 8000;
        timeoutMs = Math.max(3000, Math.min(defaultTimeout, remainingOverallMs - reserveForNextMs));
      } else {
        timeoutMs = Math.max(2000, Math.min(defaultTimeout, remainingOverallMs - 1200));
      }

      const maxAttempts = fallbackUsed || media?.mediaType === 'audio' || media?.mediaType === 'video'
        ? 1
        : MAX_RETRIES + 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const generationStartedAt = Date.now();

        logger.info('AI_GEMINI_REQUEST_STARTED', requestId, {
          model: modelName,
          attempt,
          promptLength: prompt.length,
          requestType,
          inputType,
          hasMedia: Boolean(media),
          mediaMime: media?.mimeType || null,
          mediaSizeBytes: media?.bytes?.length || 0,
          generationTimeoutMs: timeoutMs,
          remainingBudgetMs: requestDeadline - Date.now(),
          fallbackUsed,
        });

        try {
          const response = await withTimeout(
            (abortSignal) => ai.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts }],
              config: {
                responseMimeType: 'application/json',
                maxOutputTokens,
                abortSignal,
                httpOptions: { timeout: timeoutMs },
              },
            }),
            timeoutMs,
            'GEMINI_TIMEOUT',
            `Gemini ${media?.mediaType || 'text'} analysis timed out. Please try again.`,
          );
          const textOutput = response?.text;

          if (!textOutput || !textOutput.trim()) {
            throw makeError('INVALID_AI_RESPONSE', 'Gemini returned an empty response.', 502, false);
          }

          clearModelCooldown(modelName);
          logger.info('AI_GEMINI_REQUEST_COMPLETED', requestId, {
            model: modelName,
            attempt,
            generationDurationMs: Date.now() - generationStartedAt,
            outputLength: textOutput.length,
            fallbackUsed,
          });

          return {
            text: textOutput,
            modelUsed: modelName,
            fallbackUsed,
            durationMs: Date.now() - generationStartedAt,
          };
        } catch (error) {
          const errInfo = extractGeminiErrorInfo(error);
          const normalizedError = normalizeGeminiError(error);
          lastError = normalizedError;

          logger.warn('AI_GEMINI_REQUEST_FAILED', requestId, {
            model: modelName,
            attempt,
            generationDurationMs: Date.now() - generationStartedAt,
            inputType,
            hasMedia: Boolean(media),
            errorCode: normalizedError.code,
            upstreamStatus: errInfo.status,
            geminiCode: errInfo.code,
            retryDelayMs: errInfo.retryDelayMs,
            errorMessage: errInfo.message,
          });

          if (errInfo.isAuthOrClient) {
            if (errInfo.code === 'API_KEY_INVALID' || errInfo.message.toLowerCase().includes('api key')) {
              throw normalizedError;
            }
            break;
          }

          if (errInfo.isModelNotFound) {
            triggerModelCooldown(modelName, requestId, 'MODEL_NOT_FOUND', 300000);
            break;
          }

          if (errInfo.isRateLimit && errInfo.retryDelayMs && errInfo.retryDelayMs > 4000) {
            triggerModelCooldown(modelName, requestId, 'QUOTA_EXHAUSTED', errInfo.retryDelayMs);
            break;
          }

          const canRetry = (attempt < maxAttempts) && (errInfo.isTransient || error?.retryable === true);
          if (canRetry) {
            let backoffMs;
            if (errInfo.retryDelayMs && errInfo.retryDelayMs <= 4000) {
              backoffMs = errInfo.retryDelayMs + Math.floor(Math.random() * 200);
            } else {
              const exp = Math.min(800 * (2 ** (attempt - 1)), 2500);
              const jitter = Math.floor(Math.random() * 300);
              backoffMs = exp + jitter;
            }

            if (Date.now() + backoffMs + 3000 < requestDeadline) {
              logger.info('AI_GEMINI_RETRY_BACKOFF', requestId, {
                model: modelName,
                attempt,
                nextAttempt: attempt + 1,
                backoffMs,
                errorCode: normalizedError.code,
              });
              await delay(backoffMs);
              continue;
            } else {
              logger.info('AI_GEMINI_RETRY_SKIPPED_TIME_BUDGET', requestId, {
                model: modelName,
                attempt,
                backoffMs,
                remainingBudgetMs: requestDeadline - Date.now(),
              });
            }
          }

          if (errInfo.isTransient) {
            triggerModelCooldown(modelName, requestId, 'TRANSIENT_FAILURE');
          }
          break;
        }
      }

      if (modelIndex < candidateModels.length - 1) {
        logger.info('AI_MODEL_FALLBACK', requestId, {
          failedModel: modelName,
          nextModel: candidateModels[modelIndex + 1],
          errorCode: lastError?.code,
          errorMessage: lastError?.message,
        });
      }
    }

    logger.error('AI_GEMINI_ALL_MODELS_FAILED', requestId, {
      attemptedModels: candidateModels,
      inputType,
      hasMedia: Boolean(media),
      errorCode: lastError?.code || 'GEMINI_UNAVAILABLE',
    });
    throw lastError || makeError('GEMINI_UNAVAILABLE', 'Gemini could not complete the request.', 503, true);
  } catch (error) {
    if (error?.code && error?.statusCode) throw error;
    throw makeError('GEMINI_REQUEST_FAILED', 'Gemini could not complete the request.', 502, false, error);
  } finally {
    await cleanupUploadedFile(ai, uploadedFile, requestId);
  }
};
