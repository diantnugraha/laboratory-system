import { z } from 'zod';

/**
 * Invoice status enum values
 */
export const invoiceStatusEnum = z.enum([
  'Prepared by admin',
  'Not Yet',
  'Sent',
  'PAID',
]);

/**
 * Query schema for listing invoices
 */
export const invoiceQuerySchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
  customer_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  contact_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Create invoice schema
 */
export const createInvoiceSchema = z.object({
  code: z.string().max(50).optional(),
  faktur_no: z.string().max(255).optional(),
  order_id: z.number().int().positive().nullable().optional(),
  remarks: z.string().optional(),
  description: z.string().optional(),
  invoice_date: z.string().optional(),
  invoice_send_date: z.string().optional(),
  purchase_order_no: z.string().max(255).optional(),
  customer_id: z.number().int().positive().optional(),
  contact_id: z.number().int().positive().optional(),
  address_id: z.number().int().positive().optional(),
  grand_total: z.number().min(0).optional(),
  sub_total: z.number().min(0).optional(),
  status: invoiceStatusEnum.optional().default('Prepared by admin'),
  order_ids: z.array(z.number().int().positive()).optional(),
});

/**
 * Update invoice schema
 */
export const updateInvoiceSchema = z.object({
  code: z.string().max(50).optional(),
  faktur_no: z.string().max(255).optional(),
  remarks: z.string().optional(),
  description: z.string().optional(),
  invoice_date: z.string().optional(),
  invoice_send_date: z.string().optional(),
  purchase_order_no: z.string().max(255).optional(),
  attached_document: z.string().max(255).optional(),
  awb_no: z.string().max(255).optional(),
  payment_status: z.string().max(255).optional(),
  payment_date: z.string().optional(),
  receipt_document: z.string().max(255).optional(),
  grand_total: z.number().min(0).optional(),
  sub_total: z.number().min(0).optional(),
  status: invoiceStatusEnum.optional(),
});

/**
 * Update invoice status schema
 */
export const updateInvoiceStatusSchema = z.object({
  status: invoiceStatusEnum,
});

/**
 * Mark invoice as sent schema
 */
export const markInvoiceSentSchema = z.object({
  send_date: z.string().min(1, 'Send date is required'),
});

/**
 * Mark invoice as paid schema
 */
export const markInvoicePaidSchema = z.object({
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_document: z.string().max(255).optional(),
});

/**
 * Add orders to invoice schema
 */
export const addOrdersToInvoiceSchema = z.object({
  order_ids: z.array(z.number().int().positive()).min(1, 'At least one order must be selected'),
});

/**
 * Invoice stats query schema
 */
export const invoiceStatsQuerySchema = z.object({
  type: z.enum(['today', 'month', 'year']),
});

// Type exports
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
export type CreateInvoiceBody = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceBody = z.infer<typeof updateInvoiceSchema>;
export type UpdateInvoiceStatusBody = z.infer<typeof updateInvoiceStatusSchema>;
export type MarkInvoiceSentBody = z.infer<typeof markInvoiceSentSchema>;
export type MarkInvoicePaidBody = z.infer<typeof markInvoicePaidSchema>;
export type AddOrdersToInvoiceBody = z.infer<typeof addOrdersToInvoiceSchema>;
export type InvoiceStatsQuery = z.infer<typeof invoiceStatsQuerySchema>;
