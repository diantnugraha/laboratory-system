import { z } from 'zod';

// ============================================
// Create Matrix
// ============================================

export const createMatrixSchema = z.object({
  name: z.string()
    .min(1, 'Matrix name is required')
    .max(255, 'Matrix name must be at most 255 characters')
    .trim()
});

export type CreateMatrixInput = z.infer<typeof createMatrixSchema>;

// ============================================
// Update Matrix
// ============================================

export const updateMatrixSchema = z.object({
  name: z.string()
    .min(1, 'Matrix name is required')
    .max(255, 'Matrix name must be at most 255 characters')
    .trim()
    .optional()
});

export type UpdateMatrixInput = z.infer<typeof updateMatrixSchema>;
