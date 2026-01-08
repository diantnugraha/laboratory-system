import express, { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import {
  getPublicUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersJson,
  getUsersFetchJson,
  resendWelcomeEmail
} from '../controllers/userController';

const router: Router = express.Router();

router.use(authenticate);

// JSON API endpoints - any authenticated user (must come before /:id route)
router.get('/json', getUsersJson);
router.get('/fetchJson', getUsersFetchJson);

// List of users (requires authentication and authorization)
router.get('/', authorize(1, 2), getPublicUsers);

// Get user detail by ID (requires authentication and authorization)
router.get('/:id', authorize(1, 2), getUserById);

// Create user (requires SuperAdmin or HRDManager)
router.post('/', authorize(1, 2), createUser);

// Resend welcome email (requires SuperAdmin or HRDManager)
router.post('/resendWelcome/:id', authorize(1, 2), resendWelcomeEmail);

// Update user validation
const updateUserValidation: ValidationChain[] = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),
  body('display_name')
    .trim()
    .notEmpty()
    .withMessage('Display name is required'),
  body('role_id')
    .notEmpty()
    .withMessage('Role ID is required')
    .isInt()
    .withMessage('Role ID must be a valid number')
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

// Update user by ID (requires authentication and authorization)
router.put('/:id', ...updateUserValidation, handleValidationErrors, updateUser);

// Delete user (requires SuperAdmin only)
router.delete('/:id', authorize(1), deleteUser);

export default router;
