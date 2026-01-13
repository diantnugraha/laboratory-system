import { z } from 'zod';

// ============================================
// Create Subcontractor
// ============================================

export const createSubcontractorSchema = z.object({
  lab_name: z.string()
    .min(1, 'Nama lab wajib diisi')
    .max(255, 'Nama lab maksimal 255 karakter')
    .trim(),
  address_name: z.string()
    .min(1, 'Alamat wajib diisi')
    .max(255, 'Alamat maksimal 255 karakter')
    .trim(),
  phone: z.string()
    .min(1, 'Telepon wajib diisi')
    .max(255, 'Telepon maksimal 255 karakter')
    .trim(),
  fax: z.string()
    .min(1, 'Fax wajib diisi')
    .max(255, 'Fax maksimal 255 karakter')
    .trim(),
  contact: z.string()
    .min(1, 'Kontak wajib diisi')
    .max(255, 'Kontak maksimal 255 karakter')
    .trim(),
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Email tidak valid')
    .max(255, 'Email maksimal 255 karakter')
    .trim()
    .toLowerCase()
});

export type CreateSubcontractorInput = z.infer<typeof createSubcontractorSchema>;

// ============================================
// Update Subcontractor
// ============================================

export const updateSubcontractorSchema = z.object({
  lab_name: z.string()
    .min(1, 'Nama lab tidak boleh kosong')
    .max(255, 'Nama lab maksimal 255 karakter')
    .trim()
    .optional(),
  address_name: z.string()
    .min(1, 'Alamat tidak boleh kosong')
    .max(255, 'Alamat maksimal 255 karakter')
    .trim()
    .optional(),
  phone: z.string()
    .min(1, 'Telepon tidak boleh kosong')
    .max(255, 'Telepon maksimal 255 karakter')
    .trim()
    .optional(),
  fax: z.string()
    .min(1, 'Fax tidak boleh kosong')
    .max(255, 'Fax maksimal 255 karakter')
    .trim()
    .optional(),
  contact: z.string()
    .min(1, 'Kontak tidak boleh kosong')
    .max(255, 'Kontak maksimal 255 karakter')
    .trim()
    .optional(),
  email: z.string()
    .email('Email tidak valid')
    .max(255, 'Email maksimal 255 karakter')
    .trim()
    .toLowerCase()
    .optional()
});

export type UpdateSubcontractorInput = z.infer<typeof updateSubcontractorSchema>;
