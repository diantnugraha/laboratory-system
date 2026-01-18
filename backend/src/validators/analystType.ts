import { z } from 'zod';

// ============================================
// Create Analyst Type
// ============================================

export const createAnalystTypeSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
  list_service: z.string().trim().nullable().optional()
});

export type CreateAnalystTypeInput = z.infer<typeof createAnalystTypeSchema>;

// ============================================
// Update Analyst Type
// ============================================

export const updateAnalystTypeSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .trim()
    .optional(),
  list_service: z.string().trim().nullable().optional()
});

export type UpdateAnalystTypeInput = z.infer<typeof updateAnalystTypeSchema>;
