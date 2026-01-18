import { z } from 'zod';
import { dateSchema } from './common';

// ============================================
// Create Method
// ============================================

export const createMethodSchema = z.object({
  name: z.string()
    .min(1, 'Method name is required')
    .max(255, 'Method name must be at most 255 characters')
    .trim(),
  matrix_id: z.coerce.number({ message: 'Matrix is required' }),
  status: z.string()
    .min(1, 'Status is required'),
  category_name: z.string().trim().nullable().optional(),
  description: z.string().nullable().optional(),
  instruction: z.string().nullable().optional()
});

export type CreateMethodInput = z.infer<typeof createMethodSchema>;

// ============================================
// Update Method
// ============================================

export const updateMethodSchema = z.object({
  name: z.string()
    .min(1, 'Method name is required')
    .max(255, 'Method name must be at most 255 characters')
    .trim()
    .optional(),
  code: z.string()
    .min(1, 'Code is required')
    .max(255, 'Code must be at most 255 characters')
    .trim()
    .optional(),
  matrix_id: z.coerce.number().optional(),
  status: z.string()
    .min(1, 'Status is required')
    .optional(),
  category_name: z.string().trim().nullable().optional(),
  description: z.string().nullable().optional(),
  instruction: z.string().nullable().optional(),
  // Soft delete flag - accepts boolean, '1', or 1
  delete: z.union([
    z.boolean(),
    z.literal('1').transform(() => true),
    z.literal(1).transform(() => true),
  ]).optional(),
  // Document file(s) to remove
  document_file: z.union([
    z.string(),
    z.array(z.string())
  ]).optional()
});

export type UpdateMethodInput = z.infer<typeof updateMethodSchema>;

// ============================================
// Method JSON Query
// ============================================

export const methodJsonQuerySchema = z.object({
  q: z.string().optional(),
  dataTable: z.union([
    z.literal('true').transform(() => true),
    z.literal('1').transform(() => true),
    z.undefined()
  ]).optional()
});

export type MethodJsonQuery = z.infer<typeof methodJsonQuerySchema>;

// ============================================
// Method Report Query
// ============================================

export const methodReportQuerySchema = z.object({
  start: dateSchema.optional(),
  end: dateSchema.optional()
});

export type MethodReportQuery = z.infer<typeof methodReportQuerySchema>;
