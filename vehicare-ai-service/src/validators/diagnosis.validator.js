import { z } from 'zod';

export const diagnosisInputSchema = z.object({
  request_id: z.string().min(1, 'request_id is required'),
  user_context: z.object({
    id: z.number().optional().nullable(),
    language: z.string().optional().default('en'),
  }).optional().default({}),
  vehicle_context: z.object({
    id: z.number().optional().nullable(),
    type: z.string().optional().default('Vehicle'),
    brand: z.string().optional().default('Unknown'),
    model: z.string().optional().default('Unknown'),
    year: z.union([z.string(), z.number()]).optional().default('Unknown'),
    model_number: z.string().optional().nullable(),
  }).optional().default({}),
  diagnosis: z.object({
    symptoms: z.string().max(2000),
    input_type: z.enum(['text', 'image', 'voice', 'video', 'audio']).optional().default('text'),
    media_base64: z.string().optional().nullable(),
    media_mime: z.string().optional().default('image/jpeg'),
    history: z.array(
      z.object({
        role: z.string(),
        content: z.string().optional(),
        text: z.string().optional(),
      })
    ).optional().default([]),
  }),
});
