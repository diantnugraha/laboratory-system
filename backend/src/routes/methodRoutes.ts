import express, { Router } from 'express';
import {
  getAllMethods,
  getMethodById,
  createMethod,
  updateMethod,
  deleteMethod,
  getMethodsJson,
  getMethodsReport
} from '../controllers/methodController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate);

// JSON API - any authenticated user
router.get('/json', getMethodsJson);

// Report - SuperAdmin only
router.get('/report', authorize(1), getMethodsReport);

// Standard REST endpoints
router.get('/', authorize(1, 2, 3), getAllMethods);
router.get('/:id', authorize(1, 2, 3), getMethodById);
router.post('/', authorize(1, 2, 3), createMethod);
router.put('/:id', authorize(1, 2, 3), updateMethod);
router.delete('/:id', authorize(1, 2, 3), deleteMethod);

export default router;
