import { z } from 'zod';
import { dateSchema } from './common';

// ============================================
// Create Unit
// ============================================

export const createUnitSchema = z.object({
  name: z.string()
    .min(1, 'Nama unit wajib diisi')
    .max(255, 'Nama unit maksimal 255 karakter')
    .trim(),
  description: z.string()
    .min(1, 'Deskripsi wajib diisi'),
  lab_id: z.number().optional()
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;

// ============================================
// Update Unit
// ============================================

export const updateUnitSchema = z.object({
  name: z.string()
    .min(1, 'Nama unit tidak boleh kosong')
    .max(255, 'Nama unit maksimal 255 karakter')
    .trim()
    .optional(),
  description: z.string()
    .min(1, 'Deskripsi tidak boleh kosong')
    .optional(),
  lab_id: z.number().nullable().optional()
});

export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

// ============================================
// Unit JSON Query
// ============================================

export const unitJsonQuerySchema = z.object({
  q: z.string().optional(),
  lab_id: z.string()
    .regex(/^\d+$/, 'Lab ID harus berupa angka')
    .transform(Number)
    .optional()
});

export type UnitJsonQuery = z.infer<typeof unitJsonQuerySchema>;

// ============================================
// Unit Report Query
// ============================================

export const unitReportQuerySchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  lab_id: z.string()
    .regex(/^\d+$/, 'Lab ID harus berupa angka')
    .transform(Number)
    .optional()
});

export type UnitReportQuery = z.infer<typeof unitReportQuerySchema>;
