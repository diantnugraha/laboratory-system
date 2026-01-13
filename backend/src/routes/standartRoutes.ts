import express, { Router } from 'express';
import {
  getStandardById,
  getAllStandards,
  createStandard,
  updateStandard,
  deleteStandard,
  getStandardsJson,
  getStandardsFetchJson,
} from '../controllers/standartController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
  createStandardSchema,
  updateStandardSchema,
  standardQuerySchema,
  standardJsonQuerySchema,
  standardFetchJsonQuerySchema
} from '../validators';

const router: Router = express.Router();

router.use(authenticate);

// GET /api/standards/json - JSON endpoint with customer filtering (role-based: Any authenticated user)
router.get('/json', validate(standardJsonQuerySchema, 'query'), getStandardsJson);

// GET /api/standards/fetchJson - JSON endpoint with pagination (role-based: SuperAdmin, COAAdminStaff)
router.get('/fetchJson', authorize(1, 2), validate(standardFetchJsonQuerySchema, 'query'), getStandardsFetchJson);

// GET /api/standards - List dengan search (role-based: SuperAdmin, COAAdminStaff, Admin, Customer)
// Supports ?select=true for dropdown/select options
router.get('/', authorize(1, 2, 5, 8), validate(standardQuerySchema, 'query'), getAllStandards);

// GET /api/standards/:id - Get detail (role-based: SuperAdmin, COAAdminStaff, Admin, Customer)
router.get('/:id', authorize(1, 2, 5, 8), validate(idParamSchema, 'params'), getStandardById);

// POST /api/standards - Create (role-based: SuperAdmin, COAAdminStaff, Admin)
router.post('/', authorize(1, 2, 5), validate(createStandardSchema), createStandard);

// PUT /api/standards/:id - Update (role-based: SuperAdmin, COAAdminStaff, Admin)
router.put('/:id', authorize(1, 2, 5), validateRequest({
  params: idParamSchema,
  body: updateStandardSchema
}), updateStandard);

// DELETE /api/standards/:id - Delete (role-based: SuperAdmin, COAAdminStaff, Admin)
router.delete('/:id', authorize(1, 2, 5), validate(idParamSchema, 'params'), deleteStandard);

export default router;
