import { z } from 'zod';
import { resolveTotalBudgetMs, callGemini } from './gemini.service.js';

const RESULT_SCHEMA = z.object({
  outcome: z.enum(['valid_vehicle_sound', 'irrelevant_audio', 'inconclusive_audio']),
  vehicle_sound_detected: z.boolean(),
  identifiable_vehicle_source: z.boolean(),
  confidence: z.enum(['high', 'medium', 'low']),
  reason: z.string().max(240),
  retry_guidance: z.string().max(240),
});

const CLASSIFICATION_PROMPT = `You validate audio for a vehicle-sound diagnostic feature. Do not diagnose a fault.

Classify the recording as JSON with exactly these fields:
{"outcome":"valid_vehicle_sound|irrelevant_audio|inconclusive_audio","vehicle_sound_detected":true,"identifiable_vehicle_source":true,"confidence":"high|medium|low","reason":"short explanation","retry_guidance":"short practical instruction"}

Rules:
- valid_vehicle_sound requires a clearly audible, identifiable sound produced by a vehicle that can reasonably be examined (for example an engine, brake, belt, wheel, exhaust or vehicle vibration). A fault does not have to be established at this stage.
- Speech alone, spoken questions, music, silence, and unrelated environmental sounds are irrelevant_audio.
- Use inconclusive_audio for weak, noisy, corrupted-sounding, or ambiguous audio, or when a vehicle source cannot be identified confidently.
- Speech mixed with vehicle noise is valid only when the vehicle sound itself is clearly identifiable with high confidence.
- Do not infer vehicle sounds from the user's text, filename, or vehicle details. Assess the audio only.
- If uncertain, fail closed with inconclusive_audio and give a concise recording tip.
- Return JSON only. Never provide a diagnosis or claim that a fault exists.`;

const parseJsonObject = raw => {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const classifyVehicleSound = async ({ mediaBase64, mediaMime, requestId }) => {
  const result = await callGemini({
    prompt: CLASSIFICATION_PROMPT,
    mediaBase64,
    mediaMime,
    requestId: `${requestId}_sound_validation`,
    requestType: 'diagnostic',
    inputType: 'audio',
    totalBudgetMs: resolveTotalBudgetMs('audio', true),
  });

  const parsed = RESULT_SCHEMA.safeParse(parseJsonObject(result?.text));
  if (!parsed.success) {
    return {
      outcome: 'inconclusive_audio',
      retry_guidance: 'We could not identify the recording reliably. Record the vehicle noise again in a quiet place, close to its source.',
      reason: 'The audio could not be classified reliably.',
    };
  }

  const classification = parsed.data;
  // Fail closed: only a high-confidence identifiable vehicle sound reaches
  // the diagnosis model. No arbitrary numeric confidence threshold is used.
  if (
    classification.outcome !== 'valid_vehicle_sound' ||
    !classification.vehicle_sound_detected ||
    !classification.identifiable_vehicle_source ||
    classification.confidence !== 'high'
  ) {
    return {
      ...classification,
      outcome: classification.outcome === 'irrelevant_audio'
        ? 'irrelevant_audio'
        : 'inconclusive_audio',
    };
  }

  return classification;
};

export const __parseVehicleSoundClassification = parseJsonObject;
