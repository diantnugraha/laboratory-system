import { z } from 'zod';

// ============================================
// Contract Query
// ============================================

export const contractQuerySchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
  customer_id: z.string()
    .regex(/^\d+$/, 'Customer ID harus berupa angka')
    .transform(Number)
    .optional(),
  period_to_start: z.string().optional(), // supports YYYY-MM-DD or DD-MM-YYYY
  period_to_end: z.string().optional(),
  priority: z.string()
    .regex(/^\d+$/, 'Priority harus berupa angka')
    .transform(Number)
    .optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit harus berupa angka')
    .transform(Number)
    .optional(),
  offset: z.string()
    .regex(/^\d+$/, 'Offset harus berupa angka')
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
    .regex(/^\d+$/, 'Customer ID harus berupa angka')
    .transform(Number)
    .optional()
});

export type ContractJsonQuery = z.infer<typeof contractJsonQuerySchema>;
