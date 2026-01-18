import { z } from 'zod';
import { dateSchema } from './common';

// ============================================
// Create Service
// ============================================

export const createServiceSchema = z.object({
  name: z.string()
    .min(1, 'Service name is required')
    .trim(),
  category_id: z.number().nullable().optional(),
  parameter_id: z.number().nullable().optional(),
  method_id: z.number().nullable().optional(),
  subcontractor_id: z.number().nullable().optional(),
  analyst_type_id: z.number().nullable().optional(),
  accreditation: z.string().trim().optional(),
  accreditation_valid_date: z.string().nullable().optional(),
  unit: z.string().trim().optional(),
  published_date: z.string().nullable().optional(),
  lod: z.number().nullable().optional(),
  loq: z.number().nullable().optional(),
  proficiency_test: z.string().trim().optional(),
  description: z.string().optional(),
  price: z.number().nullable().optional()
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

// ============================================
// Update Service
// ============================================

export const updateServiceSchema = z.object({
  name: z.string()
    .min(1, 'Service name is required')
    .trim()
    .optional(),
  code: z.string().trim().optional(),
  category_id: z.number().nullable().optional(),
  parameter_id: z.number().nullable().optional(),
  method_id: z.number().nullable().optional(),
  subcontractor_id: z.number().nullable().optional(),
  analyst_type_id: z.number().nullable().optional(),
  accreditation: z.string().trim().nullable().optional(),
  accreditation_valid_date: z.string().nullable().optional(),
  unit: z.string().trim().nullable().optional(),
  published_date: z.string().nullable().optional(),
  lod: z.number().nullable().optional(),
  loq: z.number().nullable().optional(),
  proficiency_test: z.string().trim().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  delete: z.boolean().optional() // soft delete flag
});

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

// ============================================
// Service Query
// ============================================

export const serviceQuerySchema = z.object({
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

export type ServiceQuery = z.infer<typeof serviceQuerySchema>;

// ============================================
// Service JSON Query
// ============================================

export const serviceJsonQuerySchema = z.object({
  q: z.string().optional(),
  category_id: z.string()
    .regex(/^\d+$/, 'Category ID must be a number')
    .transform(Number)
    .optional(),
  parameter_id: z.string()
    .regex(/^\d+$/, 'Parameter ID must be a number')
    .transform(Number)
    .optional()
});

export type ServiceJsonQuery = z.infer<typeof serviceJsonQuerySchema>;

// ============================================
// Service Report Query
// ============================================

export const serviceReportQuerySchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional()
});

export type ServiceReportQuery = z.infer<typeof serviceReportQuerySchema>;
