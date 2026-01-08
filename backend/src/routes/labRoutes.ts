import express, { Router } from 'express';
import {
  getAllLabs,
  getLabById,
  createLab,
  updateLab,
  deleteLab,
  getLabsJson
} from '../controllers/labController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate);

// JSON API - any authenticated user
router.get('/json', getLabsJson);

// Standard REST endpoints
router.get('/', authorize(1, 2), getAllLabs);
router.get('/:id', authorize(1, 2), getLabById);
router.post('/', authorize(1, 2), createLab);
router.put('/:id', authorize(1, 2), updateLab);
router.delete('/:id', authorize(1, 2), deleteLab);

export default router;














