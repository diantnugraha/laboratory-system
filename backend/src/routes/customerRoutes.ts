import express, { Router } from 'express';
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
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

router.use(authenticate);

// JSON endpoints (place before parameterized routes)
router.get('/json', getCustomersJson);
router.get('/json-top', getTopRevenue);
router.get('/contacts/json', getContactsJson);
router.get('/fetch-json', getFetchJson);

// Sub-entity management
router.post('/addresses', manageAddress);
router.post('/contacts', manageContact);

// GET /api/customers - List customers with search, pagination, and filters (6 months data)
router.get('/', getCustomers);

// GET /api/customers/contacts - Get contacts for a specific customer
router.get('/contacts', getContacts);

// GET /api/customers/regions - Get distinct region values (city, state, or country)
router.get('/regions', getRegions);

// POST /api/customers - Create new customer with optional address and contact
router.post('/', createCustomer);

// PUT /api/customers/:id - Update customer
router.put('/:id', updateCustomer);

// DELETE /api/customers/:id - Soft delete customer
router.delete('/:id', deleteCustomer);

// GET /api/customers/:id - Get customer detail by ID with related data
// Must be last to avoid conflict with /contacts, /regions, /fetch, etc.
router.get('/:id', getCustomerDetail);

export default router;

