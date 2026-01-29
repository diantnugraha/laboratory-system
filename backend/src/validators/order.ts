import { z } from 'zod';

/**
 * Order status enum values
 */
export const orderStatusEnum = z.enum([
  'Created',
  'To Be Verified',
  'Need to Revise',
  'Reviewed',
  'Under Process',
  'Waiting Revision',
  'Customer Retest',
  'Complete',
  'Cancelled',
  'Payment Confirmation',
  'Subcontracted',
]);

/**
 * Review status enum (subset of order status)
 */
export const reviewStatusEnum = z.enum([
  'Reviewed',
  'To Be Verified',
  'Cancelled',
]);

/**
 * Order priority enum values
 */
export const orderPriorityEnum = z.enum([
  'Normal',
  'Urgent',
  'Very Urgent',
]);

/**
 * Query schema for listing orders
 */
export const orderQuerySchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
  customer_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  contact_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  lab: z.string().regex(/^\d+$/).transform(Number).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Query schema for autocomplete
 */
export const orderJsonQuerySchema = z.object({
  q: z.string().optional(),
  customer_id: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Service schema for sample worksheets
 */
export const sampleServiceSchema = z.object({
  service_id: z.number().int().positive('Service ID must be positive'),
  package_id: z.number().int().positive().nullable().optional(),
  discount: z.number().min(0).max(100).optional().default(0),
  price: z.number().min(0).optional(),
});

/**
 * Sample schema for order creation
 */
export const orderSampleSchema = z.object({
  name: z.string().min(1, 'Sample name is required'),
  description: z.string().nullable().optional(),
  quantity: z.number().int().positive().nullable().optional(),
  volume: z.string().nullable().optional(),
  sample_storage: z.string().nullable().optional(),
  packaging_type: z.string().nullable().optional(),
  standard_id: z.number().int().positive().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.string().optional().default('Normal'),
  lead_time: z.string().optional().default('Normal'),
  price: z.number().min(0).nullable().optional(),
  discount: z.number().min(0).max(100).nullable().optional(),
  services: z.array(sampleServiceSchema).optional().default([]),
});

/**
 * Create order schema
 */
export const createOrderSchema = z.object({
  customer_id: z.number().int().positive('Customer ID must be positive'),
  contact_id: z.number().int().positive('Contact ID must be positive'),
  address_id: z.number().int().positive().nullable().optional(),
  contract_id: z.number().int().positive().nullable().optional(),
  pre_order_id: z.number().int().positive().nullable().optional(),
  quotation_id: z.number().int().positive().nullable().optional(),
  status: orderStatusEnum.optional().default('Created'),
  priority: orderPriorityEnum.optional().default('Normal'),
  order_date: z.string().min(1, 'Order date is required'),
  due_date: z.string().nullable().optional(),
  sub_total: z.number().min(0).optional().default(0),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  discount_value: z.number().min(0).optional().default(0),
  vat_percent: z.number().min(0).max(100).optional().default(11),
  vat_value: z.number().min(0).optional().default(0),
  total: z.number().min(0).optional().default(0),
  remarks: z.string().trim().nullable().optional(),
  notes_internal: z.string().trim().nullable().optional(),
  lab: z.number().int().min(0).max(2).optional().default(0),
  // Samples with services for atomic creation
  samples: z.array(orderSampleSchema).optional().default([]),
});

/**
 * Update order schema
 */
export const updateOrderSchema = z.object({
  customer_id: z.number().int().positive().optional(),
  contact_id: z.number().int().positive().optional(),
  address_id: z.number().int().positive().nullable().optional(),
  contract_id: z.number().int().positive().nullable().optional(),
  pre_order_id: z.number().int().positive().nullable().optional(),
  quotation_id: z.number().int().positive().nullable().optional(),
  status: orderStatusEnum.optional(),
  priority: orderPriorityEnum.optional(),
  order_date: z.string().optional(),
  due_date: z.string().nullable().optional(),
  complete_date: z.string().nullable().optional(),
  sub_total: z.number().min(0).optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  discount_value: z.number().min(0).optional(),
  vat_percent: z.number().min(0).max(100).optional(),
  vat_value: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  remarks: z.string().trim().nullable().optional(),
  notes_internal: z.string().trim().nullable().optional(),
  lab: z.number().int().min(0).max(2).optional(),
});

/**
 * Update order status schema
 */
export const updateOrderStatusSchema = z.object({
  status: orderStatusEnum,
});

/**
 * Review order schema
 */
export const reviewOrderSchema = z.object({
  status: reviewStatusEnum,
  reason: z.string().max(500, 'Reason must be at most 500 characters').optional(),
});

/**
 * Upload payment schema (for body when using JSON)
 */
export const uploadPaymentSchema = z.object({
  payment_date: z.string().optional(),
});

/**
 * Create revision schema
 */
export const createRevisionSchema = z.object({
  reason: z.string().max(255, 'Reason must be at most 255 characters').optional(),
});

/**
 * Statistics query schema
 */
export const orderStatsQuerySchema = z.object({
  type: z.enum(['today', 'month', 'year']),
  invoice_date: z.string().transform(val => val === 'true' || val === '1').optional(),
});

// Type exports
export type OrderQuery = z.infer<typeof orderQuerySchema>;
export type CreateOrderBody = z.infer<typeof createOrderSchema>;
export type UpdateOrderBody = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusSchema>;
export type ReviewOrderBody = z.infer<typeof reviewOrderSchema>;
export type UploadPaymentBody = z.infer<typeof uploadPaymentSchema>;
export type CreateRevisionBody = z.infer<typeof createRevisionSchema>;
export type OrderStatsQuery = z.infer<typeof orderStatsQuerySchema>;
export type OrderSampleBody = z.infer<typeof orderSampleSchema>;
export type SampleServiceBody = z.infer<typeof sampleServiceSchema>;
