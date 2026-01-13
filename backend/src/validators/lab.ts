import { z } from 'zod';

// ============================================
// Create Lab
// ============================================

export const createLabSchema = z.object({
  name: z.string()
    .min(1, 'Nama lab wajib diisi')
    .max(255, 'Nama lab maksimal 255 karakter')
    .trim()
});

export type CreateLabInput = z.infer<typeof createLabSchema>;

// ============================================
// Update Lab
// ============================================

export const updateLabSchema = z.object({
  name: z.string()
    .min(1, 'Nama lab tidak boleh kosong')
    .max(255, 'Nama lab maksimal 255 karakter')
    .trim()
    .optional()
});

export type UpdateLabInput = z.infer<typeof updateLabSchema>;
