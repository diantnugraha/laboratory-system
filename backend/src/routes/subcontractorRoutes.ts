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
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
  paginationSchema,
  autocompleteQuerySchema,
  createSubcontractorSchema,
  updateSubcontractorSchema
} from '../validators';

const router: Router = express.Router();

router.use(authenticate);

// JSON endpoint - any authenticated user can access
router.get('/json', validate(autocompleteQuerySchema, 'query'), getSubcontractorsJson);

// Standard REST endpoints
router.get('/', authorize(1, 3), validate(paginationSchema, 'query'), getAllSubcontractors);
router.get('/:id', authorize(1, 3), validate(idParamSchema, 'params'), getSubcontractorById);
router.post('/', authorize(1, 3), validate(createSubcontractorSchema), createSubcontractor);
router.put('/:id', authorize(1, 3), validateRequest({
  params: idParamSchema,
  body: updateSubcontractorSchema
}), updateSubcontractor);
router.delete('/:id', authorize(1, 3), validate(idParamSchema, 'params'), deleteSubcontractor);

export default router;
