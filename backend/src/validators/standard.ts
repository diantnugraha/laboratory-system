import { z } from 'zod';

// ============================================
// Standard Detail (nested)
// ============================================

const standartDetailSchema = z.object({
  id: z.number().optional(), // for update - existing detail ID
  service_id: z.number({ message: 'Service wajib dipilih' }),
  min: z.number({ message: 'Nilai min wajib diisi' }),
  max: z.number({ message: 'Nilai max wajib diisi' }),
  unit: z.string()
    .min(1, 'Unit wajib diisi')
}).refine(data => data.min <= data.max, {
  message: 'Nilai min harus kurang dari atau sama dengan max',
  path: ['min']
});

export type StandartDetailInput = z.infer<typeof standartDetailSchema>;

// ============================================
// Create Standard
// ============================================

export const createStandardSchema = z.object({
  code: z.string()
    .min(1, 'Kode wajib diisi')
    .trim(),
  name: z.string()
    .min(1, 'Nama wajib diisi')
    .trim(),
  category_id: z.number().nullable().optional(),
  customer_id: z.number().nullable().optional(),
  standartDetails: z.array(standartDetailSchema)
    .min(1, 'Minimal 1 detail wajib diisi')
});

export type CreateStandardInput = z.infer<typeof createStandardSchema>;

// ============================================
// Update Standard
// ============================================

export const updateStandardSchema = z.object({
  code: z.string()
    .min(1, 'Kode tidak boleh kosong')
    .trim()
    .optional(),
  name: z.string()
    .min(1, 'Nama tidak boleh kosong')
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
    .regex(/^\d+$/, 'Page harus berupa angka')
    .transform(Number)
    .optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit harus berupa angka')
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
    .regex(/^\d+$/, 'Customer ID harus berupa angka')
    .transform(Number)
    .optional()
});

export type StandardJsonQuery = z.infer<typeof standardJsonQuerySchema>;

// ============================================
// Standard Fetch JSON Query
// ============================================

export const standardFetchJsonQuerySchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page harus berupa angka')
    .transform(Number)
    .optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit harus berupa angka')
    .transform(Number)
    .optional(),
  search: z.string().optional()
});

export type StandardFetchJsonQuery = z.infer<typeof standardFetchJsonQuerySchema>;
