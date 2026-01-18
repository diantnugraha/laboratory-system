import type { FastifyPluginAsync } from 'fastify';
import {
  getAllAnalystTypes,
  getAnalystTypeById,
  createAnalystType,
  updateAnalystType,
  deleteAnalystType,
  getAnalystTypesJson,
  reverseAnalystTypes
} from '../controllers/analystTypeController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  paginationSchema,
  autocompleteQuerySchema,
  createAnalystTypeSchema,
  updateAnalystTypeSchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const analystTypeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // JSON endpoint - accessible to any authenticated user
  fastify.get('/json', {
    schema: {
      description: 'Get analyst types in JSON format for autocomplete/select components',
      tags: ['Analyst Types'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(autocompleteQuerySchema)
    },
    preHandler: [validate(autocompleteQuerySchema, 'query')]
  }, getAnalystTypesJson);

  // Reverse migration endpoint - restricted to SuperAdmin/Admin only
  fastify.get('/reverse', {
    schema: {
      description: `Reverse analyst types migration. ${roleDescription([1, 2])}`,
      tags: ['Analyst Types'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: [authorize(1, 2)]
  }, reverseAnalystTypes);

  // Standard REST endpoints - restricted to SuperAdmin/Admin only
  fastify.get('/', {
    schema: {
      description: `Get all analyst types with pagination. ${roleDescription([1, 2])}`,
      tags: ['Analyst Types'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationSchema)
    },
    preHandler: [authorize(1, 2), validate(paginationSchema, 'query')]
  }, getAllAnalystTypes);

  fastify.get('/:id', {
    schema: {
      description: `Get analyst type detail by ID. ${roleDescription([1, 2])}`,
      tags: ['Analyst Types'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, getAnalystTypeById);

  fastify.post('/', {
    schema: {
      description: `Create a new analyst type. ${roleDescription([1, 2])}`,
      tags: ['Analyst Types'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createAnalystTypeSchema)
    },
    preHandler: [authorize(1, 2), validate(createAnalystTypeSchema)]
  }, createAnalystType);

  fastify.put('/:id', {
    schema: {
      description: `Update an existing analyst type. ${roleDescription([1, 2])}`,
      tags: ['Analyst Types'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateAnalystTypeSchema)
    },
    preHandler: [authorize(1, 2), validateRequest({ params: idParamSchema, body: updateAnalystTypeSchema })]
  }, updateAnalystType);

  fastify.delete('/:id', {
    schema: {
      description: `Delete an analyst type. ${roleDescription([1, 2])}`,
      tags: ['Analyst Types'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, deleteAnalystType);
};

export default analystTypeRoutes;
