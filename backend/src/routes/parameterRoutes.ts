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
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
  paginationSchema,
  createParameterSchema,
  updateParameterSchema,
  parameterJsonQuerySchema,
  parameterReportQuerySchema
} from '../validators';

const router: Router = express.Router();

router.use(authenticate);

// JSON API - any authenticated user
router.get('/json', validate(parameterJsonQuerySchema, 'query'), getParameterJson);

// Report - SuperAdmin only
router.get('/report', authorize(1), validate(parameterReportQuerySchema, 'query'), getParameterReport);

// Standard REST endpoints
router.get('/', authorize(1, 2, 3), validate(paginationSchema, 'query'), getAllParameters);
router.get('/:id', authorize(1, 2, 3), validate(idParamSchema, 'params'), getParameterById);
router.post('/', authorize(1, 2, 3), validate(createParameterSchema), createParameter);
router.put('/:id', authorize(1, 2, 3), validateRequest({
  params: idParamSchema,
  body: updateParameterSchema
}), updateParameter);
router.delete('/:id', authorize(1, 2, 3), validate(idParamSchema, 'params'), deleteParameter);

export default router;
