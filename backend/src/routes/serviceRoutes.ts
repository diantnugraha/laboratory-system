import express, { Router } from 'express';
import {
  getServiceById,
  getAllServices,
  createService,
  updateService,
  deleteService,
  getServicesJson,
  getServicesJsonGlobal,
  getServicesJsonEnv,
  getServicesDataTable,
  getServiceStatistics,
  getServicesFetch,
  exportServiceReport,
  getGeneratedCode,
} from '../controllers/serviceController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate);

// JSON API endpoints - all authenticated users
router.get('/json', getServicesJson);
router.get('/json-global', getServicesJsonGlobal);
router.get('/json-env', getServicesJsonEnv);
router.get('/json2', getServicesDataTable);
router.get('/json-top', getServiceStatistics);
router.get('/fetch-json', getServicesFetch);

// Generate code endpoint - for creating new services
router.get('/generate-code', authorize(1, 2, 3), getGeneratedCode);

// Report endpoint - SuperAdmin only
router.get('/report', authorize(1), exportServiceReport);

// GET /api/services - List with search (role-based: SuperAdmin, Admin, Sales, Customer)
// Supports ?select=true for dropdown/select options
router.get('/', authorize(1, 2, 3, 8), getAllServices);

// GET /api/services/:id - Get detail (role-based: SuperAdmin, Admin, Sales, Customer)
router.get('/:id', authorize(1, 2, 3, 8), getServiceById);

// POST /api/services - Create (role-based: SuperAdmin, Sales)
router.post('/', authorize(1, 3), createService);

// PUT /api/services/:id - Update (role-based: SuperAdmin, Admin, Sales)
router.put('/:id', authorize(1, 2, 3), updateService);

// DELETE /api/services/:id - Delete (role-based: SuperAdmin, Admin, Sales)
router.delete('/:id', authorize(1, 2, 3), deleteService);

export default router;

