import { z } from 'zod';

// ============================================
// Create User
// ============================================

export const createUserSchema = z.object({
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Email tidak valid')
    .trim()
    .toLowerCase(),
  username: z.string()
    .min(1, 'Username wajib diisi')
    .trim(),
  display_name: z.string()
    .min(1, 'Display name wajib diisi')
    .trim(),
  role_id: z.number({ message: 'Role wajib dipilih' }),
  customer_id: z.number().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ============================================
// Update User
// ============================================

export const updateUserSchema = z.object({
  email: z.string()
    .email('Email tidak valid')
    .trim()
    .toLowerCase()
    .optional(),
  username: z.string()
    .min(1, 'Username tidak boleh kosong')
    .trim()
    .optional(),
  display_name: z.string()
    .min(1, 'Display name tidak boleh kosong')
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
    .regex(/^\d+$/, 'Limit harus berupa angka')
    .transform(Number)
    .optional(),
  offset: z.string()
    .regex(/^\d+$/, 'Offset harus berupa angka')
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
    .regex(/^\d+$/, 'Limit harus berupa angka')
    .transform(Number)
    .optional(),
  offset: z.string()
    .regex(/^\d+$/, 'Offset harus berupa angka')
    .transform(Number)
    .optional(),
  search: z.string().optional(),
  exclude_roles: z.string().optional(),
  include_roles: z.string().optional()
});

export type PublicUsersQuery = z.infer<typeof publicUsersQuerySchema>;
