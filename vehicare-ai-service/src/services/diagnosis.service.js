import config from '../config/env.js';
import { getGeminiModelName } from '../config/gemini.js';
import { buildDiagnosisPrompt, isGeneralQuestion } from '../prompts/diagnosis.prompt.js';
import { applySafetyRules } from '../safety/diagnosis-safety.js';
import logger from '../utils/logger.js';
import { parseAndCleanJson } from '../utils/response-parser.js';
import { isRepairGuideIntent } from '../utils/symptom-normalizer.js';
import { conversationOutputSchema, diagnosticOutputSchema } from '../validators/response.validator.js';
import { filterAndSelectQuestions } from './question-dedup.js';
import { cacheService } from './cache.service.js';
import { dedupService } from './dedup.service.js';
import { callGemini, resolveTotalBudgetMs } from './gemini.service.js';
import { queueService } from './queue.service.js';

const PROMPT_POLICY_VERSION = 'diagnosis-v2';

export const isSyntheticPlaceholder = (text) => {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim().toLowerCase();
  return (
    t.length < 5 ||
    t === 'audio recording of engine or vehicle noise' ||
    t === 'visual and audio vehicle video analysis' ||
    t === 'visual component analysis' ||
    t === 'audio recording' ||
    t === 'sound recording' ||
    t === 'voice note' ||
    t === 'image analysis' ||
    t === 'video analysis'
  );
};

export const processDiagnosisRequest = async (payload) => {
  const startTime = Date.now();
  const {
    request_id: requestId,
    user_context: userContext,
    vehicle_context: vehicleContext,
    diagnosis,
    entitlements = {},
    historical_context: historicalContext = {},
    diagnostic_state: diagnosticState = { assessments: [] },
  } = payload;
  const {
    symptoms,
    root_symptom: rootSymptom,
    input_type: inputType,
    media_base64: mediaBase64,
    media_mime: mediaMime,
    history,
  } = diagnosis;
  const language = userContext?.language || 'en';

  const isRepair = !mediaBase64 && isRepairGuideIntent(symptoms);
  const isGeneral = !mediaBase64 && !isRepair && isGeneralQuestion(symptoms, history, diagnosticState);
  const requestType = isRepair ? 'repair' : (isGeneral ? 'conversation' : 'diagnostic');

  logger.info('AI_REQUEST_RECEIVED', requestId, {
    inputType,
    requestType,
    plan: entitlements?.plan || userContext?.plan || 'free',
    symptomsLength: symptoms ? symptoms.length : 0,
    hasMedia: Boolean(mediaBase64),
    mediaMime,
    mediaSizeBytes: mediaBase64
      ? Math.floor(mediaBase64.replace(/^data:[^;]+;base64,/i, '').length * 0.75)
      : 0,
  });

  const isAlternateVehicle = vehicleContext?.is_saved_vehicle === false;
  const targetVehicleDesc = vehicleContext?.target_vehicle_desc || null;

  // 1. Generate Cache Key
  const cacheKeyParams = {
    requestType,
    vehicleContext,
    symptoms,
    rootSymptom: rootSymptom || null,
    isAlternateVehicle,
    targetVehicleDesc,
    userLanguage: language,
    mediaBase64,
    inputType,
    mediaMime,
    history,
    userContext,
    plan: entitlements?.plan || userContext?.plan || 'free',
    historicalContext,
    diagnosticState,
    promptVersion: `${PROMPT_POLICY_VERSION}:${getGeminiModelName()}`,
  };
  let cacheKey = null;
  try {
    cacheKey = cacheService.generateKey(cacheKeyParams);
  } catch (keyErr) {
    logger.warn('AI_CACHE_KEY_GEN_FAILED', requestId, { error: keyErr.message });
  }

  // 2. CACHE LOOKUP - Must be checked first. A hit NEVER calls Gemini or enters queue.
  let cachedResult = null;
  try {
    const cached = cacheKey ? cacheService.get(cacheKey, requestId) : null;
    if (cached?.type === 'conversation') {
      const parsed = conversationOutputSchema.safeParse(cached);
      if (parsed.success) cachedResult = parsed.data;
    } else if (cached?.type === 'diagnostic') {
      const safetyAdjusted = applySafetyRules({ ...cached }, symptoms);
      const parsed = diagnosticOutputSchema.safeParse(safetyAdjusted);
      if (parsed.success) cachedResult = parsed.data;
    }
    if (cached && !cachedResult) cacheService.delete(cacheKey);
  } catch (cacheErr) {
    logger.warn('AI_CACHE_GET_FAILED', requestId, { error: cacheErr.message });
  }

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
    const queueEnterTime = Date.now();

    try {
      // 5. Enter Concurrency Queue
      const geminiResult = await queueService.enqueue(async () => {
        const queueWaitMs = Date.now() - queueEnterTime;
        // 6. Build Prompt
        const prompt = buildDiagnosisPrompt({
          vehicleContext,
          symptoms,
          rootSymptom,
          isAlternateVehicle,
          targetVehicleDesc,
          userLanguage: language,
          history,
          hasMedia: Boolean(mediaBase64),
          inputType,
          mediaMime,
          entitlements,
          historicalContext,
          diagnosticState,
        });

        let response;
        let mediaFallbackUsed = false;
        let mediaErrorNotice = null;

        try {
          // 7. Call Gemini API with media-aware total budget
          response = await callGemini({
            prompt,
            mediaBase64,
            mediaMime,
            requestId,
            requestType,
            inputType,
            startTime,
            totalBudgetMs: resolveTotalBudgetMs(inputType, Boolean(mediaBase64)),
          });
        } catch (geminiError) {
          const isMediaError = [
            'MEDIA_UPLOAD_FAILED',
            'MEDIA_UPLOAD_TIMEOUT',
            'MEDIA_PROCESSING_TIMEOUT',
            'MEDIA_PROCESSING_FAILED',
            'UNSUPPORTED_MEDIA_TYPE',
            'INVALID_MEDIA',
            'MEDIA_TOO_LARGE',
          ].includes(geminiError.code) || (Boolean(mediaBase64) && geminiError.code === 'GEMINI_TIMEOUT');

          const isSynthetic = isSyntheticPlaceholder(symptoms);
          const hasUsableSymptoms = Boolean(symptoms) && !isSynthetic && symptoms.trim().length >= 5;

          if (isMediaError && hasUsableSymptoms) {
            logger.warn('AI_MEDIA_FALLBACK_TO_TEXT', requestId, {
              originalErrorCode: geminiError.code,
              originalError: geminiError.message,
              symptomsLength: symptoms.length,
            });

            mediaFallbackUsed = true;
            mediaErrorNotice = 'The attached media could not be processed. A preliminary diagnosis was generated based on your described symptoms.';

            const fallbackPrompt = buildDiagnosisPrompt({
              vehicleContext,
              symptoms,
              rootSymptom,
              isAlternateVehicle,
              targetVehicleDesc,
              userLanguage: language,
              history,
              hasMedia: false,
              inputType: 'text',
              mediaMime: null,
              entitlements,
              historicalContext,
              diagnosticState,
            });

            const fallbackTextBudgetMs = Math.min(
              resolveTotalBudgetMs('text', false),
              Math.max(12000, (startTime + 80000) - Date.now()),
            );

            response = await callGemini({
              prompt: fallbackPrompt,
              mediaBase64: null,
              mediaMime: null,
              requestId: `${requestId}_fallback`,
              requestType,
              inputType: 'text',
              startTime: Date.now(),
              totalBudgetMs: fallbackTextBudgetMs,
            });
          } else {
            if (isMediaError && !hasUsableSymptoms) {
              const isRetryableMediaError = geminiError.code === 'GEMINI_TIMEOUT' ||
                geminiError.code === 'GEMINI_OVERLOADED' ||
                geminiError.code === 'GEMINI_UNAVAILABLE' ||
                geminiError.statusCode === 503 ||
                geminiError.statusCode === 504 ||
                geminiError.retryable === true;

              const structuredError = new Error(
                'The uploaded media could not be processed at this time. Please describe your vehicle\'s symptoms in words or try uploading again.'
              );
              structuredError.code = geminiError.code || 'MEDIA_PROCESSING_FAILED';
              structuredError.statusCode = isRetryableMediaError ? 503 : 422;
              structuredError.retryable = isRetryableMediaError;
              throw structuredError;
            }
            throw geminiError;
          }
        }

        return { response, queueWaitMs, mediaFallbackUsed, mediaErrorNotice };
      }, requestId, requestType);

      const { response: geminiResponse, queueWaitMs, mediaFallbackUsed, mediaErrorNotice } = geminiResult;
      const rawResponseText = geminiResponse.text;
      const modelUsed = geminiResponse.modelUsed;
      const fallbackUsed = geminiResponse.fallbackUsed;
      const geminiDurationMs = geminiResponse.durationMs;

      // 8. Parse JSON Output
      let jsonObject = parseAndCleanJson(rawResponseText);

      if (!jsonObject) {
        // Last-resort salvage: If raw text has meaningful automotive feedback, return it as conversation
        if (typeof rawResponseText === 'string' && rawResponseText.trim().length > 30) {
          logger.warn('AI_JSON_PARSE_SALVAGING_RAW_TEXT', requestId, {
            inputType,
            hasMedia: Boolean(mediaBase64),
            model: modelUsed,
            rawLength: rawResponseText.length,
          });
          const cleanText = rawResponseText
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .replace(/[{}"[\]]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (cleanText.length > 20) {
            jsonObject = {
              type: 'conversation',
              status: 'conversation',
              response: cleanText.slice(0, 3000),
            };
          }
        }
      }

      if (!jsonObject) {
        logger.warn('AI_JSON_PARSE_FAILED', requestId, {
          inputType,
          hasMedia: Boolean(mediaBase64),
          model: modelUsed,
          rawResponsePreview: typeof rawResponseText === 'string' ? rawResponseText.substring(0, 500) : String(rawResponseText),
        });
        const error = new Error('The AI response could not be validated. Please retry the request.');
        error.code = 'INVALID_AI_RESPONSE';
        error.statusCode = 502;
        error.retryable = true;
        throw error;
      }


      const type = typeof jsonObject.type === 'string' ? jsonObject.type.toLowerCase() : '';
      const isConversationResponse =
        type === 'conversation' ||
        jsonObject.status === 'conversation' ||
        jsonObject.type === 'out_of_scope' ||
        jsonObject.status === 'out_of_scope' ||
        (Boolean(jsonObject.response) && !jsonObject.summary && (!Array.isArray(jsonObject.possible_causes) || jsonObject.possible_causes.length === 0));

      // 9. Validate & Normalize Output
      let finalDiagnosisData = null;

      if (isConversationResponse) {
        const textResponse = typeof jsonObject.response === 'string' && jsonObject.response.trim()
          ? jsonObject.response.trim()
          : (typeof jsonObject.message === 'string' && jsonObject.message.trim()
            ? jsonObject.message.trim()
            : (typeof jsonObject.summary === 'string' ? jsonObject.summary.trim() : 'I am here to assist with your vehicle diagnostics and care.'));
        
        finalDiagnosisData = {
          type: 'conversation',
          status: 'conversation',
          response: textResponse.slice(0, 3000),
        };
      } else {
        // Pre-normalize diagnostic structure to avoid superficial schema mismatches
        jsonObject.type = 'diagnostic';

        // 1. Apply deterministic deduplication on clarification questions
        const rawQuestions = Array.isArray(jsonObject.clarification_questions)
          ? jsonObject.clarification_questions
          : [];

        const dedupResult = filterAndSelectQuestions({
          proposedQuestions: rawQuestions,
          history,
          diagnosticState,
          symptoms,
          rootSymptom: rootSymptom || symptoms,
          maxClarificationTurns: 2,
        });

        // Fill in follow_up_ack / diagnostic_progress if follow-up turn
        const isFollowUpTurn = Boolean(rootSymptom && rootSymptom.trim() !== symptoms.trim()) ||
          (Array.isArray(history) && history.length > 0);

        if (isFollowUpTurn) {
          if (typeof jsonObject.whats_happening === 'string') {
            jsonObject.whats_happening = jsonObject.whats_happening
              .replace(/^Hey,?\s*no\s+worries!?[^\n]*\n*/i, '')
              .replace(/^Here's what('s)? happening:?\s*/i, '')
              .trim();
          }
          if (typeof jsonObject.summary === 'string') {
            jsonObject.summary = jsonObject.summary
              .replace(/^Hey,?\s*no\s+worries!?[^\n]*\n*/i, '')
              .replace(/^Here's what('s)? happening:?\s*/i, '')
              .trim();
          }

          if (!jsonObject.follow_up_ack || typeof jsonObject.follow_up_ack !== 'string') {
            const shortAns = symptoms.length > 80 ? symptoms.slice(0, 80) + '...' : symptoms;
            jsonObject.follow_up_ack = `Got it. "${shortAns}" directly narrows down the issue.`;
          }
          if (!jsonObject.diagnostic_progress || typeof jsonObject.diagnostic_progress !== 'string') {
            jsonObject.diagnostic_progress = 'This observation helps pinpoint the exact fault and rules out contradictory causes.';
          }

          // Filter out causes that physically contradict the user's latest observation
          if (Array.isArray(jsonObject.possible_causes)) {
            const symLower = symptoms.toLowerCase();
            // If lights dim or flicker under load, electricity flows -> rules out a blown main fuse
            if (symLower.includes('dim') || symLower.includes('flicker')) {
              jsonObject.possible_causes = jsonObject.possible_causes.filter(c => {
                const causeText = String(c?.cause || '').toLowerCase();
                return !(causeText.includes('blown') && causeText.includes('fuse'));
              });
            }
          }
        }

        // If turn limit or sufficient info reached, or no questions remain:
        if (dedupResult.questions.length === 0) {
          jsonObject.status = 'diagnosis_ready';
          jsonObject.clarification_questions = [];
        } else {
          jsonObject.clarification_questions = dedupResult.questions;
        }

        if (jsonObject.status !== 'needs_clarification') {
          jsonObject.status = 'diagnosis_ready';
        }

        if (jsonObject.status === 'needs_clarification') {
          const ack = jsonObject.follow_up_ack || '';
          const prog = jsonObject.diagnostic_progress || '';
          const qText = jsonObject.clarification_questions?.[0]?.question || 'Please provide more details.';
          const combinedResp = [ack, prog].filter(Boolean).join(' ');
          jsonObject.response = combinedResp
            ? `${combinedResp}\n\nOne question that helps narrow it down:\n${qText}`
            : (typeof jsonObject.response === 'string' && jsonObject.response.trim()
              ? jsonObject.response.trim()
              : `One question that helps narrow it down:\n${qText}`);

          if (!Array.isArray(jsonObject.clarification_questions) || jsonObject.clarification_questions.length === 0) {
            jsonObject.clarification_questions = [
              {
                question: 'When do you observe this symptom most frequently?',
                options: ['When accelerating', 'When braking', 'At idle or startup', 'Randomly while driving'],
              },
            ];
          }
        } else {
          jsonObject.summary = typeof jsonObject.summary === 'string' && jsonObject.summary.trim().length >= 5
            ? jsonObject.summary.trim()
            : (typeof jsonObject.response === 'string' && jsonObject.response.trim().length >= 5
              ? jsonObject.response.trim()
              : 'Diagnostic assessment completed for reported vehicle issue.');

          const rawSev = String(jsonObject.severity || 'MODERATE').toUpperCase();
          jsonObject.severity = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(rawSev) ? rawSev : 'MODERATE';

          jsonObject.urgency = typeof jsonObject.urgency === 'string' && jsonObject.urgency.trim()
            ? jsonObject.urgency.trim()
            : 'Schedule an inspection to verify this condition.';

          if (!Array.isArray(jsonObject.recommended_actions) || jsonObject.recommended_actions.length === 0) {
            if (Array.isArray(jsonObject.actions) && jsonObject.actions.length > 0) {
              jsonObject.recommended_actions = jsonObject.actions.map(a => typeof a === 'string' ? a : (a?.action || a?.text || String(a)));
            } else {
              jsonObject.recommended_actions = ['Inspect the reported component or consult a qualified mechanic.'];
            }
          }
        }

        // Normalize optional structured fields that Gemini sometimes returns as strings or non-objects
        if (typeof jsonObject.estimated_cost === 'string' || !jsonObject.estimated_cost || typeof jsonObject.estimated_cost !== 'object' || typeof jsonObject.estimated_cost.min !== 'number' || typeof jsonObject.estimated_cost.max !== 'number') {
          jsonObject.estimated_cost = null;
        }
        if (typeof jsonObject.cost_breakdown === 'string' || !jsonObject.cost_breakdown || typeof jsonObject.cost_breakdown !== 'object') {
          jsonObject.cost_breakdown = null;
        }
        if (typeof jsonObject.repair_guidance === 'string' || !jsonObject.repair_guidance || typeof jsonObject.repair_guidance !== 'object') {
          jsonObject.repair_guidance = null;
        }
        if (typeof jsonObject.history_insights !== 'string') {
          jsonObject.history_insights = null;
        }

        const parsedDiagnostic = diagnosticOutputSchema.safeParse(jsonObject);

        if (!parsedDiagnostic.success) {
          logger.warn('AI_DIAGNOSTIC_VALIDATION_FAILED_RECOVERING', requestId, {
            zodErrors: parsedDiagnostic.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
            rawType: jsonObject.type,
            rawStatus: jsonObject.status,
            rawSummaryPreview: typeof jsonObject.summary === 'string' ? jsonObject.summary.substring(0, 200) : undefined,
          });

          // Resilient salvage: If we have an AI response or summary, deliver it as conversation instead of failing with a 502 error
          const salvageableText = jsonObject.summary || jsonObject.response || jsonObject.diagnosis || jsonObject.description || jsonObject.analysis;
          if (salvageableText) {
            finalDiagnosisData = {
              type: 'conversation',
              status: 'conversation',
              response: typeof salvageableText === 'string' ? salvageableText.slice(0, 3000) : String(salvageableText).slice(0, 3000),
            };
          } else {
            const error = new Error('The AI response could not be validated. Please retry the request.');
            error.code = 'INVALID_AI_RESPONSE';
            error.statusCode = 502;
            error.retryable = true;
            throw error;
          }
        } else {
          let diagnosticData = parsedDiagnostic.data;
          diagnosticData.confidence = normalizeConfidence(diagnosticData.confidence);
          diagnosticData.possible_causes = normalizePossibleCauses(diagnosticData.possible_causes);
          diagnosticData.clarification_questions = normalizeClarificationQuestions(diagnosticData.clarification_questions);
          diagnosticData.maintenance_tasks = normalizeMaintenanceTasks(diagnosticData.maintenance_tasks, vehicleContext);
          diagnosticData.smart_recommendations = normalizeSmartRecommendations(diagnosticData.smart_recommendations, vehicleContext);
          if (diagnosticData.status === 'needs_clarification') {
            diagnosticData.maintenance_tasks = [];
            diagnosticData.smart_recommendations = [];
            diagnosticData.repair_guidance = null;
            diagnosticData.cost_breakdown = null;
            diagnosticData.estimated_cost = null;
          }

          // Apply Safety Rules
          diagnosticData = applySafetyRules(diagnosticData, symptoms);
          finalDiagnosisData = diagnosticData;
        }
      }


      if (mediaFallbackUsed) {
        finalDiagnosisData.media_fallback = true;
        finalDiagnosisData.media_notice = mediaErrorNotice;
        if (type !== 'conversation') {
          finalDiagnosisData.clarification_questions = [
            {
              question: 'Media analysis could not be completed. Could you describe the symptoms or sounds in more detail?',
              options: ['Happens only when idling', 'Happens when accelerating', 'Happens when braking', 'Constant issue'],
            },
            ...(finalDiagnosisData.clarification_questions || []),
          ];
        }
      }

      // 10. Cache Successful Response (bypass cache if media fallback was used)
      if (!mediaFallbackUsed) {
        try {
          cacheService.set(cacheKeyParams, finalDiagnosisData, requestId);
        } catch (cacheSetErr) {
          logger.warn('AI_CACHE_SET_FAILED', requestId, { error: cacheSetErr.message });
        }
      }

      const totalDurationMs = Date.now() - startTime;
      logger.info('AI_REQUEST_COMPLETED', requestId, {
        cacheHit: false,
        inFlightHit: false,
        queueWaitMs,
        geminiDurationMs,
        totalDurationMs,
        model: modelUsed,
        fallbackUsed: fallbackUsed || mediaFallbackUsed,
      });

      return {
        success: true,
        ai_source: mediaFallbackUsed ? 'gemini_text_fallback' : 'gemini',
        media_fallback: mediaFallbackUsed,
        media_notice: mediaErrorNotice,
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

      const isRange = err instanceof RangeError;
      const errorCode = err.code || (isRange ? 'INVALID_MEDIA' : 'AI_SERVICE_UNAVAILABLE');
      logger.error('AI_PIPELINE_ERROR', requestId, {
        requestType,
        inputType,
        hasMedia: Boolean(mediaBase64),
        errorCode,
        errorMessage: err.message || String(err),
        stack: err.stack,
        totalDurationMs: Date.now() - startTime,
      });
      throw err;
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
    .slice(0, 1)
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

const BICYCLE_INCOMPATIBLE_KEYWORDS = [
  'engine oil', 'motor oil', 'spark plug', 'transmission fluid', 'radiator',
  'coolant', 'carburetor', 'fuel injector', 'alternator', 'exhaust pipe',
  'starter motor', 'oil filter', 'clutch fluid', 'power steering',
];

export const normalizeMaintenanceTasks = (tasks, vehicleContext = {}) => {
  if (!Array.isArray(tasks)) return [];
  const isBicycle = String(vehicleContext?.type || '').toLowerCase() === 'bicycle';

  const normalized = tasks.map((item, idx) => {
    let title = '';
    let service_type = 'General Inspection';
    let description = '';
    let urgency = 'Routine';
    let is_inspection = true;

    if (typeof item === 'string') {
      title = item.trim();
      description = `Inspect reported issue: ${item}`;
    } else if (item && typeof item === 'object') {
      title = String(item.title || item.name || `Inspection task ${idx + 1}`).trim();
      service_type = String(item.service_type || item.type || 'General Inspection').trim();
      description = String(item.description || item.reason || '').trim();
      urgency = String(item.urgency || 'Routine').trim();
      is_inspection = item.is_inspection !== false;
    }

    if (!title) return null;

    const uUpper = urgency.toUpperCase();
    if (uUpper.includes('IMMEDIATE')) urgency = 'Immediate';
    else if (uUpper.includes('URGENT') || uUpper.includes('HIGH')) urgency = 'Urgent';
    else if (uUpper.includes('MODERATE') || uUpper.includes('MEDIUM')) urgency = 'Moderate';
    else urgency = 'Routine';

    if (isBicycle) {
      const combined = `${title} ${service_type} ${description}`.toLowerCase();
      if (BICYCLE_INCOMPATIBLE_KEYWORDS.some(kw => combined.includes(kw))) {
        return null;
      }
    }

    return {
      title,
      service_type,
      description: description || `Recommended inspection: ${title}`,
      urgency,
      is_inspection,
    };
  }).filter(Boolean);

  return normalized.slice(0, 5);
};

export const normalizeSmartRecommendations = (recommendations, vehicleContext = {}) => {
  if (!Array.isArray(recommendations)) return [];
  const isBicycle = String(vehicleContext?.type || '').toLowerCase() === 'bicycle';

  const normalized = recommendations.map((item, idx) => {
    let title = '';
    let problem = '';
    let preventive_action = '';
    let reason = '';
    let warning_signs = '';
    let safety_precaution = '';

    if (typeof item === 'string') {
      title = item.trim();
      problem = 'Reported vehicle symptom';
      preventive_action = item.trim();
      reason = 'Helps prevent recurrence and component degradation.';
      warning_signs = 'Watch for unusual sounds, handling changes, or warning lights.';
      safety_precaution = 'Consult a certified mechanic if symptoms persist or worsen.';
    } else if (item && typeof item === 'object') {
      title = String(item.title || item.name || `Preventive Tip ${idx + 1}`).trim();
      problem = String(item.problem || item.issue || '').trim();
      preventive_action = String(item.preventive_action || item.action || item.recommendation || '').trim();
      reason = String(item.reason || item.description || 'Helps avoid recurring component stress.').trim();
      warning_signs = String(item.warning_signs || item.signs || 'Unusual noises, warning lights, or abnormal feel.').trim();
      safety_precaution = String(item.safety_precaution || item.safety || 'Seek professional inspection if issue persists.').trim();
    }

    if (!title && !preventive_action) return null;
    if (!title) title = preventive_action.slice(0, 40);
    if (!preventive_action) preventive_action = title;

    if (isBicycle) {
      const combined = `${title} ${problem} ${preventive_action} ${reason}`.toLowerCase();
      if (BICYCLE_INCOMPATIBLE_KEYWORDS.some(kw => combined.includes(kw))) {
        return null;
      }
    }

    return {
      title,
      problem: problem || 'Preventive maintenance',
      preventive_action,
      reason,
      warning_signs,
      safety_precaution,
    };
  }).filter(Boolean);

  return normalized.slice(0, 5);
};
