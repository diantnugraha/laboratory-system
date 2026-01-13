import { z } from 'zod';

// ============================================
// Customer Query
// ============================================

export const customerQuerySchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit harus berupa angka')
    .transform(Number)
    .optional(),
  offset: z.string()
    .regex(/^\d+$/, 'Offset harus berupa angka')
    .transform(Number)
    .optional(),
  months: z.string()
    .regex(/^\d+$/, 'Months harus berupa angka')
    .transform(Number)
    .optional()
});

export type CustomerQuery = z.infer<typeof customerQuerySchema>;

// ============================================
// Customer JSON Query
// ============================================

export const customerJsonQuerySchema = z.object({
  q: z.string().optional(),
  dataTable: z.string().optional()
});

export type CustomerJsonQuery = z.infer<typeof customerJsonQuerySchema>;
