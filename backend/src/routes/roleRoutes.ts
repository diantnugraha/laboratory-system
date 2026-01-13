import express, { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/zodValidator';
import { getRoles, getRoleById } from '../controllers/roleController';
import { idParamSchema, roleQuerySchema } from '../validators';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// List of roles (requires authentication)
router.get('/', validate(roleQuerySchema, 'query'), getRoles);

// Get role detail by ID (requires authentication)
router.get('/:id', validate(idParamSchema, 'params'), getRoleById);

export default router;
