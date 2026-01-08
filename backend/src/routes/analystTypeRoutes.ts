import express, { Router } from 'express';
import {
  getAllAnalystTypes,
  getAnalystTypeById,
  createAnalystType,
  updateAnalystType,
  deleteAnalystType,
  getAnalystTypesJson,
  reverseAnalystTypes
} from '../controllers/analystTypeController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate);

// JSON endpoint - accessible to any authenticated user
router.get('/json', getAnalystTypesJson);

// Reverse migration endpoint - restricted to SuperAdmin/Admin only
router.get('/reverse', authorize(1, 2), reverseAnalystTypes);

// Standard REST endpoints - restricted to SuperAdmin/Admin only
router.get('/', authorize(1, 2), getAllAnalystTypes);
router.get('/:id', authorize(1, 2), getAnalystTypeById);
router.post('/', authorize(1, 2), createAnalystType);
router.put('/:id', authorize(1, 2), updateAnalystType);
router.delete('/:id', authorize(1, 2), deleteAnalystType);

export default router;














