import { z } from 'zod';
import { flexibleDateSchema } from './common';

// ============================================
// Helper: String or Number to Number transform
// ============================================

const stringOrNumberToInt = z.union([
  z.string().regex(/^\d+$/).transform(Number),
  z.number().int()
]);

const stringOrNumberToFloat = z.union([
  z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number),
  z.number()
]);

// ============================================
// Contract Query
// ============================================

export const contractQuerySchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
  customer_id: z.string()
    .regex(/^\d+$/, 'Customer ID must be a number')
    .transform(Number)
    .optional(),
  period_to_start: z.string().optional(), // supports YYYY-MM-DD or DD-MM-YYYY
  period_to_end: z.string().optional(),
  priority: z.string()
    .regex(/^\d+$/, 'Priority must be a number')
    .transform(Number)
    .optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .optional(),
  offset: z.string()
    .regex(/^\d+$/, 'Offset must be a number')
    .transform(Number)
    .optional()
});

export type ContractQuery = z.infer<typeof contractQuerySchema>;

// ============================================
// Contract JSON Query
// ============================================

export const contractJsonQuerySchema = z.object({
  q: z.string().optional(),
  customer_id: z.string()
    .regex(/^\d+$/, 'Customer ID must be a number')
    .transform(Number)
    .optional()
});

export type ContractJsonQuery = z.infer<typeof contractJsonQuerySchema>;

// ============================================
// Service Detail Schema (for contract services)
// ============================================

export const serviceDetailSchema = z.object({
  service_id: stringOrNumberToInt,
  discount: stringOrNumberToFloat.optional(),
  'pc-urgent': stringOrNumberToInt.optional(),
  'pc-very-urgent': stringOrNumberToInt.optional(),
});

export type ServiceDetailInput = z.infer<typeof serviceDetailSchema>;

// ============================================
// Package Detail Schema (for contract packages)
// ============================================

export const packageDetailSchema = z.object({
  package_id: stringOrNumberToInt,
  discount: stringOrNumberToFloat.optional(),
  'pc-urgent': stringOrNumberToInt.optional(),
  'pc-very-urgent': stringOrNumberToInt.optional(),
});

export type PackageDetailInput = z.infer<typeof packageDetailSchema>;

// ============================================
// Create Contract Schema
// ============================================

export const createContractSchema = z.object({
  customer_id: stringOrNumberToInt,
  period: z.string().min(1, 'Period is required'),
  // Support both snake_case and camelCase for dates
  periode_from: flexibleDateSchema.optional(),
  periode_to: flexibleDateSchema.optional(),
  period_from: flexibleDateSchema.optional(),
  period_to: flexibleDateSchema.optional(),
  period_alias: z.string().optional().nullable(),
  normal_day: stringOrNumberToInt,
  urgent_day: stringOrNumberToInt,
  very_urgent_day: stringOrNumberToInt,
  status_service: z.enum(['all', 'selected']).optional(),
  statusService: z.enum(['all', 'selected']).optional(),
  discount: stringOrNumberToFloat.optional(),
  dsc_urgent: stringOrNumberToInt.optional(),
  dsc_very_urgent: stringOrNumberToInt.optional(),
  promotion_id: stringOrNumberToInt.optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
  contract_document: z.any().optional(),
  services: z.array(serviceDetailSchema).optional(),
  packages: z.array(packageDetailSchema).optional(),
}).refine(
  data => data.periode_from || data.period_from,
  { message: 'Period start date is required', path: ['period_from'] }
).refine(
  data => data.periode_to || data.period_to,
  { message: 'Period end date is required', path: ['period_to'] }
);

export type CreateContractInput = z.infer<typeof createContractSchema>;

// ============================================
// Update Contract Schema
// ============================================

export const updateContractSchema = z.object({
  code: z.string().max(255).optional(),
  customer_id: stringOrNumberToInt.optional(),
  period: z.string().min(1).optional(),
  periode_from: flexibleDateSchema.optional(),
  periode_to: flexibleDateSchema.optional(),
  period_from: flexibleDateSchema.optional(),
  period_to: flexibleDateSchema.optional(),
  period_alias: z.string().optional().nullable(),
  normal_day: stringOrNumberToInt.optional(),
  urgent_day: stringOrNumberToInt.optional(),
  very_urgent_day: stringOrNumberToInt.optional(),
  status_service: z.enum(['all', 'selected']).optional(),
  statusService: z.enum(['all', 'selected']).optional(),
  discount: stringOrNumberToFloat.optional(),
  dsc_urgent: stringOrNumberToInt.optional(),
  dsc_very_urgent: stringOrNumberToInt.optional(),
  promotion_id: stringOrNumberToInt.optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
  contract_document: z.any().optional(),
  services: z.array(serviceDetailSchema).optional(),
  packages: z.array(packageDetailSchema).optional(),
});

export type UpdateContractInput = z.infer<typeof updateContractSchema>;
