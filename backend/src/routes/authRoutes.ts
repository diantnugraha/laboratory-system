import express, { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { login, register, getProfile, logout, generatePassword, changePassword, forgotPassword, validateSetupToken, setupPassword, validateResetToken, resetPassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

// Validation rules
const loginValidation: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register validation - hanya validasi email
const registerValidation: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail()
];

// Generate password validation
const generatePasswordValidation: ValidationChain[] = [
  body('user_id')
    .notEmpty()
    .withMessage('User ID is required')
    .isInt()
    .withMessage('User ID must be a valid number')
];

// Change password validation
const changePasswordValidation: ValidationChain[] = [
  body('old_password')
    .notEmpty()
    .withMessage('Old password is required'),
  body('new_password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
];

// Forgot password validation (only email for sending reset link)
const forgotPasswordValidation: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail()
];

// Setup password validation
const setupPasswordValidation: ValidationChain[] = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Token is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('confirm_password')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Reset password validation
const resetPasswordValidation: ValidationChain[] = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Token is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('confirm_password')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Middleware to handle validation errors
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }
  next();
};

// Routes
router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);
router.get('/profile', authenticate, getProfile);
router.post('/logout', authenticate, logout);

// Generate password baru (6 karakter huruf saja) - requires authentication
router.post('/generate-password', authenticate, generatePasswordValidation, handleValidationErrors, generatePassword);

// Change password (user membuat password sendiri) - requires authentication
router.post('/change-password', authenticate, changePasswordValidation, handleValidationErrors, changePassword);

// Forgot password (send reset email) - public endpoint
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, forgotPassword);

// Setup password token validation - public endpoint
router.get('/validate-setup-token', validateSetupToken);

// Setup password - public endpoint
router.post('/setup-password', setupPasswordValidation, handleValidationErrors, setupPassword);

// Reset password token validation - public endpoint
router.get('/validate-reset-token', validateResetToken);

// Reset password - public endpoint
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, resetPassword);

export default router;














