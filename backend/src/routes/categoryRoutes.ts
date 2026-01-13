import express, { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  getCategoriesJson,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
  paginationSchema,
  autocompleteQuerySchema,
  createCategorySchema,
  updateCategorySchema
} from '../validators';

const router: Router = express.Router();

router.use(authenticate);

// JSON endpoint for autocomplete (MUST be before /:id)
router.get('/json', validate(autocompleteQuerySchema, 'query'), getCategoriesJson);

// Standard REST endpoints
router.get('/', authorize(1, 2), validate(paginationSchema, 'query'), getAllCategories);
router.get('/:id', authorize(1, 2), validate(idParamSchema, 'params'), getCategoryById);
router.post('/', authorize(1, 2), validate(createCategorySchema), createCategory);
router.put('/:id', authorize(1, 2), validateRequest({
  params: idParamSchema,
  body: updateCategorySchema
}), updateCategory);
router.delete('/:id', authorize(1, 2), validate(idParamSchema, 'params'), deleteCategory);

export default router;
