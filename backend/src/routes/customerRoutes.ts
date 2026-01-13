import express, { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/zodValidator';
import {
  getCustomers,
  getCustomerDetail,
  getCustomersJson,
  getTopRevenue,
  getContactsJson,
  getFetchJson,
  manageAddress,
  manageContact,
  getContacts,
  getRegions,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController';
import { idParamSchema, customerQuerySchema, customerJsonQuerySchema } from '../validators';

const router: Router = express.Router();

router.use(authenticate);

// JSON endpoints (place before parameterized routes)
router.get('/json', validate(customerJsonQuerySchema, 'query'), getCustomersJson);
router.get('/json-top', getTopRevenue);
router.get('/contacts/json', getContactsJson);
router.get('/fetch-json', getFetchJson);

// Sub-entity management
router.post('/addresses', manageAddress);
router.post('/contacts', manageContact);

// GET /api/customers - List customers with search, pagination, and filters (6 months data)
router.get('/', validate(customerQuerySchema, 'query'), getCustomers);

// GET /api/customers/contacts - Get contacts for a specific customer
router.get('/contacts', getContacts);

// GET /api/customers/regions - Get distinct region values (city, state, or country)
router.get('/regions', getRegions);

// POST /api/customers - Create new customer with optional address and contact
router.post('/', createCustomer);

// PUT /api/customers/:id - Update customer
router.put('/:id', validate(idParamSchema, 'params'), updateCustomer);

// DELETE /api/customers/:id - Soft delete customer
router.delete('/:id', validate(idParamSchema, 'params'), deleteCustomer);

// GET /api/customers/:id - Get customer detail by ID with related data
// Must be last to avoid conflict with /contacts, /regions, /fetch, etc.
router.get('/:id', validate(idParamSchema, 'params'), getCustomerDetail);

export default router;
