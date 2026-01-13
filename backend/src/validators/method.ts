import { z } from 'zod';
import { dateSchema } from './common';

// ============================================
// Create Method
// ============================================

export const createMethodSchema = z.object({
  name: z.string()
    .min(1, 'Nama metode wajib diisi')
    .max(255, 'Nama metode maksimal 255 karakter')
    .trim(),
  matrix_id: z.number({ message: 'Matrix wajib dipilih' }),
  status: z.string()
    .min(1, 'Status wajib diisi'),
  category_name: z.string().trim().optional(),
  description: z.string().optional(),
  instruction: z.string().optional()
});

export type CreateMethodInput = z.infer<typeof createMethodSchema>;

// ============================================
// Update Method
// ============================================

export const updateMethodSchema = z.object({
  name: z.string()
    .min(1, 'Nama metode tidak boleh kosong')
    .max(255, 'Nama metode maksimal 255 karakter')
    .trim()
    .optional(),
  code: z.string()
    .max(255, 'Kode maksimal 255 karakter')
    .trim()
    .optional(),
  matrix_id: z.number().optional(),
  status: z.string()
    .min(1, 'Status tidak boleh kosong')
    .optional(),
  category_name: z.string().trim().nullable().optional(),
  description: z.string().nullable().optional(),
  instruction: z.string().nullable().optional(),
  delete: z.boolean().optional() // soft delete flag
});

export type UpdateMethodInput = z.infer<typeof updateMethodSchema>;

// ============================================
// Method JSON Query
// ============================================

export const methodJsonQuerySchema = z.object({
  q: z.string().optional(),
  domain: z.string().optional()
});

export type MethodJsonQuery = z.infer<typeof methodJsonQuerySchema>;

// ============================================
// Method Report Query
// ============================================

export const methodReportQuerySchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional()
});

export type MethodReportQuery = z.infer<typeof methodReportQuerySchema>;
