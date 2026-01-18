import { z } from 'zod';

// ============================================
// Create User
// ============================================

export const createUserSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .trim()
    .toLowerCase(),
  username: z.string()
    .min(1, 'Username is required')
    .trim(),
  display_name: z.string()
    .min(1, 'Display name is required')
    .trim(),
  role_id: z.number({ message: 'Role is required' }),
  customer_id: z.number().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ============================================
// Update User
// ============================================

export const updateUserSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .trim()
    .toLowerCase()
    .optional(),
  username: z.string()
    .min(1, 'Username is required')
    .trim()
    .optional(),
  display_name: z.string()
    .min(1, 'Display name is required')
    .trim()
    .optional(),
  role_id: z.number().optional(),
  customer_id: z.number().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ============================================
// User Query
// ============================================

export const userQuerySchema = z.object({
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .optional(),
  offset: z.string()
    .regex(/^\d+$/, 'Offset must be a number')
    .transform(Number)
    .optional(),
  search: z.string().optional(),
  exclude_roles: z.string().optional(),
  include_roles: z.string().optional()
});

export type UserQuery = z.infer<typeof userQuerySchema>;

// ============================================
// Public Users Query
// ============================================

export const publicUsersQuerySchema = z.object({
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .optional(),
  offset: z.string()
    .regex(/^\d+$/, 'Offset must be a number')
    .transform(Number)
    .optional(),
  search: z.string().optional(),
  exclude_roles: z.string().optional(),
  include_roles: z.string().optional()
});

export type PublicUsersQuery = z.infer<typeof publicUsersQuerySchema>;
