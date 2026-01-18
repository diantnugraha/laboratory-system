import { z } from 'zod';

/**
 * Sample status enum values
 */
export const sampleStatusEnum = z.enum([
  'Process',
  'To Be Verified',
  'Need to Revised',
  'Internal Retest',
  'Customer Retest',
  'Verified by QC',
  'Approved by TM',
  'Cancel',
]);

/**
 * Query schema for listing samples
 */
export const sampleQuerySchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
  order_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  customer_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Query schema for autocomplete
 */
export const sampleJsonQuerySchema = z.object({
  q: z.string().optional(),
  order_id: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Create sample schema
 */
export const createSampleSchema = z.object({
  order_id: z.number().int().positive('Order ID must be positive'),
  standart_id: z.number().int().positive().nullable().optional(),
  name: z.string().min(1, 'Sample name is required').max(255, 'Name must be at most 255 characters'),
  description: z.string().trim().nullable().optional(),
  sample_type: z.string().max(100).nullable().optional(),
  sample_condition: z.string().max(255).nullable().optional(),
  sampling_date: z.string().nullable().optional(),
  received_date: z.string().nullable().optional(),
  quantity: z.number().int().min(1).optional().default(1),
  unit: z.string().max(50).nullable().optional(),
  status: sampleStatusEnum.optional().default('Process'),
  due_date: z.string().nullable().optional(),
  coa_release_due_date: z.string().nullable().optional(),
});

/**
 * Update sample schema
 */
export const updateSampleSchema = z.object({
  standart_id: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().trim().nullable().optional(),
  sample_type: z.string().max(100).nullable().optional(),
  sample_condition: z.string().max(255).nullable().optional(),
  sampling_date: z.string().nullable().optional(),
  received_date: z.string().nullable().optional(),
  quantity: z.number().int().min(1).optional(),
  unit: z.string().max(50).nullable().optional(),
  status: sampleStatusEnum.optional(),
  due_date: z.string().nullable().optional(),
  coa_release_due_date: z.string().nullable().optional(),
  analysis_finished_date: z.string().nullable().optional(),
  lead_time: z.string().max(50).nullable().optional(),
});

/**
 * Update sample status schema
 */
export const updateSampleStatusSchema = z.object({
  status: sampleStatusEnum,
});

// Type exports
export type SampleQuery = z.infer<typeof sampleQuerySchema>;
export type CreateSampleBody = z.infer<typeof createSampleSchema>;
export type UpdateSampleBody = z.infer<typeof updateSampleSchema>;
export type UpdateSampleStatusBody = z.infer<typeof updateSampleStatusSchema>;
