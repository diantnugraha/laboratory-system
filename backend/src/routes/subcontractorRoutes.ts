import express, { Router } from 'express';
import {
  getAllSubcontractors,
  getSubcontractorById,
  createSubcontractor,
  updateSubcontractor,
  deleteSubcontractor,
  getSubcontractorsJson
} from '../controllers/subcontractorController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate);

// JSON endpoint - any authenticated user can access
router.get('/json', getSubcontractorsJson);

// Standard REST endpoints
router.get('/', authorize(1, 3), getAllSubcontractors);
router.get('/:id', authorize(1, 3), getSubcontractorById);
router.post('/', authorize(1, 3), createSubcontractor);
router.put('/:id', authorize(1, 3), updateSubcontractor);
router.delete('/:id', authorize(1, 3), deleteSubcontractor);

export default router;














