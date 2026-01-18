import { z } from 'zod';

// ============================================
// Standard Detail (nested)
// ============================================

const standartDetailSchema = z.object({
  id: z.number().optional(), // for update - existing detail ID
  service_id: z.number({ message: 'Service is required' }),
  min: z.number({ message: 'Min value is required' }),
  max: z.number({ message: 'Max value is required' }),
  unit: z.string()
    .min(1, 'Unit is required')
}).refine(data => data.min <= data.max, {
  message: 'Min value must be less than or equal to max',
  path: ['min']
});

export type StandartDetailInput = z.infer<typeof standartDetailSchema>;

// ============================================
// Create Standard
// ============================================

export const createStandardSchema = z.object({
  code: z.string()
    .min(1, 'Code is required')
    .trim(),
  name: z.string()
    .min(1, 'Name is required')
    .trim(),
  category_id: z.number().nullable().optional(),
  customer_id: z.number().nullable().optional(),
  standartDetails: z.array(standartDetailSchema)
    .min(1, 'At least 1 detail is required')
});

export type CreateStandardInput = z.infer<typeof createStandardSchema>;

// ============================================
// Update Standard
// ============================================

export const updateStandardSchema = z.object({
  code: z.string()
    .min(1, 'Code is required')
    .trim()
    .optional(),
  name: z.string()
    .min(1, 'Name is required')
    .trim()
    .optional(),
  category_id: z.number().nullable().optional(),
  customer_id: z.number().nullable().optional(),
  standartDetails: z.array(standartDetailSchema).optional()
});

export type UpdateStandardInput = z.infer<typeof updateStandardSchema>;

// ============================================
// Standard Query
// ============================================

export const standardQuerySchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .optional(),
  search: z.string().optional(),
  select: z.string().optional() // boolean flag as string for dropdown mode
});

export type StandardQuery = z.infer<typeof standardQuerySchema>;

// ============================================
// Standard JSON Query
// ============================================

export const standardJsonQuerySchema = z.object({
  q: z.string().optional(),
  customer_id: z.string()
    .regex(/^\d+$/, 'Customer ID must be a number')
    .transform(Number)
    .optional()
});

export type StandardJsonQuery = z.infer<typeof standardJsonQuerySchema>;

// ============================================
// Standard Fetch JSON Query
// ============================================

export const standardFetchJsonQuerySchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .optional(),
  search: z.string().optional()
});

export type StandardFetchJsonQuery = z.infer<typeof standardFetchJsonQuerySchema>;
