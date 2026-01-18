import { z } from 'zod';
import { dateSchema } from './common';

// ============================================
// Create Unit
// ============================================

export const createUnitSchema = z.object({
  name: z.string()
    .min(1, 'Unit name is required')
    .max(255, 'Unit name must be at most 255 characters')
    .trim(),
  description: z.string()
    .min(1, 'Description is required'),
  lab_id: z.number().optional()
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;

// ============================================
// Update Unit
// ============================================

export const updateUnitSchema = z.object({
  name: z.string()
    .min(1, 'Unit name is required')
    .max(255, 'Unit name must be at most 255 characters')
    .trim()
    .optional(),
  description: z.string()
    .min(1, 'Description is required')
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
    .regex(/^\d+$/, 'Lab ID must be a number')
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
    .regex(/^\d+$/, 'Lab ID must be a number')
    .transform(Number)
    .optional()
});

export type UnitReportQuery = z.infer<typeof unitReportQuerySchema>;
