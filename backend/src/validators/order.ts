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
 * Create order schema
 */
export const createOrderSchema = z.object({
  customer_id: z.number().int().positive('Customer ID harus positif'),
  contact_id: z.number().int().positive('Contact ID harus positif'),
  address_id: z.number().int().positive().nullable().optional(),
  contract_id: z.number().int().positive().nullable().optional(),
  pre_order_id: z.number().int().positive().nullable().optional(),
  quotation_id: z.number().int().positive().nullable().optional(),
  status: orderStatusEnum.optional().default('Created'),
  priority: orderPriorityEnum.optional().default('Normal'),
  order_date: z.string().min(1, 'Tanggal order wajib diisi'),
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

// Type exports
export type OrderQuery = z.infer<typeof orderQuerySchema>;
export type CreateOrderBody = z.infer<typeof createOrderSchema>;
export type UpdateOrderBody = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusSchema>;
