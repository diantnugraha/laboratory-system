import express, { Router } from 'express';
import {
  getAllUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  getUnitsJson,
  getUnitsReport
} from '../controllers/unitController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
  paginationSchema,
  createUnitSchema,
  updateUnitSchema,
  unitJsonQuerySchema,
  unitReportQuerySchema
} from '../validators';

const router: Router = express.Router();

router.use(authenticate);

// JSON API - any authenticated user
router.get('/json', validate(unitJsonQuerySchema, 'query'), getUnitsJson);

// Report - SuperAdmin only
router.get('/report', authorize(1), validate(unitReportQuerySchema, 'query'), getUnitsReport);

// Standard REST endpoints
router.get('/', authorize(1, 2), validate(paginationSchema, 'query'), getAllUnits);
router.get('/:id', authorize(1, 2), validate(idParamSchema, 'params'), getUnitById);
router.post('/', authorize(1, 2), validate(createUnitSchema), createUnit);
router.put('/:id', authorize(1, 2), validateRequest({
  params: idParamSchema,
  body: updateUnitSchema
}), updateUnit);
router.delete('/:id', authorize(1, 2), validate(idParamSchema, 'params'), deleteUnit);

export default router;
