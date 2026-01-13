import { z } from 'zod';
import { dateSchema } from './common';

// ============================================
// Create Parameter
// ============================================

export const createParameterSchema = z.object({
  name: z.string()
    .min(1, 'Nama parameter wajib diisi')
    .trim(),
  lab_id: z.number({ message: 'Lab wajib dipilih' })
});

export type CreateParameterInput = z.infer<typeof createParameterSchema>;

// ============================================
// Update Parameter
// ============================================

export const updateParameterSchema = z.object({
  name: z.string()
    .min(1, 'Nama parameter tidak boleh kosong')
    .trim()
    .optional(),
  lab_id: z.number().optional()
});

export type UpdateParameterInput = z.infer<typeof updateParameterSchema>;

// ============================================
// Parameter JSON Query
// ============================================

export const parameterJsonQuerySchema = z.object({
  q: z.string().optional(),
  pretty: z.string().optional()
});

export type ParameterJsonQuery = z.infer<typeof parameterJsonQuerySchema>;

// ============================================
// Parameter Report Query
// ============================================

export const parameterReportQuerySchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional()
});

export type ParameterReportQuery = z.infer<typeof parameterReportQuerySchema>;
