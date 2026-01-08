import express, { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate);

// Standard REST endpoints
router.get('/', authorize(1, 2), getAllCategories);
router.get('/:id', authorize(1, 2), getCategoryById);
router.post('/', authorize(1, 2), createCategory);
router.put('/:id', authorize(1, 2), updateCategory);
router.delete('/:id', authorize(1, 2), deleteCategory);

export default router;













