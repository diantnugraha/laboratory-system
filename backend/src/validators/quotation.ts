import { z } from 'zod';

/**
 * Quotation status enum values
 */
export const quotationStatusEnum = z.enum(['Created', 'Order']);

/**
 * Lab type enum values
 */
export const labTypeEnum = z.enum(['1', '2']);

/**
 * Quotation priority enum values
 */
export const quotationPriorityEnum = z.enum(['normal', 'urgent', 'very urgent']);

/**
 * Query schema for listing quotations
 */
export const quotationQuerySchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
  q_code: z.string().optional(),
  customer_id: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  contact_id: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  status: z.string().optional(),
  search_status: z.string().optional(),
  search_sales: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
  lab: z.string().optional(),
  sort_subtotal: z.enum(['ASC', 'DESC', 'asc', 'desc']).optional(),
  order_by: z.string().optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  per_page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
});

/**
 * Query schema for autocomplete/JSON endpoint
 */
export const quotationJsonQuerySchema = z.object({
  q: z.string().optional(),
  customer_id: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  dataTable: z.string().optional(),
  pretty: z.string().optional(),
});

/**
 * Service input schema for quotation detail
 */
export const serviceInputSchema = z.object({
  id: z.number().int().positive('Service ID must be positive'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  discount: z.number().min(0).max(100).optional().default(0),
  id_detail: z.number().int().positive().optional(), // For updates
});

/**
 * Package input schema for quotation detail
 */
export const packageInputSchema = z.object({
  id: z.number().int().positive('Package ID must be positive'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  discount: z.number().min(0).max(100).optional().default(0),
  id_detail: z.string().optional(), // Format: {packageId}__{indexSample}
});

/**
 * Sample input schema
 */
export const sampleInputSchema = z.object({
  name: z.string().min(1, 'Sample name is required').max(255),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  priority: quotationPriorityEnum.optional().default('normal'),
  services: z.array(serviceInputSchema).optional(),
  packages: z.array(packageInputSchema).optional(),
});

/**
 * Product input schema
 */
export const productInputSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price must be positive'),
  discount: z.number().min(0).max(100).optional().default(0),
  id_detail: z.number().int().positive().optional(), // For updates
});

/**
 * Create quotation schema
 */
export const createQuotationSchema = z
  .object({
    quo_status: quotationStatusEnum.optional().default('Created'),
    quo_date: z.string().min(1, 'Quotation date is required'),
    sampling_request: z.union([z.boolean(), z.string(), z.number()]).optional(),
    sampling_date: z.string().nullable().optional(),
    customer_id: z.number().int().positive('Customer ID must be positive'),
    contact_id: z.number().int().positive('Contact ID must be positive'),
    address_id: z.number().int().positive('Address ID must be positive'),
    volume: z.string().trim().nullable().optional(),
    remarks: z.string().trim().nullable().optional(),
    min_volume_sample: z.string().min(1, 'Min volume sample is required').optional().default(''),
    sub_total: z.number().min(0).optional().default(0),
    percent_discount: z.number().min(0).max(100).optional().default(0),
    percent_vat: z.number().min(0).max(100).optional().default(11),
    percent_pc: z.number().min(0).max(100).nullable().optional(),
    price_group: z.number().int().positive().nullable().optional(),
    priority: quotationPriorityEnum.optional().default('normal'),
    lab: labTypeEnum.optional(),
    samples: z.array(sampleInputSchema).optional(),
    products: z.array(productInputSchema).optional(),
  })
  .refine(
    data => {
      // Ensure at least one sample or product exists
      const hasSamples = data.samples && data.samples.length > 0;
      const hasProducts = data.products && data.products.length > 0;
      return hasSamples || hasProducts;
    },
    {
      message: 'At least one sample or product is required',
    }
  );

/**
 * Update quotation schema
 */
export const updateQuotationSchema = z.object({
  quo_status: quotationStatusEnum.optional(),
  quo_date: z.string().optional(),
  sampling_request: z.union([z.boolean(), z.string(), z.number()]).optional(),
  sampling_date: z.string().nullable().optional(),
  customer_id: z.number().int().positive().optional(),
  contact_id: z.number().int().positive().optional(),
  address_id: z.number().int().positive().optional(),
  volume: z.string().trim().nullable().optional(),
  remarks: z.string().trim().nullable().optional(),
  min_volume_sample: z.string().optional(),
  sub_total: z.number().min(0).optional(),
  percent_discount: z.number().min(0).max(100).optional(),
  percent_vat: z.number().min(0).max(100).optional(),
  percent_pc: z.number().min(0).max(100).nullable().optional(),
  price_group: z.number().int().positive().nullable().optional(),
  priority: quotationPriorityEnum.optional(),
  lab: labTypeEnum.optional(),
  samples: z.array(sampleInputSchema).optional(),
  products: z.array(productInputSchema).optional(),
});

/**
 * Report query schema
 */
export const quotationReportQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  trash: z
    .string()
    .transform(val => val === 'true' || val === '1')
    .optional(),
});

/**
 * FetchJson query schema (for standard lab)
 */
export const fetchJsonQuerySchema = z.object({
  q_code: z.string().optional(),
  customer_id: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  search_status: z.string().optional(),
  search_sales: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
  per_page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  sort_subtotal: z.enum(['ASC', 'DESC', 'asc', 'desc']).optional(),
  pretty: z.string().optional(),
});

/**
 * FetchJsonEnv query schema (for environmental lab)
 */
export const fetchJsonEnvQuerySchema = z.object({
  q_code: z.string().optional(),
  customer_id: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  search_status: z.string().optional(),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
  per_page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
  order_by: z.string().optional(),
  pretty: z.string().optional(),
});

// Type exports
export type QuotationQuery = z.infer<typeof quotationQuerySchema>;
export type QuotationJsonQuery = z.infer<typeof quotationJsonQuerySchema>;
export type CreateQuotationBody = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationBody = z.infer<typeof updateQuotationSchema>;
export type QuotationReportQuery = z.infer<typeof quotationReportQuerySchema>;
export type FetchJsonQuery = z.infer<typeof fetchJsonQuerySchema>;
export type FetchJsonEnvQuery = z.infer<typeof fetchJsonEnvQuerySchema>;
export type ServiceInput = z.infer<typeof serviceInputSchema>;
export type PackageInput = z.infer<typeof packageInputSchema>;
export type SampleInput = z.infer<typeof sampleInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
