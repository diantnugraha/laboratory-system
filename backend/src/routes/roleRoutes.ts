import express, { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getRoles, getRoleById } from '../controllers/roleController';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// List of roles (requires authentication)
router.get('/', getRoles);

// Get role detail by ID (requires authentication)
router.get('/:id', getRoleById);

export default router;














