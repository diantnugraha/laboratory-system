import express, { Router } from 'express';
import {
  getContracts,
  getContractById,
  getCustomerContract,
  createContract,
  updateContract,
  deleteContract,
  getContractsJson,
  getContractsFetchJson,
} from '../controllers/contractController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// JSON endpoints (place before parameterized routes)
router.get('/json', getContractsJson);
router.get('/fetch-json', getContractsFetchJson);

// Customer-specific endpoint (must be before /:id)
router.get('/customer', getCustomerContract);

// CRUD operations
router.get('/', getContracts);
router.post('/', authorize(1, 2, 3), createContract); // SuperAdmin, Admin, Sales
router.get('/:id', getContractById);
router.put('/:id', authorize(1, 2, 3, 4), updateContract); // SuperAdmin, Admin, Sales, AdministrationSupportHO
router.delete('/:id', authorize(1, 2, 3), deleteContract); // SuperAdmin, Admin, Sales

export default router;

