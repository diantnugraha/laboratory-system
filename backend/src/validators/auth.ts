import { z } from 'zod';

// ============================================
// Login
// ============================================

export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Email tidak valid')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password wajib diisi')
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================
// Register
// ============================================

export const registerSchema = z.object({
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
  role_id: z.number({ message: 'Role wajib dipilih' })
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================
// Forgot Password
// ============================================

export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Email tidak valid')
    .trim()
    .toLowerCase()
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ============================================
// Reset Password
// ============================================

export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Token wajib diisi'),
  password: z.string()
    .min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string()
    .min(1, 'Konfirmasi password wajib diisi')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword']
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================
// Change Password
// ============================================

export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Password lama wajib diisi'),
  newPassword: z.string()
    .min(6, 'Password baru minimal 6 karakter'),
  confirmPassword: z.string()
    .min(1, 'Konfirmasi password wajib diisi')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword']
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================
// Verify OTP
// ============================================

export const verifyOtpSchema = z.object({
  email: z.string()
    .min(1, 'Email wajib diisi')
    .email('Email tidak valid')
    .trim()
    .toLowerCase(),
  otp: z.string()
    .min(1, 'OTP wajib diisi')
    .length(6, 'OTP harus 6 digit')
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
