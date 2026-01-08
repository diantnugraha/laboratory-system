import express, { Router } from 'express';
import {
  getAllUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  getUnitsJson,
  getUnitsReport
} from '../controllers/unitController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate);

// JSON API - any authenticated user
router.get('/json', getUnitsJson);

// Report - SuperAdmin only
router.get('/report', authorize(1), getUnitsReport);

// Standard REST endpoints
router.get('/', authorize(1, 2), getAllUnits);
router.get('/:id', authorize(1, 2), getUnitById);
router.post('/', authorize(1, 2), createUnit);
router.put('/:id', authorize(1, 2), updateUnit);
router.delete('/:id', authorize(1, 2), deleteUnit);

export default router;
