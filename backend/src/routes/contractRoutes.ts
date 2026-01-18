import type { FastifyPluginAsync } from 'fastify';
import {
  getContracts,
  getContractById,
  getCustomerContract,
  createContract,
  updateContract,
  deleteContract,
  getContractsJson,
  getContractsFetchJson,
  getGenerateCode,
} from '../controllers/contractController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  contractQuerySchema,
  contractJsonQuerySchema,
  createContractSchema,
  updateContractSchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const contractRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  // JSON endpoints (place before parameterized routes)
  fastify.get('/json', {
    schema: {
      description: 'Get contracts in JSON format for autocomplete/select components',
      tags: ['Contracts'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(contractJsonQuerySchema)
    },
    preHandler: [validate(contractJsonQuerySchema, 'query')]
  }, getContractsJson);

  fastify.get('/fetch-json', {
    schema: {
      description: 'Fetch contract data in JSON format',
      tags: ['Contracts'],
      security: [{ bearerAuth: [] }]
    }
  }, getContractsFetchJson);

  fastify.get('/generate-code', {
    schema: {
      description: 'Generate a new contract code',
      tags: ['Contracts'],
      security: [{ bearerAuth: [] }]
    }
  }, getGenerateCode);

  // Customer-specific endpoint (must be before /:id)
  fastify.get('/customer', {
    schema: {
      description: 'Get contracts for the current customer (for customer role users)',
      tags: ['Contracts'],
      security: [{ bearerAuth: [] }]
    }
  }, getCustomerContract);

  // CRUD operations
  fastify.get('/', {
    schema: {
      description: 'Get all contracts with search, pagination, and filters',
      tags: ['Contracts'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(contractQuerySchema)
    },
    preHandler: [validate(contractQuerySchema, 'query')]
  }, getContracts);

  fastify.post('/', {
    schema: {
      description: `Create a new contract. ${roleDescription([1, 2, 3])}`,
      tags: ['Contracts'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['customer_id', 'period', 'normal_day', 'urgent_day', 'very_urgent_day'],
        properties: {
          customer_id: { type: 'integer', description: 'Customer ID' },
          period: { type: 'string', description: 'Contract period name' },
          period_from: { type: 'string', format: 'date', description: 'Period start date' },
          period_to: { type: 'string', format: 'date', description: 'Period end date' },
          period_alias: { type: 'string' },
          normal_day: { type: 'integer', description: 'Normal processing days' },
          urgent_day: { type: 'integer', description: 'Urgent processing days' },
          very_urgent_day: { type: 'integer', description: 'Very urgent processing days' },
          status_service: { type: 'string', enum: ['all', 'selected'] },
          discount: { type: 'number', description: 'Discount percentage' },
          dsc_urgent: { type: 'integer', description: 'Urgent discount' },
          dsc_very_urgent: { type: 'integer', description: 'Very urgent discount' },
          promotion_id: { type: 'integer' },
          remarks: { type: 'string' },
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                service_id: { type: 'integer' },
                discount: { type: 'number' },
                'pc-urgent': { type: 'integer' },
                'pc-very-urgent': { type: 'integer' }
              }
            }
          },
          packages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                package_id: { type: 'integer' },
                discount: { type: 'number' },
                'pc-urgent': { type: 'integer' },
                'pc-very-urgent': { type: 'integer' }
              }
            }
          }
        }
      }
    },
    preHandler: [authorize(1, 2, 3), validate(createContractSchema, 'body')]
  }, createContract);

  fastify.get('/:id', {
    schema: {
      description: 'Get contract detail by ID with services and packages',
      tags: ['Contracts'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [validate(idParamSchema, 'params')]
  }, getContractById);

  fastify.put('/:id', {
    schema: {
      description: `Update an existing contract. ${roleDescription([1, 2, 3, 4])}`,
      tags: ['Contracts'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          customer_id: { type: 'integer' },
          period: { type: 'string' },
          period_from: { type: 'string', format: 'date' },
          period_to: { type: 'string', format: 'date' },
          normal_day: { type: 'integer' },
          urgent_day: { type: 'integer' },
          very_urgent_day: { type: 'integer' },
          status_service: { type: 'string', enum: ['all', 'selected'] },
          discount: { type: 'number' },
          services: { type: 'array', items: { type: 'object' } },
          packages: { type: 'array', items: { type: 'object' } }
        }
      }
    },
    preHandler: [authorize(1, 2, 3, 4), validate(idParamSchema, 'params'), validate(updateContractSchema, 'body')]
  }, updateContract);

  fastify.delete('/:id', {
    schema: {
      description: `Delete a contract. ${roleDescription([1, 2, 3])}`,
      tags: ['Contracts'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(idParamSchema, 'params')]
  }, deleteContract);
};

export default contractRoutes;
