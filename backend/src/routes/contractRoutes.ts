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
import { validate } from '../middleware/zodValidator';
import {
  idParamSchema,
  contractQuerySchema,
  contractJsonQuerySchema
} from '../validators';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// JSON endpoints (place before parameterized routes)
router.get('/json', validate(contractJsonQuerySchema, 'query'), getContractsJson);
router.get('/fetch-json', getContractsFetchJson);

// Customer-specific endpoint (must be before /:id)
router.get('/customer', getCustomerContract);

// CRUD operations
router.get('/', validate(contractQuerySchema, 'query'), getContracts);
router.post('/', authorize(1, 2, 3), createContract); // SuperAdmin, Admin, Sales
router.get('/:id', validate(idParamSchema, 'params'), getContractById);
router.put('/:id', authorize(1, 2, 3, 4), validate(idParamSchema, 'params'), updateContract); // SuperAdmin, Admin, Sales, AdministrationSupportHO
router.delete('/:id', authorize(1, 2, 3), validate(idParamSchema, 'params'), deleteContract); // SuperAdmin, Admin, Sales

export default router;
