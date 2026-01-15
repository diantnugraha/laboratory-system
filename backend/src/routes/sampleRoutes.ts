import express, { Router } from 'express';
import {
  getAllSamples,
  getSampleById,
  getSamplesJson,
  getSamplesByOrder,
  createSample,
  updateSample,
  updateSampleStatus,
  deleteSample,
  getGeneratedCode,
} from '../controllers/sampleController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
} from '../validators';
import {
  sampleQuerySchema,
  sampleJsonQuerySchema,
  createSampleSchema,
  updateSampleSchema,
  updateSampleStatusSchema,
} from '../validators/sample';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// ===== Utility endpoints (before parameterized routes) =====

// JSON API endpoint - for autocomplete/dropdown
router.get('/json', validate(sampleJsonQuerySchema, 'query'), getSamplesJson);

// Generate code endpoint - for creating new samples
router.get('/generate-code', authorize(1, 2, 3), getGeneratedCode);

// Get samples by order
router.get('/by-order/:orderId', authorize(1, 2, 3, 8), getSamplesByOrder);

// ===== CRUD operations =====

// GET /api/samples - List with search (role-based: SuperAdmin, Admin, Sales, Customer)
router.get('/', authorize(1, 2, 3, 8), validate(sampleQuerySchema, 'query'), getAllSamples);

// GET /api/samples/:id - Get detail
router.get('/:id', authorize(1, 2, 3, 8), validate(idParamSchema, 'params'), getSampleById);

// POST /api/samples - Create (role-based: SuperAdmin, Admin, Sales)
router.post('/', authorize(1, 2, 3), validate(createSampleSchema), createSample);

// PUT /api/samples/:id - Update
router.put('/:id', authorize(1, 2, 3), validateRequest({
  params: idParamSchema,
  body: updateSampleSchema,
}), updateSample);

// PATCH /api/samples/:id/status - Update status
router.patch('/:id/status', authorize(1, 2, 3), validateRequest({
  params: idParamSchema,
  body: updateSampleStatusSchema,
}), updateSampleStatus);

// DELETE /api/samples/:id - Delete
router.delete('/:id', authorize(1, 2), validate(idParamSchema, 'params'), deleteSample);

export default router;
