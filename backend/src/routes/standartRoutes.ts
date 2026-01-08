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

const router: Router = express.Router();

router.use(authenticate);

// GET /api/standards/json - JSON endpoint with customer filtering (role-based: Any authenticated user)
router.get('/json', getStandardsJson);

// GET /api/standards/fetchJson - JSON endpoint with pagination (role-based: SuperAdmin, COAAdminStaff)
router.get('/fetchJson', authorize(1, 2), getStandardsFetchJson);

// GET /api/standards - List dengan search (role-based: SuperAdmin, COAAdminStaff, Admin, Customer)
// Supports ?select=true for dropdown/select options
router.get('/', authorize(1, 2, 5, 8), getAllStandards);

// GET /api/standards/:id - Get detail (role-based: SuperAdmin, COAAdminStaff, Admin, Customer)
router.get('/:id', authorize(1, 2, 5, 8), getStandardById);

// POST /api/standards - Create (role-based: SuperAdmin, COAAdminStaff, Admin)
router.post('/', authorize(1, 2, 5), createStandard);

// PUT /api/standards/:id - Update (role-based: SuperAdmin, COAAdminStaff, Admin)
router.put('/:id', authorize(1, 2, 5), updateStandard);

// DELETE /api/standards/:id - Delete (role-based: SuperAdmin, COAAdminStaff, Admin)
router.delete('/:id', authorize(1, 2, 5), deleteStandard);

export default router;

