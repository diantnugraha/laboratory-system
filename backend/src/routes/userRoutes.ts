import express, { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  getPublicUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersJson,
  getUsersFetchJson,
  resendWelcomeEmail,
  createUserFromContact
} from '../controllers/userController';
import {
  idParamSchema,
  createUserSchema,
  updateUserSchema,
  publicUsersQuerySchema
} from '../validators';

const router: Router = express.Router();

router.use(authenticate);

// JSON API endpoints - any authenticated user (must come before /:id route)
router.get('/json', getUsersJson);
router.get('/fetchJson', getUsersFetchJson);

// List of users (requires authentication and authorization)
router.get('/', authorize(1, 2), validate(publicUsersQuerySchema, 'query'), getPublicUsers);

// Get user detail by ID (requires authentication and authorization)
router.get('/:id', authorize(1, 2), validate(idParamSchema, 'params'), getUserById);

// Create user (requires SuperAdmin or HRDManager)
router.post('/', authorize(1, 2), validate(createUserSchema), createUser);

// Resend welcome email (requires SuperAdmin or HRDManager)
router.post('/resendWelcome/:id', authorize(1, 2), validate(idParamSchema, 'params'), resendWelcomeEmail);

// Create user from contact (requires SuperAdmin or HRDManager)
router.post('/from-contact', authorize(1, 2), createUserFromContact);

// Update user by ID (requires authentication and authorization)
router.put('/:id', authorize(1, 2), validateRequest({
  params: idParamSchema,
  body: updateUserSchema
}), updateUser);

// Delete user (requires SuperAdmin only)
router.delete('/:id', authorize(1), validate(idParamSchema, 'params'), deleteUser);

export default router;
