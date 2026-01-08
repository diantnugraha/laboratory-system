import express, { Router } from 'express';
import {
  getAllParameters,
  getParameterById,
  createParameter,
  updateParameter,
  deleteParameter,
  getParameterJson,
  getParameterReport
} from '../controllers/parameterController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate);

// JSON API - any authenticated user
router.get('/json', getParameterJson);

// Report - SuperAdmin only
router.get('/report', authorize(1), getParameterReport);

// Standard REST endpoints
router.get('/', authorize(1, 2, 3), getAllParameters);
router.get('/:id', authorize(1, 2, 3), getParameterById);
router.post('/', authorize(1, 2, 3), createParameter);
router.put('/:id', authorize(1, 2, 3), updateParameter);
router.delete('/:id', authorize(1, 2, 3), deleteParameter);

export default router;














