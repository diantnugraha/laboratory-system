import { z } from 'zod';

// ============================================
// Create Matrix
// ============================================

export const createMatrixSchema = z.object({
  name: z.string()
    .min(1, 'Nama matrix wajib diisi')
    .max(255, 'Nama matrix maksimal 255 karakter')
    .trim()
});

export type CreateMatrixInput = z.infer<typeof createMatrixSchema>;

// ============================================
// Update Matrix
// ============================================

export const updateMatrixSchema = z.object({
  name: z.string()
    .min(1, 'Nama matrix tidak boleh kosong')
    .max(255, 'Nama matrix maksimal 255 karakter')
    .trim()
    .optional(),
  delete: z.boolean().optional() // soft delete flag
});

export type UpdateMatrixInput = z.infer<typeof updateMatrixSchema>;
