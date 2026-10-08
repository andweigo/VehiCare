import { getGeminiModelName } from '../config/gemini.js';
import { buildDiagnosisPrompt, isGeneralQuestion } from '../prompts/diagnosis.prompt.js';
import { applySafetyRules } from '../safety/diagnosis-safety.js';
import logger from '../utils/logger.js';
import { parseAndCleanJson } from '../utils/response-parser.js';
import { conversationOutputSchema, diagnosticOutputSchema } from '../validators/response.validator.js';
import { cacheService } from './cache.service.js';
import { dedupService } from './dedup.service.js';
import { callGemini } from './gemini.service.js';
import { queueService } from './queue.service.js';

export const processDiagnosisRequest = async (payload) => {
  const startTime = Date.now();
  const { request_id: requestId, user_context: userContext, vehicle_context: vehicleContext, diagnosis } = payload;
  const { symptoms, input_type: inputType, media_base64: mediaBase64, media_mime: mediaMime, history } = diagnosis;
  const language = userContext?.language || 'en';

  const isGeneral = !mediaBase64 && isGeneralQuestion(symptoms);
  const requestType = isGeneral ? 'conversation' : 'diagnostic';

  logger.info('AI_REQUEST_RECEIVED', requestId, {
    vehicle: `${vehicleContext.brand} ${vehicleContext.model}`,
    inputType,
    requestType,
    symptomsLength: symptoms ? symptoms.length : 0,
    hasMedia: Boolean(mediaBase64),
    mediaMime,
  });

  // 1. Generate Cache Key
  const cacheKeyParams = {
    requestType,
    vehicleContext,
    symptoms,
    userLanguage: language,
    mediaBase64,
    inputType,
    mediaMime,
  };
  const cacheKey = cacheService.generateKey(cacheKeyParams);

  // 2. CACHE LOOKUP - Must be checked first. A hit NEVER calls Gemini or enters queue.
  const cachedResult = cacheService.get(cacheKey, requestId);
  if (cachedResult) {
    const totalDurationMs = Date.now() - startTime;
    logger.info('AI_REQUEST_COMPLETED', requestId, {
      cacheHit: true,
      inFlightHit: false,
      queueWaitMs: 0,
      geminiDurationMs: 0,
      totalDurationMs,
      model: 'cache',
      fallbackUsed: false,
    });

    return {
      success: true,
      ai_source: 'cache',
      model: getGeminiModelName(),
      diagnosis: cachedResult,
    };
  }

  // 3. IN-FLIGHT DEDUPLICATION LOOKUP
  if (dedupService.has(cacheKey)) {
    logger.info('AI_INFLIGHT_HIT', requestId, { key: cacheKey });
    const dedupStartTime = Date.now();
    try {
      const result = await dedupService.get(cacheKey);
      const totalDurationMs = Date.now() - startTime;
      logger.info('AI_REQUEST_COMPLETED', requestId, {
        cacheHit: false,
        inFlightHit: true,
        queueWaitMs: 0,
        geminiDurationMs: Date.now() - dedupStartTime,
        totalDurationMs,
        model: result?.model || getGeminiModelName(),
        fallbackUsed: false,
      });
      return result;
    } catch (err) {
      // If shared promise failed, fall through to main pipeline
      logger.warn('AI_INFLIGHT_FAILED_RETRYING', requestId, { error: err.message });
    }
  }

  // 4. EXECUTE PIPELINE WITH DEDUPLICATION & CONCURRENCY QUEUE
  return await dedupService.execute(cacheKey, async () => {
    // Re-check cache inside deduplicated executor
    const recheckedCache = cacheService.get(cacheKey, requestId);
    if (recheckedCache) {
      return {
        success: true,
        ai_source: 'cache',
        model: getGeminiModelName(),
        diagnosis: recheckedCache,
      };
    }

    const queueEnterTime = Date.now();

    try {
      // 5. Enter Concurrency Queue
      const geminiResult = await queueService.enqueue(async () => {
        const queueWaitMs = Date.now() - queueEnterTime;
        // 6. Build Prompt
        const prompt = buildDiagnosisPrompt({
          vehicleContext,
          symptoms,
          userLanguage: language,
          history,
          hasMedia: Boolean(mediaBase64),
          inputType,
          mediaMime,
        });

        // 7. Call Gemini API
        const response = await callGemini({
          prompt,
          mediaBase64,
          mediaMime,
          requestId,
          requestType,
          inputType,
        });

        return { response, queueWaitMs };
      }, requestId, requestType);

      const { response: geminiResponse, queueWaitMs } = geminiResult;
      const rawResponseText = geminiResponse.text;
      const modelUsed = geminiResponse.modelUsed;
      const fallbackUsed = geminiResponse.fallbackUsed;
      const geminiDurationMs = geminiResponse.durationMs;

      // 8. Parse JSON Output
      const jsonObject = parseAndCleanJson(rawResponseText);

      if (!jsonObject) {
        logger.warn('AI_JSON_PARSE_FAILED', requestId, { rawResponsePreview: (rawResponseText || '').substring(0, 200) });
        const fallbackData = applySafetyRules(
          generateFallbackResponse(vehicleContext, symptoms, language),
          symptoms
        );
        return {
          success: true,
          ai_source: 'fallback',
          model: modelUsed,
          diagnosis: fallbackData,
        };
      }

      const type = (jsonObject.type || requestType).toLowerCase();

      // 9. Validate & Normalize Output
      let finalDiagnosisData = null;

      if (type === 'conversation') {
        const parsedConversation = conversationOutputSchema.safeParse(jsonObject);
        finalDiagnosisData = parsedConversation.success ? parsedConversation.data : {
          type: 'conversation',
          status: 'conversation',
          response: jsonObject.response || jsonObject.summary || 'I am ready to assist with your vehicle.',
        };
      } else {
        const parsedDiagnostic = diagnosticOutputSchema.safeParse(jsonObject);
        let diagnosticData = parsedDiagnostic.success ? parsedDiagnostic.data : jsonObject;

        diagnosticData.confidence = normalizeConfidence(diagnosticData.confidence);
        diagnosticData.possible_causes = normalizePossibleCauses(diagnosticData.possible_causes);
        diagnosticData.clarification_questions = normalizeClarificationQuestions(diagnosticData.clarification_questions);

        // Apply Safety Rules
        diagnosticData = applySafetyRules(diagnosticData, symptoms);
        finalDiagnosisData = diagnosticData;
      }

      // 10. Cache Successful Response
      cacheService.set(cacheKeyParams, finalDiagnosisData, requestId);

      const totalDurationMs = Date.now() - startTime;
      logger.info('AI_REQUEST_COMPLETED', requestId, {
        cacheHit: false,
        inFlightHit: false,
        queueWaitMs,
        geminiDurationMs,
        totalDurationMs,
        model: modelUsed,
        fallbackUsed,
      });

      return {
        success: true,
        ai_source: 'gemini',
        model: modelUsed,
        diagnosis: finalDiagnosisData,
      };
    } catch (err) {
      if (err.code === 'QUEUE_FULL' || err.code === 'QUEUE_TIMEOUT') {
        logger.warn('AI_SERVICE_BUSY_RESPONSE', requestId, { reason: err.code });
        return {
          success: true,
          ai_source: 'busy',
          model: 'none',
          diagnosis: {
            type: 'conversation',
            status: 'temporarily_busy',
            response: 'VehiCare AI is currently handling several requests. Please try again shortly.',
          },
        };
      }

      logger.error('AI_PIPELINE_ERROR', requestId, { error: err.message });
      const fallbackData = applySafetyRules(
        generateFallbackResponse(vehicleContext, symptoms, language),
        symptoms
      );
      return {
        success: true,
        ai_source: 'fallback',
        model: getGeminiModelName(),
        diagnosis: fallbackData,
      };
    }
  }, requestId);
};

const normalizeConfidence = (confidence) => {
  if (!confidence) {
    return {
      score: 0,
      level: 'INSUFFICIENT',
      reason: 'Insufficient information for a reliable assessment.',
    };
  }

  if (typeof confidence === 'string') {
    const level = confidence.toUpperCase();
    const scores = {
      VERY_HIGH: 95,
      HIGH: 85,
      MEDIUM: 65,
      MODERATE: 65,
      LOW: 40,
      INSUFFICIENT: 15,
    };

    return {
      score: scores[level] || 15,
      level: scores[level] ? (level === 'MODERATE' ? 'MEDIUM' : level) : 'INSUFFICIENT',
      reason: 'Confidence is based on the information provided by the user.',
    };
  }

  let score = Number(confidence.score);
  if (!Number.isFinite(score)) {
    score = 15;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  let level;
  if (score >= 90) {
    level = 'VERY_HIGH';
  } else if (score >= 75) {
    level = 'HIGH';
  } else if (score >= 55) {
    level = 'MEDIUM';
  } else if (score >= 30) {
    level = 'LOW';
  } else {
    level = 'INSUFFICIENT';
  }

  return {
    score,
    level,
    reason: confidence.reason || 'Confidence is based on the information provided.',
  };
};

const normalizePossibleCauses = (causes) => {
  if (!Array.isArray(causes)) {
    return [];
  }

  return causes.slice(0, 5).map((cause, index) => {
    const likelihood = String(cause?.likelihood || 'LOW').toUpperCase();
    let score = Number(cause?.likelihood_score || cause?.score);

    if (!Number.isFinite(score)) {
      const fallbackScores = {
        HIGH: 85,
        MEDIUM: 60,
        MODERATE: 60,
        LOW: 35,
      };

      score = fallbackScores[likelihood] || 25;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
      cause: cause?.cause || cause?.name || `Possible cause ${index + 1}`,
      likelihood: likelihood === 'MODERATE' ? 'MEDIUM' : likelihood,
      likelihood_score: score,
      reason: cause?.reason || 'This possibility is based on the reported symptoms.',
    };
  });
};

const normalizeClarificationQuestions = (questions) => {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions
    .map((item) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        let extractedOptions = [];

        if (trimmed.toLowerCase().includes(' or ')) {
          const parts = trimmed.split(/ or /i);
          extractedOptions = parts.map((p) => p.replace(/[?.,!]/g, '').trim()).filter(Boolean);
        }

        return {
          question: trimmed,
          options: extractedOptions,
        };
      }

      if (item && typeof item === 'object') {
        const qStr = item.question || item.title || item.text || 'Clarification question';
        let opts = Array.isArray(item.options) ? item.options.filter(Boolean) : [];
        if (opts.length === 0 && qStr.toLowerCase().includes(' or ')) {
          opts = qStr.split(/ or /i).map((p) => p.replace(/[?.,!]/g, '').trim()).filter(Boolean);
        }

        return {
          question: qStr,
          options: opts,
        };
      }

      return null;
    })
    .filter(Boolean);
};

const generateFallbackResponse = (vehicleContext, symptoms, language) => {
  const vName = `${vehicleContext.brand || 'Vehicle'} ${vehicleContext.model || ''}`.trim();
  return {
    type: 'diagnostic',
    status: 'needs_clarification',
    confidence: {
      score: 20,
      level: 'INSUFFICIENT',
      reason: 'There is not enough information to confidently identify the underlying cause.',
    },
    summary: `Additional component inspection is required for your ${vName}.`,
    reported: symptoms ? [symptoms] : [],
    observed: [],
    severity: 'MODERATE',
    urgency: 'Please provide more detail before making a repair decision.',
    possible_causes: [
      {
        cause: 'Component inspection required',
        likelihood: 'LOW',
        likelihood_score: 20,
        reason: 'The available information is insufficient to identify a specific component.',
      },
    ],
    recommended_actions: [
      'Check visible components safely.',
      'Provide more detail about when the symptom occurs.',
    ],
    clarification_questions: [
      {
        question: 'When does the symptom occur?',
        options: ['While starting', 'While idling', 'While accelerating', 'Randomly'],
      },
      {
        question: 'Did it start suddenly or gradually?',
        options: ['Suddenly', 'Gradually', 'Just noticed'],
      },
    ],
    estimated_cost: { min: 1000, max: 3500, currency: 'PHP' },
    professional_help: {
      recommended: false,
      requires_specialist: false,
      reason: '',
      severity: 'MODERATE',
    },
  };
};
