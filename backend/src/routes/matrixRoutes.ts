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
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
  paginationSchema,
  autocompleteQuerySchema,
  createMatrixSchema,
  updateMatrixSchema
} from '../validators';

const router: Router = express.Router();

router.use(authenticate);

// JSON API - any authenticated user
router.get('/json', validate(autocompleteQuerySchema, 'query'), getMatricesJson);

// Standard REST endpoints
router.get('/', authorize(1, 2, 3), validate(paginationSchema, 'query'), getAllMatrices);
router.get('/:id', authorize(1, 2, 3), validate(idParamSchema, 'params'), getMatrixById);
router.post('/', authorize(1, 2, 3), validate(createMatrixSchema), createMatrix);
router.put('/:id', authorize(1, 2, 3), validateRequest({
  params: idParamSchema,
  body: updateMatrixSchema
}), updateMatrix);
router.delete('/:id', authorize(1, 2, 3), validate(idParamSchema, 'params'), deleteMatrix);

export default router;
