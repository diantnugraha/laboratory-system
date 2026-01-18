import { z } from 'zod';

// ============================================
// Create Subcontractor
// ============================================

export const createSubcontractorSchema = z.object({
  lab_name: z.string()
    .min(1, 'Lab name is required')
    .max(255, 'Lab name must be at most 255 characters')
    .trim(),
  address_name: z.string()
    .min(1, 'Address is required')
    .max(255, 'Address must be at most 255 characters')
    .trim(),
  phone: z.string()
    .min(1, 'Phone is required')
    .max(255, 'Phone must be at most 255 characters')
    .trim(),
  fax: z.string()
    .min(1, 'Fax is required')
    .max(255, 'Fax must be at most 255 characters')
    .trim(),
  contact: z.string()
    .min(1, 'Contact is required')
    .max(255, 'Contact must be at most 255 characters')
    .trim(),
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters')
    .trim()
    .toLowerCase()
});

export type CreateSubcontractorInput = z.infer<typeof createSubcontractorSchema>;

// ============================================
// Update Subcontractor
// ============================================

export const updateSubcontractorSchema = z.object({
  lab_name: z.string()
    .min(1, 'Lab name is required')
    .max(255, 'Lab name must be at most 255 characters')
    .trim()
    .optional(),
  address_name: z.string()
    .min(1, 'Address is required')
    .max(255, 'Address must be at most 255 characters')
    .trim()
    .optional(),
  phone: z.string()
    .min(1, 'Phone is required')
    .max(255, 'Phone must be at most 255 characters')
    .trim()
    .optional(),
  fax: z.string()
    .min(1, 'Fax is required')
    .max(255, 'Fax must be at most 255 characters')
    .trim()
    .optional(),
  contact: z.string()
    .min(1, 'Contact is required')
    .max(255, 'Contact must be at most 255 characters')
    .trim()
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters')
    .trim()
    .toLowerCase()
    .optional()
});

export type UpdateSubcontractorInput = z.infer<typeof updateSubcontractorSchema>;
