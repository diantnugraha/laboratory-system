import { z } from 'zod';

/**
 * Worksheet status enum values
 */
export const worksheetStatusEnum = z.enum([
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
 * Query schema for listing worksheets
 */
export const worksheetQuerySchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
  sample_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  order_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  service_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  analyst_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  analyst_type_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.string().optional(),
  is_subcontract: z.string().transform(val => val === 'true' || val === '1').optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  priority: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Query schema for autocomplete/JSON endpoint
 * Supports no_count parameter for optimized queries without COUNT
 */
export const worksheetJsonQuerySchema = z.object({
  q: z.string().optional(),
  sample_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  no_count: z.string().transform(val => val === 'true' || val === '1').optional(),
});

/**
 * DataTables query schema
 */
export const worksheetDataTablesQuerySchema = z.object({
  sEcho: z.string().regex(/^\d+$/).transform(Number).optional(),
  iDisplayStart: z.string().regex(/^\d+$/).transform(Number).optional(),
  iDisplayLength: z.string().regex(/^\d+$/).transform(Number).optional(),
  sSearch: z.string().optional(),
  status: z.string().optional(),
  sample_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  is_subcontract: z.string().transform(val => val === 'true' || val === '1').optional(),
});

/**
 * Create worksheet schema
 */
export const createWorksheetSchema = z.object({
  sample_id: z.number().int().positive('Sample ID must be positive'),
  service_id: z.number().int().positive('Service ID must be positive'),
  package_id: z.number().int().positive().nullable().optional(),
  standart_id: z.number().int().positive().nullable().optional(),
  discount: z.number().min(0).max(100).nullable().optional(),
  index_array: z.number().int().nullable().optional(),
});

/**
 * Update worksheet result schema (Analyst submitting result)
 */
export const updateWorksheetResultSchema = z.object({
  result: z.string().nullable().optional(),
  n_result: z.string().nullable().optional(),
  unit: z.string().max(255).nullable().optional(),
  remarks: z.string().nullable().optional(),
  document: z.string().max(500).nullable().optional(),
});

/**
 * Verify worksheet schema (QC action)
 */
export const verifyWorksheetSchema = z.object({
  message: z.string().optional(),
});

/**
 * Approve worksheet schema (TM action)
 */
export const approveWorksheetSchema = z.object({
  message: z.string().optional(),
});

/**
 * Revision request schema (QC action)
 */
export const revisionRequestSchema = z.object({
  message: z.string().min(1, 'Revision message is required'),
});

/**
 * Retest request schema (QC/Customer action)
 */
export const retestRequestSchema = z.object({
  message: z.string().min(1, 'Retest message is required'),
});

/**
 * Quick submit schema
 */
export const quickSubmitSchema = z.object({
  worksheet_id: z.number().int().positive('Worksheet ID must be positive'),
  result: z.string().min(1, 'Result is required'),
  unit: z.string().max(255).optional(),
  n_result: z.string().optional(),
});

/**
 * Update subcontract schema
 */
export const updateSubcontractSchema = z.object({
  air_way_bill: z.string().max(255).nullable().optional(),
  subcon_send_date: z.string().nullable().optional(),
  subcon_received_date: z.string().nullable().optional(),
  subcon_end_date: z.string().nullable().optional(),
});

/**
 * Cancel worksheet schema
 */
export const cancelWorksheetSchema = z.object({
  reason: z.string().optional(),
});

/**
 * Report query schema
 */
export const reportQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD').optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD').optional(),
  type: z.enum(['M', 'C', '']).optional(), // M=Microbiology, C=Chemistry, ''=All
});

/**
 * Pagination query schema (for specialized list endpoints)
 */
export const paginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// Type exports
export type WorksheetQuery = z.infer<typeof worksheetQuerySchema>;
export type CreateWorksheetBody = z.infer<typeof createWorksheetSchema>;
export type UpdateWorksheetResultBody = z.infer<typeof updateWorksheetResultSchema>;
export type VerifyWorksheetBody = z.infer<typeof verifyWorksheetSchema>;
export type ApproveWorksheetBody = z.infer<typeof approveWorksheetSchema>;
export type RevisionRequestBody = z.infer<typeof revisionRequestSchema>;
export type RetestRequestBody = z.infer<typeof retestRequestSchema>;
export type QuickSubmitBody = z.infer<typeof quickSubmitSchema>;
export type UpdateSubcontractBody = z.infer<typeof updateSubcontractSchema>;
export type CancelWorksheetBody = z.infer<typeof cancelWorksheetSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type WorksheetPaginationQuery = z.infer<typeof paginationQuerySchema>;
