import express, { Router } from 'express';
import {
  getAllMatrices,
  getMatrixById,
  createMatrix,
  updateMatrix,
  deleteMatrix,
  getMatricesJson
} from '../controllers/matrixController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate);

// JSON API - any authenticated user
router.get('/json', getMatricesJson);

// Standard REST endpoints
router.get('/', authorize(1, 2, 3), getAllMatrices);
router.get('/:id', authorize(1, 2, 3), getMatrixById);
router.post('/', authorize(1, 2, 3), createMatrix);
router.put('/:id', authorize(1, 2, 3), updateMatrix);
router.delete('/:id', authorize(1, 2, 3), deleteMatrix);

export default router;













