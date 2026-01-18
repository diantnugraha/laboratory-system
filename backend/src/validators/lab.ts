import { z } from 'zod';

// ============================================
// Create Lab
// ============================================

export const createLabSchema = z.object({
  name: z.string()
    .min(1, 'Lab name is required')
    .max(255, 'Lab name must be at most 255 characters')
    .trim()
});

export type CreateLabInput = z.infer<typeof createLabSchema>;

// ============================================
// Update Lab
// ============================================

export const updateLabSchema = z.object({
  name: z.string()
    .min(1, 'Lab name is required')
    .max(255, 'Lab name must be at most 255 characters')
    .trim()
    .optional()
});

export type UpdateLabInput = z.infer<typeof updateLabSchema>;
