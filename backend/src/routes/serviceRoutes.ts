import type { FastifyPluginAsync } from 'fastify';
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
} from '../controllers/serviceController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  createServiceSchema,
  updateServiceSchema,
  serviceQuerySchema,
  serviceJsonQuerySchema,
  serviceReportQuerySchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const serviceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // JSON API endpoints - all authenticated users
  fastify.get('/json', {
    schema: {
      description: 'Get services in JSON format for autocomplete/select components',
      tags: ['Services'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(serviceJsonQuerySchema)
    },
    preHandler: [validate(serviceJsonQuerySchema, 'query')]
  }, getServicesJson);

  fastify.get('/json-global', {
    schema: {
      description: 'Get all services in JSON format (global)',
      tags: ['Services'],
      security: [{ bearerAuth: [] }]
    }
  }, getServicesJsonGlobal);

  fastify.get('/json-env', {
    schema: {
      description: 'Get services in JSON format filtered by environment',
      tags: ['Services'],
      security: [{ bearerAuth: [] }]
    }
  }, getServicesJsonEnv);

  fastify.get('/json2', {
    schema: {
      description: 'Get services data for data table',
      tags: ['Services'],
      security: [{ bearerAuth: [] }]
    }
  }, getServicesDataTable);

  fastify.get('/json-top', {
    schema: {
      description: 'Get top services statistics',
      tags: ['Services'],
      security: [{ bearerAuth: [] }]
    }
  }, getServiceStatistics);

  fastify.get('/fetch-json', {
    schema: {
      description: 'Fetch services data in JSON format',
      tags: ['Services'],
      security: [{ bearerAuth: [] }]
    }
  }, getServicesFetch);

  // Generate code endpoint - for creating new services
  fastify.get('/generate-code', {
    schema: {
      description: `Generate a new service code. ${roleDescription([1, 2, 3])}`,
      tags: ['Services'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: [authorize(1, 2, 3)]
  }, getGeneratedCode);

  // Report endpoint - SuperAdmin only
  fastify.get('/report', {
    schema: {
      description: `Export service report. ${roleDescription([1])}`,
      tags: ['Services'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(serviceReportQuerySchema)
    },
    preHandler: [authorize(1), validate(serviceReportQuerySchema, 'query')]
  }, exportServiceReport);

  // GET /api/services - List with search (role-based: SuperAdmin, Admin, Sales, Customer)
  fastify.get('/', {
    schema: {
      description: `Get all services with search and pagination. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Services'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(serviceQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 8), validate(serviceQuerySchema, 'query')]
  }, getAllServices);

  // GET /api/services/:id - Get detail (role-based: SuperAdmin, Admin, Sales, Customer)
  fastify.get('/:id', {
    schema: {
      description: `Get service detail by ID. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Services'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3, 8), validate(idParamSchema, 'params')]
  }, getServiceById);

  // POST /api/services - Create (role-based: SuperAdmin, Sales)
  fastify.post('/', {
    schema: {
      description: `Create a new service. ${roleDescription([1, 3])}`,
      tags: ['Services'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createServiceSchema)
    },
    preHandler: [authorize(1, 3), validate(createServiceSchema)]
  }, createService);

  // PUT /api/services/:id - Update (role-based: SuperAdmin, Admin, Sales)
  fastify.put('/:id', {
    schema: {
      description: `Update an existing service. ${roleDescription([1, 2, 3])}`,
      tags: ['Services'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateServiceSchema)
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: updateServiceSchema })]
  }, updateService);

  // DELETE /api/services/:id - Delete (role-based: SuperAdmin, Admin, Sales)
  fastify.delete('/:id', {
    schema: {
      description: `Delete a service. ${roleDescription([1, 2, 3])}`,
      tags: ['Services'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(idParamSchema, 'params')]
  }, deleteService);
};

export default serviceRoutes;
