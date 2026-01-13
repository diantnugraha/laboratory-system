import { z } from 'zod';

// ============================================
// Create Analyst Type
// ============================================

export const createAnalystTypeSchema = z.object({
  name: z.string()
    .min(1, 'Nama wajib diisi')
    .max(100, 'Nama maksimal 100 karakter')
    .trim(),
  list_service: z.string().trim().nullable().optional()
});

export type CreateAnalystTypeInput = z.infer<typeof createAnalystTypeSchema>;

// ============================================
// Update Analyst Type
// ============================================

export const updateAnalystTypeSchema = z.object({
  name: z.string()
    .min(1, 'Nama tidak boleh kosong')
    .max(100, 'Nama maksimal 100 karakter')
    .trim()
    .optional(),
  list_service: z.string().trim().nullable().optional()
});

export type UpdateAnalystTypeInput = z.infer<typeof updateAnalystTypeSchema>;
