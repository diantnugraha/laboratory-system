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
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
  paginationSchema,
  autocompleteQuerySchema,
  createAnalystTypeSchema,
  updateAnalystTypeSchema
} from '../validators';

const router: Router = express.Router();

router.use(authenticate);

// JSON endpoint - accessible to any authenticated user
router.get('/json', validate(autocompleteQuerySchema, 'query'), getAnalystTypesJson);

// Reverse migration endpoint - restricted to SuperAdmin/Admin only
router.get('/reverse', authorize(1, 2), reverseAnalystTypes);

// Standard REST endpoints - restricted to SuperAdmin/Admin only
router.get('/', authorize(1, 2), validate(paginationSchema, 'query'), getAllAnalystTypes);
router.get('/:id', authorize(1, 2), validate(idParamSchema, 'params'), getAnalystTypeById);
router.post('/', authorize(1, 2), validate(createAnalystTypeSchema), createAnalystType);
router.put('/:id', authorize(1, 2), validateRequest({
  params: idParamSchema,
  body: updateAnalystTypeSchema
}), updateAnalystType);
router.delete('/:id', authorize(1, 2), validate(idParamSchema, 'params'), deleteAnalystType);

export default router;
