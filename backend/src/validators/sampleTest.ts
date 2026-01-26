import { z } from 'zod';

/**
 * Sample Test dashboard query schema
 * Used for all /api/sample-tests/* endpoints
 */
export const sampleTestQuerySchema = z.object({
  // Search filters
  search: z.string().optional(),
  q: z.string().optional(),
  q_code: z.string().optional(),
  q_order_code: z.string().optional(),

  // Entity filters
  customer_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  order_id: z.string().regex(/^\d+$/).transform(Number).optional(),

  // Status filters
  status: z.string().optional(),
  priority: z.string().optional(),

  // Date range filters - Analysis due date
  analysis_due_date_start: z.string().optional(),
  analysis_due_date_end: z.string().optional(),

  // Date range filters - Draft due date
  draft_date_start: z.string().optional(),
  draft_date_end: z.string().optional(),

  // Date range filters - COA release due date
  coa_release_due_date_less: z.string().optional(),
  coa_release_due_date_greater: z.string().optional(),

  // Analyst booking filter
  booked_by: z.string().optional(), // 'null' | 'notnull' | user_id

  // Analyst type filter
  analyst_type_id: z.string().regex(/^\d+$/).transform(Number).optional(),

  // Include options
  include: z.string().optional(), // comma-separated: 'customer,custom_fields,coa'

  // Grouping
  group_customer: z.string().transform((v) => v === 'true' || v === '1').optional(),

  // Pagination
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  per_page: z.string().regex(/^\d+$/).transform(Number).optional(),

  // Sorting
  order_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),

  // DataTable specific
  dataTable: z.string().transform((v) => v === 'true' || v === '1').optional(),
  iDisplayStart: z.string().regex(/^\d+$/).transform(Number).optional(),
  iDisplayLength: z.string().regex(/^\d+$/).transform(Number).optional(),
  iSortCol_0: z.string().regex(/^\d+$/).transform(Number).optional(),
  sSortDir_0: z.enum(['asc', 'desc']).optional(),
  sSearch: z.string().optional(),
  sEcho: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Sample delay query schema
 * Additional filters for delayed samples endpoint
 */
export const sampleDelayQuerySchema = sampleTestQuerySchema.extend({
  // Delayed samples are past COA release due date
  // No additional fields needed, but can add specific ones
});

/**
 * Sample today query schema
 */
export const sampleTodayQuerySchema = sampleTestQuerySchema.extend({
  // Samples due today
});

/**
 * Sample retest query schema
 */
export const sampleRetestQuerySchema = sampleTestQuerySchema.extend({
  retest_type: z.enum(['internal', 'customer']).optional(),
});

/**
 * Sample waiting payment query schema
 */
export const sampleWaitingPaymentQuerySchema = sampleTestQuerySchema.extend({
  // Samples waiting for payment (no payment document/date)
});

// Type exports
export type SampleTestQuery = z.infer<typeof sampleTestQuerySchema>;
export type SampleDelayQuery = z.infer<typeof sampleDelayQuerySchema>;
export type SampleTodayQuery = z.infer<typeof sampleTodayQuerySchema>;
export type SampleRetestQuery = z.infer<typeof sampleRetestQuerySchema>;
export type SampleWaitingPaymentQuery = z.infer<typeof sampleWaitingPaymentQuerySchema>;
