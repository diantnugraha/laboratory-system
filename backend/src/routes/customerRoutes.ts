import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../plugins/auth.js';
import { validate } from '../plugins/zodValidator.js';
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
} from '../controllers/customerController.js';
import { idParamSchema, customerQuerySchema, customerJsonQuerySchema } from '../validators/index.js';
import { zodToSwagger } from '../schemas/swagger/index.js';

const customerRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all routes in this plugin
  fastify.addHook('preHandler', authenticate);

  // JSON endpoints (place before parameterized routes)
  fastify.get('/json', {
    schema: {
      description: 'Get customers in JSON format for autocomplete/select components',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(customerJsonQuerySchema)
    },
    preHandler: [validate(customerJsonQuerySchema, 'query')]
  }, getCustomersJson);

  fastify.get('/json-top', {
    schema: {
      description: 'Get top revenue customers',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }]
    }
  }, getTopRevenue);

  fastify.get('/contacts/json', {
    schema: {
      description: 'Get contacts in JSON format for autocomplete/select components',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }]
    }
  }, getContactsJson);

  fastify.get('/fetch-json', {
    schema: {
      description: 'Fetch customer data in JSON format',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }]
    }
  }, getFetchJson);

  // Sub-entity management
  fastify.post('/addresses', {
    schema: {
      description: 'Manage customer addresses (create, update, delete)',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['action', 'customer_id'],
        properties: {
          action: { type: 'string', enum: ['create', 'update', 'delete'] },
          customer_id: { type: 'number' },
          id: { type: 'number', description: 'Required for update/delete' },
          address_type: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' },
          fax: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          country: { type: 'string' },
          postal_code: { type: 'string' },
          npwp: { type: 'string' },
          status: { type: 'string' }
        }
      }
    }
  }, manageAddress);

  fastify.post('/contacts', {
    schema: {
      description: 'Manage customer contacts (create, update, delete)',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['action', 'customer_id'],
        properties: {
          action: { type: 'string', enum: ['create', 'update', 'delete'] },
          customer_id: { type: 'number' },
          id: { type: 'number', description: 'Required for update/delete' },
          address_id: { type: 'number' },
          title: { type: 'string' },
          first_name: { type: 'string' },
          middle_name: { type: 'string' },
          surname: { type: 'string' },
          username: { type: 'string' },
          job_title: { type: 'string' },
          department: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          fax: { type: 'string' },
          mobile_phone: { type: 'string' },
          status: { type: 'string' }
        }
      }
    }
  }, manageContact);

  // GET /api/customers - List customers with search, pagination, and filters (6 months data)
  fastify.get('/', {
    schema: {
      description: 'Get all customers with search, pagination, and filters. Returns data from the last 6 months by default.',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(customerQuerySchema)
    },
    preHandler: [validate(customerQuerySchema, 'query')]
  }, getCustomers);

  // GET /api/customers/contacts - Get contacts for a specific customer
  fastify.get('/contacts', {
    schema: {
      description: 'Get contacts for a specific customer',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          customer_id: { type: 'string', description: 'Customer ID' }
        }
      }
    }
  }, getContacts);

  // GET /api/customers/regions - Get distinct region values (city, state, or country)
  fastify.get('/regions', {
    schema: {
      description: 'Get distinct region values (city, state, or country) for autocomplete',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['city', 'state', 'country'], description: 'Region type to fetch' },
          q: { type: 'string', description: 'Search query' }
        }
      }
    }
  }, getRegions);

  // POST /api/customers - Create new customer with optional address and contact
  fastify.post('/', {
    schema: {
      description: 'Create a new customer with optional address and contact information',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['code', 'customer_name', 'business'],
        properties: {
          code: { type: 'string', description: 'Unique customer code' },
          customer_name: { type: 'string', description: 'Customer name' },
          business: { type: 'string', description: 'Business type' },
          zahir_id: { type: 'string' },
          npwp: { type: 'string' },
          legal_document: { type: 'string' },
          email: { type: 'string', format: 'email' },
          website: { type: 'string' },
          bank_name: { type: 'string' },
          account_name: { type: 'string' },
          account_number: { type: 'string' },
          bank_branch: { type: 'string' },
          bank_address: { type: 'string' },
          supplier_of: { type: 'string' },
          supplier_code: { type: 'string' },
          remarks: { type: 'string' },
          special_customer: { type: 'integer', enum: [0, 1] },
          top: { type: 'integer' },
          payment_middle: { type: 'integer', enum: [0, 1] },
          sales_incharge: { type: 'string' },
          sales_id: { type: 'integer' },
          ecoa: { type: 'integer', enum: [0, 1] },
          feeder: { type: 'string' },
          feeder_fee: { type: 'integer' },
          agency: { type: 'integer', enum: [0, 1] },
          sales_feeder: { type: 'integer', enum: [0, 1] },
          is_corporate: { type: 'integer', enum: [0, 1] },
          central_cust_id: { type: 'string' }
        }
      }
    }
  }, createCustomer);

  // PUT /api/customers/:id - Update customer
  fastify.put('/:id', {
    schema: {
      description: 'Update an existing customer',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          customer_name: { type: 'string' },
          business: { type: 'string' },
          email: { type: 'string', format: 'email' },
          npwp: { type: 'string' }
        }
      }
    },
    preHandler: [validate(idParamSchema, 'params')]
  }, updateCustomer);

  // DELETE /api/customers/:id - Soft delete customer
  fastify.delete('/:id', {
    schema: {
      description: 'Soft delete a customer (sets trash flag)',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [validate(idParamSchema, 'params')]
  }, deleteCustomer);

  // GET /api/customers/:id - Get customer detail by ID with related data
  // Must be last to avoid conflict with /contacts, /regions, /fetch, etc.
  fastify.get('/:id', {
    schema: {
      description: 'Get customer detail by ID with related addresses, contacts, and orders',
      tags: ['Customers'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [validate(idParamSchema, 'params')]
  }, getCustomerDetail);
};

export default customerRoutes;
