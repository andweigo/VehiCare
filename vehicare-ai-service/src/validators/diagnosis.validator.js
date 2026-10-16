import { z } from 'zod';

export const sanitizeConversationHistory = (history) => {
  if (!Array.isArray(history)) return [];

  return history.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];

    const role = typeof entry.role === 'string' ? entry.role.trim().toLowerCase() : '';
    if (role !== 'user' && role !== 'assistant') return [];

    const rawContent = typeof entry.content === 'string'
      ? entry.content
      : typeof entry.text === 'string'
        ? entry.text
        : '';
    const content = rawContent.trim();

    return content ? [{ role, content: content.slice(0, 4000) }] : [];
  }).slice(-20);
};

export const sanitizeDiagnosisPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  if (!payload.diagnosis || typeof payload.diagnosis !== 'object' || Array.isArray(payload.diagnosis)) {
    return payload;
  }

  return {
    ...payload,
    diagnosis: {
      ...payload.diagnosis,
      history: sanitizeConversationHistory(payload.diagnosis.history),
    },
  };
};

const historySchema = z.preprocess(
  sanitizeConversationHistory,
  z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  }))
);

const ensureObject = (val) => {
  if (Array.isArray(val) || !val || typeof val !== 'object') {
    return {};
  }
  return val;
};

const ensureDiagnosticState = (val) => {
  if (Array.isArray(val) || !val || typeof val !== 'object') {
    return { assessments: [] };
  }
  return val;
};

const diagnosticStateSchema = z.preprocess(
  ensureDiagnosticState,
  z.object({
    assessments: z.array(z.object({
      status: z.enum(['diagnosis_ready', 'needs_clarification']),
      summary: z.string().max(500),
      reported: z.array(z.string().max(200)).max(5),
      observed: z.array(z.string().max(200)).max(5),
      possible_causes: z.array(z.string().max(200)).max(5),
      clarification_questions: z.array(z.string().max(300)).max(5),
    })).optional().default([]),
  }).passthrough().default({ assessments: [] })
);

export const entitlementsInputSchema = z.preprocess(
  ensureObject,
  z.object({
    plan: z.string().optional().default('free'),
    is_premium: z.boolean().optional().default(false),
    is_free: z.boolean().optional().default(true),
    is_guest: z.boolean().optional().default(false),
    response_depth: z.enum(['essential', 'deep_structured']).optional().default('essential'),
    diagnostic_followup: z.enum(['basic', 'adaptive']).optional().default('basic'),
    historical_context_enabled: z.boolean().optional().default(false),
    repair_guidance_detail: z.enum(['standard', 'comprehensive']).optional().default('standard'),
    cost_breakdown_detail: z.enum(['basic', 'itemized']).optional().default('basic'),
    maintenance_personalization: z.enum(['standard', 'vehicle_history_personalized']).optional().default('standard'),
  }).passthrough().default({})
);

export const historicalContextInputSchema = z.preprocess(
  ensureObject,
  z.object({
    recent_repairs: z.array(z.any()).optional().default([]),
    recent_maintenance: z.array(z.any()).optional().default([]),
    past_diagnostics: z.array(z.any()).optional().default([]),
  }).passthrough().default({})
);

export const diagnosisInputSchema = z.object({
  request_id: z.string().min(1, 'request_id is required'),
  user_context: z.preprocess(
    ensureObject,
    z.object({
      id: z.number().optional().nullable(),
      language: z.string().optional().default('en'),
      plan: z.string().optional().default('free'),
    }).default({})
  ),
  entitlements: entitlementsInputSchema,
  historical_context: historicalContextInputSchema,
  diagnostic_state: diagnosticStateSchema,
  vehicle_context: z.preprocess(
    ensureObject,
    z.object({
      id: z.number().optional().nullable(),
      type: z.string().optional().default('Vehicle'),
      brand: z.string().optional().default('Unknown'),
      model: z.string().optional().default('Unknown'),
      year: z.union([z.string(), z.number()]).optional().default('Unknown'),
      model_number: z.string().optional().nullable(),
    }).default({})
  ),
  diagnosis: z.object({

    symptoms: z.string().max(2000),
    input_type: z.enum(['text', 'image', 'voice', 'video', 'audio']).optional().default('text'),
    media_base64: z.string().optional().nullable(),
    media_mime: z.string().optional(),
    history: historySchema.optional().default([]),
  }),
}).superRefine((payload, context) => {
  const mediaTypes = ['image', 'voice', 'video', 'audio'];
  if (mediaTypes.includes(payload.diagnosis.input_type) && !payload.diagnosis.media_base64) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['diagnosis', 'media_base64'],
      message: 'The selected media input type requires an attached media file.',
    });
  }
});
