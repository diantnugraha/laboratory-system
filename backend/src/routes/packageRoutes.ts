import express, { Router } from 'express';
import {
  getPackageById,
  getAllPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getPackagesJson,
} from '../controllers/packageController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate);

// GET /api/packages/json - JSON API with contract pricing (any authenticated user)
router.get('/json', getPackagesJson);

// GET /api/packages - List dengan search (role-based: SuperAdmin, Admin, Sales, SampleReceivingStaff)
// Supports ?select=true for dropdown/select options
router.get('/', authorize(1, 2, 3, 4), getAllPackages);

// GET /api/packages/:id - Get detail (role-based: SuperAdmin, Admin, Sales, SampleReceivingStaff)
router.get('/:id', authorize(1, 2, 3, 4), getPackageById);

// POST /api/packages - Create (role-based: SuperAdmin, Sales)
router.post('/', authorize(1, 3), createPackage);

// PUT /api/packages/:id - Update (role-based: SuperAdmin, Sales)
router.put('/:id', authorize(1, 3), updatePackage);

// DELETE /api/packages/:id - Delete (role-based: SuperAdmin, Sales)
router.delete('/:id', authorize(1, 3), deletePackage);

export default router;

