import { z } from 'zod';

// ============================================
// Role Query
// ============================================

export const roleQuerySchema = z.object({
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .optional(),
  offset: z.string()
    .regex(/^\d+$/, 'Offset must be a number')
    .transform(Number)
    .optional(),
  search: z.string().optional()
});

export type RoleQuery = z.infer<typeof roleQuerySchema>;
