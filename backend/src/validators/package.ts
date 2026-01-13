import { z } from 'zod';

// ============================================
// Create Package
// ============================================

export const createPackageSchema = z.object({
  name: z.string()
    .min(1, 'Nama package wajib diisi')
    .trim(),
  description: z.string().trim().optional(),
  services: z.array(z.number()).optional() // array of service IDs
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;

// ============================================
// Update Package
// ============================================

export const updatePackageSchema = z.object({
  name: z.string()
    .min(1, 'Nama package tidak boleh kosong')
    .trim()
    .optional(),
  description: z.string().trim().nullable().optional(),
  services: z.array(z.number()).optional()
});

export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

// ============================================
// Package Query
// ============================================

export const packageQuerySchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page harus berupa angka')
    .transform(Number)
    .optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit harus berupa angka')
    .transform(Number)
    .optional(),
  search: z.string().optional(),
  select: z.string().optional() // boolean flag as string for dropdown mode
});

export type PackageQuery = z.infer<typeof packageQuerySchema>;

// ============================================
// Package JSON Query
// ============================================

export const packageJsonQuerySchema = z.object({
  q: z.string().optional()
});

export type PackageJsonQuery = z.infer<typeof packageJsonQuerySchema>;
