import { z } from 'zod';

// ============================================
// Login
// ============================================

export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================
// Register
// ============================================

export const registerSchema = z.object({
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
  role_id: z.number({ message: 'Role is required' })
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================
// Forgot Password
// ============================================

export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .trim()
    .toLowerCase()
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ============================================
// Reset Password
// ============================================

export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Token is required'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
    .min(1, 'Confirm password is required')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================
// Change Password
// ============================================

export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string()
    .min(1, 'Confirm password is required')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================
// Verify OTP
// ============================================

export const verifyOtpSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .trim()
    .toLowerCase(),
  otp: z.string()
    .min(1, 'OTP is required')
    .length(6, 'OTP must be 6 digits')
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
