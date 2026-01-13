import { z } from 'zod';

// ============================================
// Create Category
// ============================================

export const createCategorySchema = z.object({
  name: z.string()
    .min(1, 'Nama kategori wajib diisi')
    .max(255, 'Nama kategori maksimal 255 karakter')
    .trim()
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// ============================================
// Update Category
// ============================================

export const updateCategorySchema = z.object({
  name: z.string()
    .min(1, 'Nama kategori tidak boleh kosong')
    .max(255, 'Nama kategori maksimal 255 karakter')
    .trim()
    .optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
