import { z } from 'zod';

export const possibleCauseSchema = z.object({
  cause: z.string().default('Unspecified component issue'),
  likelihood: z.string().default('LOW'),
  likelihood_score: z.number().optional(),
  reason: z.string().default(''),
});

export const confidenceSchema = z.union([
  z.string(),
  z.object({
    score: z.number().optional(),
    level: z.string().optional(),
    reason: z.string().optional(),
  }),
]);

export const clarificationQuestionSchema = z.union([
  z.string(),
  z.object({
    question: z.string().default(''),
    options: z.array(z.string()).optional().default([]),
  }),
]);

export const diagnosticOutputSchema = z.object({
  type: z.enum(['conversation', 'diagnostic']).default('diagnostic'),
  status: z.enum(['diagnosis_ready', 'needs_clarification', 'conversation']).default('diagnosis_ready'),
  confidence: confidenceSchema.optional().default('MEDIUM'),
  summary: z.string().default('Diagnostic evaluation complete.'),
  reported: z.array(z.string()).optional().default([]),
  observed: z.array(z.string()).optional().default([]),
  severity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).default('MODERATE'),
  urgency: z.string().default('Inspection recommended.'),
  possible_causes: z.array(possibleCauseSchema).optional().default([]),
  recommended_actions: z.array(z.string()).optional().default(['Consult a certified technician']),
  clarification_questions: z.array(clarificationQuestionSchema).optional().default([]),
  estimated_cost: z.object({
    min: z.number().default(1000),
    max: z.number().default(3500),
    currency: z.string().default('PHP'),
  }).optional().default({ min: 1000, max: 3500, currency: 'PHP' }),
  professional_help: z.object({
    recommended: z.boolean().default(false),
    reason: z.string().default('Professional inspection recommended for vehicle safety.'),
    severity: z.string().optional().default('MODERATE'),
  }).optional().default({ recommended: false, reason: 'Professional inspection recommended for vehicle safety.', severity: 'MODERATE' }),
});

export const conversationOutputSchema = z.object({
  type: z.literal('conversation').default('conversation'),
  status: z.literal('conversation').default('conversation'),
  response: z.string().min(1),
});
