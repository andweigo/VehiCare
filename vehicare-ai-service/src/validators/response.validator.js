import { z } from 'zod';

export const possibleCauseSchema = z.object({
  cause: z.string().min(1).max(200),
  likelihood: z.string().max(20).optional(),
  likelihood_score: z.number().min(0).max(100).optional(),
  reason: z.string().max(500).optional(),
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
  z.string().min(1).max(300),
  z.object({
    question: z.string().min(1).max(300),
    options: z.array(z.string().min(1).max(100)).max(8).optional(),
  }),
]);

export const maintenanceTaskSchema = z.union([
  z.string().transform(str => ({
    title: str,
    service_type: 'General Inspection',
    description: `Inspection task: ${str}`,
    urgency: 'Routine',
    is_inspection: true,
    what_to_do: str,
    why_it_matters: 'Helps maintain vehicle reliability and avoid component wear.',
    when_due: 'Condition-based inspection',
    skill_level: 'Beginner-friendly',
    completion_check: 'Inspect and confirm component functions normally.',
  })),
  z.object({
    title: z.string().max(200).default('Inspect reported issue'),
    service_type: z.string().max(100).default('General Inspection'),
    description: z.string().max(500).default(''),
    urgency: z.string().max(50).default('Routine'),
    is_inspection: z.boolean().default(true),
    what_to_do: z.string().max(300).optional(),
    why_it_matters: z.string().max(500).optional(),
    when_due: z.string().max(200).optional(),
    skill_level: z.string().max(50).optional().default('Beginner-friendly'),
    completion_check: z.string().max(500).optional(),
  }).transform(task => ({
    ...task,
    what_to_do: task.what_to_do || task.title,
    why_it_matters: task.why_it_matters || task.description || 'Helps maintain vehicle reliability and avoid component wear.',
    when_due: task.when_due || 'Condition-based inspection',
    skill_level: task.skill_level || 'Beginner-friendly',
    completion_check: task.completion_check || 'Inspect and confirm component functions normally.',
  })),
]);

export const smartRecommendationSchema = z.union([
  z.string().transform(str => ({
    title: str,
    category_section: 'helpful_tips',
    problem: 'Preventive care',
    preventive_action: str,
    reason: 'Helps reduce risk of recurring issues.',
    warning_signs: 'Watch for unusual sounds, lights, or handling changes.',
    safety_precaution: 'Seek professional service if symptoms persist.',
  })),
  z.object({
    title: z.string().max(200).default('Preventive habit'),
    category_section: z.enum(['do_this_now', 'coming_up_soon', 'helpful_tips']).optional().default('helpful_tips'),
    problem: z.string().max(300).default(''),
    preventive_action: z.string().max(500).default(''),
    reason: z.string().max(500).default(''),
    warning_signs: z.string().max(500).default(''),
    safety_precaution: z.string().max(500).default(''),
  }),
]);

export const repairGuidanceSchema = z.object({
  difficulty: z.string().max(50).optional(),
  diy_friendly: z.boolean().optional(),
  estimated_diy_time: z.string().max(100).optional(),
  tools_needed: z.array(z.string().max(100)).max(12).optional().default([]),
  prerequisites: z.array(z.string().max(300)).max(12).optional().default([]),
  steps: z.array(z.string().max(1000)).max(12).optional().default([]),
  safety_stopping_conditions: z.array(z.string().max(300)).max(12).optional().default([]),
}).optional().nullable();

export const costBreakdownSchema = z.object({
  parts: z.object({
    min: z.number().finite().min(0).max(10000000),
    max: z.number().finite().min(0).max(10000000),
    items: z.array(z.string().min(1).max(200)).max(12).optional(),
  }).optional(),
  labor: z.object({
    min: z.number().finite().min(0).max(10000000),
    max: z.number().finite().min(0).max(10000000),
  }).optional(),
  assumptions: z.string().max(500).optional(),
  price_uncertainty_note: z.string().max(500).optional(),
}).optional().nullable();

export const diagnosticOutputSchema = z.object({
  type: z.enum(['diagnostic', 'vehicle_mismatch', 'vehicle_switch_confirmation_required']),
  status: z.enum(['diagnosis_ready', 'needs_clarification', 'vehicle_mismatch', 'vehicle_switch_confirmation_required']),
  plan_tier: z.string().optional(),
  confidence: confidenceSchema.optional(),
  follow_up_ack: z.string().max(1000).optional().nullable(),
  diagnostic_progress: z.string().max(1000).optional().nullable(),
  response: z.string().min(1).max(3000).optional(),
  summary: z.string().min(5).max(1000).optional(),
  whats_happening: z.string().max(2000).optional(),
  safety_guidance: z.string().max(1000).optional(),
  safe_diy_checks: z.array(z.string().max(500)).max(8).optional().default([]),
  mechanic_guidance: z.string().max(1000).optional(),
  reported: z.array(z.string().max(500)).max(10).optional().default([]),
  observed: z.array(z.string().max(500)).max(10).optional().default([]),
  image_vehicle_match: z.enum(['match', 'possible_mismatch', 'uncertain', 'not_applicable']).optional().default('not_applicable'),
  image_vehicle_details: z.object({
    category: z.string().max(100).optional().nullable(),
    estimated_make: z.string().max(100).optional().nullable(),
    estimated_model: z.string().max(100).optional().nullable(),
    confidence: z.string().max(50).optional().nullable(),
    details: z.string().max(500).optional().nullable(),
  }).optional().nullable(),
  vehicle_context_status: z.enum(['match', 'mismatch', 'uncertain', 'different_vehicle_mentioned', 'not_applicable']).optional(),
  mentioned_vehicle: z.string().max(100).optional().nullable(),
  severity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
  urgency: z.string().min(1).max(500).optional(),
  possible_causes: z.array(possibleCauseSchema).max(5).optional().default([]),
  recommended_actions: z.array(z.string().min(1).max(500)).max(8).optional().default([]),
  maintenance_tasks: z.array(maintenanceTaskSchema).max(8).optional().default([]),
  smart_recommendations: z.array(smartRecommendationSchema).max(8).optional().default([]),
  clarification_questions: z.array(clarificationQuestionSchema).max(5).optional().default([]),
  repair_guidance: repairGuidanceSchema,
  cost_breakdown: costBreakdownSchema,
  history_insights: z.string().max(1000).optional().nullable(),
  estimated_cost: z.object({
    min: z.number().finite().min(0).max(10000000),
    max: z.number().finite().min(0).max(10000000),
    currency: z.literal('PHP'),
  }).optional().nullable(),
  professional_help: z.object({
    recommended: z.boolean().optional(),
    requires_specialist: z.boolean().optional(),
    reason: z.string().max(500).optional(),
    severity: z.string().max(50).optional(),
  }).optional(),
}).superRefine((value, context) => {
  if (value.status === 'diagnosis_ready'
    && (!value.summary || !value.severity || !value.urgency || value.recommended_actions.length === 0)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['status'],
      message: 'A completed diagnosis must include a summary, severity, urgency, and at least one action.',
    });
  }

  if ((value.status === 'needs_clarification' || value.status === 'vehicle_mismatch' || value.status === 'vehicle_switch_confirmation_required')
    && !value.response
    && !value.summary) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['response'],
      message: 'A clarification, mismatch, or vehicle switch response must include an explanation.',
    });
  }

  if (value.estimated_cost && value.estimated_cost.max < value.estimated_cost.min) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['estimated_cost', 'max'],
      message: 'Estimated cost maximum must not be less than its minimum.',
    });
  }

  if (value.cost_breakdown) {
    for (const category of ['parts', 'labor']) {
      const range = value.cost_breakdown[category];
      if (range && range.max < range.min) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cost_breakdown', category, 'max'],
          message: 'Cost maximum must not be less than its minimum.',
        });
      }
    }
  }

  if (value.status === 'needs_clarification' && value.clarification_questions.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['clarification_questions'],
      message: 'A clarification response must include at least one question.',
    });
  }
});

export const conversationOutputSchema = z.object({
  type: z.literal('conversation'),
  status: z.literal('conversation'),
  response: z.string().min(1).max(3000),
});
