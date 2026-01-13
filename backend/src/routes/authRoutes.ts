import express, { Router } from 'express';
import { z } from 'zod';
import { login, register, getProfile, logout, generatePassword, changePassword, forgotPassword, validateSetupToken, setupPassword, validateResetToken, resetPassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/zodValidator';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema
} from '../validators';

const router: Router = express.Router();

// ============================================
// Zod Schemas for Auth-specific validations
// ============================================

const generatePasswordSchema = z.object({
  user_id: z.number({ message: 'User ID wajib diisi' })
});

const changePasswordBodySchema = z.object({
  old_password: z.string()
    .min(1, 'Password lama wajib diisi'),
  new_password: z.string()
    .min(6, 'Password baru minimal 6 karakter')
});

const setupPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Token wajib diisi')
    .trim(),
  password: z.string()
    .min(8, 'Password minimal 8 karakter'),
  confirm_password: z.string()
    .min(1, 'Konfirmasi password wajib diisi')
}).refine(data => data.password === data.confirm_password, {
  message: 'Password tidak sama',
  path: ['confirm_password']
});

const resetPasswordBodySchema = z.object({
  token: z.string()
    .min(1, 'Token wajib diisi')
    .trim(),
  password: z.string()
    .min(8, 'Password minimal 8 karakter'),
  confirm_password: z.string()
    .min(1, 'Konfirmasi password wajib diisi')
}).refine(data => data.password === data.confirm_password, {
  message: 'Password tidak sama',
  path: ['confirm_password']
});

// ============================================
// Routes
// ============================================

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.get('/validate-setup-token', validateSetupToken);
router.post('/setup-password', validate(setupPasswordSchema), setupPassword);
router.get('/validate-reset-token', validateResetToken);
router.post('/reset-password', validate(resetPasswordBodySchema), resetPassword);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.post('/logout', authenticate, logout);
router.post('/generate-password', authenticate, validate(generatePasswordSchema), generatePassword);
router.post('/change-password', authenticate, validate(changePasswordBodySchema), changePassword);

export default router;
