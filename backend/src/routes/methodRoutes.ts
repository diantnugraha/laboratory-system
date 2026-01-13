import express, { Router } from 'express';
import {
  getAllMethods,
  getMethodById,
  createMethod,
  updateMethod,
  deleteMethod,
  getMethodsJson,
  getMethodsReport
} from '../controllers/methodController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
  paginationSchema,
  createMethodSchema,
  updateMethodSchema,
  methodJsonQuerySchema,
  methodReportQuerySchema
} from '../validators';

const router: Router = express.Router();

router.use(authenticate);

// JSON API - any authenticated user
router.get('/json', validate(methodJsonQuerySchema, 'query'), getMethodsJson);

// Report - SuperAdmin only
router.get('/report', authorize(1), validate(methodReportQuerySchema, 'query'), getMethodsReport);

// Standard REST endpoints
router.get('/', authorize(1, 2, 3), validate(paginationSchema, 'query'), getAllMethods);
router.get('/:id', authorize(1, 2, 3), validate(idParamSchema, 'params'), getMethodById);
router.post('/', authorize(1, 2, 3), validate(createMethodSchema), createMethod);
router.put('/:id', authorize(1, 2, 3), validateRequest({
  params: idParamSchema,
  body: updateMethodSchema
}), updateMethod);
router.delete('/:id', authorize(1, 2, 3), validate(idParamSchema, 'params'), deleteMethod);

export default router;
