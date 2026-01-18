import type { FastifyPluginAsync } from 'fastify';
import {
  getStandardById,
  getAllStandards,
  createStandard,
  updateStandard,
  deleteStandard,
  getStandardsJson,
  getStandardsFetchJson,
} from '../controllers/standartController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  createStandardSchema,
  updateStandardSchema,
  standardQuerySchema,
  standardJsonQuerySchema,
  standardFetchJsonQuerySchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const standartRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // GET /api/standards/json - JSON endpoint with customer filtering (role-based: Any authenticated user)
  fastify.get('/json', {
    schema: {
      description: 'Get standards in JSON format for autocomplete/select components with customer filtering',
      tags: ['Standards'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(standardJsonQuerySchema)
    },
    preHandler: [validate(standardJsonQuerySchema, 'query')]
  }, getStandardsJson);

  // GET /api/standards/fetchJson - JSON endpoint with pagination (role-based: SuperAdmin, COAAdminStaff)
  fastify.get('/fetchJson', {
    schema: {
      description: `Fetch standards data in JSON format with pagination. ${roleDescription([1, 2])}`,
      tags: ['Standards'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(standardFetchJsonQuerySchema)
    },
    preHandler: [authorize(1, 2), validate(standardFetchJsonQuerySchema, 'query')]
  }, getStandardsFetchJson);

  // GET /api/standards - List dengan search (role-based: SuperAdmin, COAAdminStaff, Admin, Customer)
  fastify.get('/', {
    schema: {
      description: `Get all standards with search and pagination. ${roleDescription([1, 2, 5, 8])}`,
      tags: ['Standards'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(standardQuerySchema)
    },
    preHandler: [authorize(1, 2, 5, 8), validate(standardQuerySchema, 'query')]
  }, getAllStandards);

  // GET /api/standards/:id - Get detail (role-based: SuperAdmin, COAAdminStaff, Admin, Customer)
  fastify.get('/:id', {
    schema: {
      description: `Get standard detail by ID. ${roleDescription([1, 2, 5, 8])}`,
      tags: ['Standards'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 5, 8), validate(idParamSchema, 'params')]
  }, getStandardById);

  // POST /api/standards - Create (role-based: SuperAdmin, COAAdminStaff, Admin)
  fastify.post('/', {
    schema: {
      description: `Create a new standard. ${roleDescription([1, 2, 5])}`,
      tags: ['Standards'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createStandardSchema)
    },
    preHandler: [authorize(1, 2, 5), validate(createStandardSchema)]
  }, createStandard);

  // PUT /api/standards/:id - Update (role-based: SuperAdmin, COAAdminStaff, Admin)
  fastify.put('/:id', {
    schema: {
      description: `Update an existing standard. ${roleDescription([1, 2, 5])}`,
      tags: ['Standards'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateStandardSchema)
    },
    preHandler: [authorize(1, 2, 5), validateRequest({ params: idParamSchema, body: updateStandardSchema })]
  }, updateStandard);

  // DELETE /api/standards/:id - Delete (role-based: SuperAdmin, COAAdminStaff, Admin)
  fastify.delete('/:id', {
    schema: {
      description: `Delete a standard. ${roleDescription([1, 2, 5])}`,
      tags: ['Standards'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 5), validate(idParamSchema, 'params')]
  }, deleteStandard);
};

export default standartRoutes;
