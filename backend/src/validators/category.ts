import { z } from 'zod';

// ============================================
// Create Category
// ============================================

export const createCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(255, 'Category name must be at most 255 characters')
    .trim()
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// ============================================
// Update Category
// ============================================

export const updateCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(255, 'Category name must be at most 255 characters')
    .trim()
    .optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
