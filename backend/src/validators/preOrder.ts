import { z } from 'zod';

/**
 * PreOrder priority enum values
 */
export const preOrderPriorityEnum = z.enum([
  'normal',
  'urgent',
  'very-urgent',
  'special-request',
]);

/**
 * Lab type enum values (1 = Standard, 2 = Environmental)
 */
export const labTypeEnum = z.union([
  z.literal(1),
  z.literal(2),
]);

/**
 * Query schema for listing pre-orders
 */
export const preOrderQuerySchema = z.object({
  q_code: z.string().optional(),
  customer_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  creator: z.string().optional(),
  order_id: z.union([
    z.literal('null'),
    z.literal('notnull'),
    z.string().regex(/^\d+$/).transform(Number),
  ]).optional(),
  priority: preOrderPriorityEnum.optional(),
  received_date_start: z.string().optional(),
  received_date_end: z.string().optional(),
  characteristic: z.string().regex(/^[12]$/).transform(Number).optional(),
  complete_date: z.union([z.literal('null'), z.literal('notnull')]).optional(),
  lab: z.string().regex(/^[12]$/).transform(Number).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  order_by: z.string().optional(),
});

/**
 * Query schema for autocomplete
 */
export const preOrderJsonQuerySchema = z.object({
  q: z.string().optional(),
  customer_id: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Generate code query schema
 */
export const generateCodeQuerySchema = z.object({
  lab: z.string().regex(/^[12]$/).transform(Number).optional(),
});

/**
 * PreSample schema for create/update
 */
export const preSampleSchema = z.object({
  id: z.number().int().positive().optional(),
  standart_id: z.number().int().positive().nullable().optional(),
  code: z.string().max(255).optional(),
  name: z.string().min(1, 'Sample name is required').max(500),
  description: z.string().nullable().optional(),
  volume: z.string().max(255).nullable().optional(),
  sample_storage: z.string().max(255).nullable().optional(),
  priority: preOrderPriorityEnum.nullable().optional(),
  custom_fields: z.string().nullable().optional(),
  index_sample: z.number().int().optional(),
  index_array: z.number().int().optional(),
});

/**
 * Create pre-order schema
 */
export const createPreOrderSchema = z.object({
  customer_id: z.number().int().positive('Customer ID must be positive'),
  contact_id: z.number().int().positive('Contact ID must be positive'),
  quotation_id: z.number().int().positive().nullable().optional(),
  received_date: z.string().nullable().optional(),
  delivery: z.string().max(255).nullable().optional(),
  receipt_number: z.string().max(255).nullable().optional(),
  driver_id: z.number().int().positive().nullable().optional(),
  submited_by: z.string().min(1, 'Submited by is required').max(255),
  sample_quantity: z.number().int().min(1).optional().default(1),
  priority: preOrderPriorityEnum.nullable().optional(),
  document: z.string().max(255).nullable().optional(),
  covering_letter: z.string().max(255).nullable().optional(),
  testing_parameters: z.string().max(255).nullable().optional(),
  remarks: z.string().max(500).nullable().optional(),
  characteristic: z.number().int().min(1).max(2).nullable().optional(),
  lab: z.number().int().min(1).max(2),
  subcon: z.number().int().nullable().optional(),
  subcon_id: z.number().int().positive().nullable().optional(),
  subcon_due: z.string().nullable().optional(),
  notes_customer: z.string().max(255).nullable().optional(),
  samples: z.array(preSampleSchema).optional(),
});

/**
 * Update pre-order schema
 */
export const updatePreOrderSchema = z.object({
  customer_id: z.number().int().positive().optional(),
  contact_id: z.number().int().positive().optional(),
  quotation_id: z.number().int().positive().nullable().optional(),
  received_date: z.string().nullable().optional(),
  delivery: z.string().max(255).nullable().optional(),
  receipt_number: z.string().max(255).nullable().optional(),
  driver_id: z.number().int().positive().nullable().optional(),
  submited_by: z.string().min(1).max(255).optional(),
  sample_quantity: z.number().int().min(1).optional(),
  priority: preOrderPriorityEnum.nullable().optional(),
  document: z.string().max(255).nullable().optional(),
  covering_letter: z.string().max(255).nullable().optional(),
  testing_parameters: z.string().max(255).nullable().optional(),
  remarks: z.string().max(500).nullable().optional(),
  characteristic: z.number().int().min(1).max(2).nullable().optional(),
  lab: z.number().int().min(1).max(2).optional(),
  subcon: z.number().int().nullable().optional(),
  subcon_id: z.number().int().positive().nullable().optional(),
  subcon_due: z.string().nullable().optional(),
  notes_customer: z.string().max(255).nullable().optional(),
  samples: z.array(preSampleSchema).optional(),
});

/**
 * Create from quotation schema
 */
export const createFromQuotationSchema = z.object({
  submited_by: z.string().min(1, 'Submited by is required').max(255),
  received_date: z.string().nullable().optional(),
  delivery: z.string().max(255).nullable().optional(),
  receipt_number: z.string().max(255).nullable().optional(),
  driver_id: z.number().int().positive().nullable().optional(),
  priority: preOrderPriorityEnum.nullable().optional(),
  remarks: z.string().max(500).nullable().optional(),
  characteristic: z.number().int().min(1).max(2).nullable().optional(),
  notes_customer: z.string().max(255).nullable().optional(),
});

/**
 * DataTables query schema
 */
export const preOrderDataTablesSchema = z.object({
  sEcho: z.string().regex(/^\d+$/).transform(Number).optional(),
  iDisplayStart: z.string().regex(/^\d+$/).transform(Number).optional(),
  iDisplayLength: z.string().regex(/^\d+$/).transform(Number).optional(),
  sSearch: z.string().optional(),
  lab: z.string().regex(/^[12]$/).transform(Number).optional(),
});

// Type exports
export type PreOrderQuery = z.infer<typeof preOrderQuerySchema>;
export type PreOrderJsonQuery = z.infer<typeof preOrderJsonQuerySchema>;
export type GenerateCodeQuery = z.infer<typeof generateCodeQuerySchema>;
export type CreatePreOrderBody = z.infer<typeof createPreOrderSchema>;
export type UpdatePreOrderBody = z.infer<typeof updatePreOrderSchema>;
export type CreateFromQuotationBody = z.infer<typeof createFromQuotationSchema>;
export type PreSampleInput = z.infer<typeof preSampleSchema>;
export type PreOrderDataTablesQuery = z.infer<typeof preOrderDataTablesSchema>;
