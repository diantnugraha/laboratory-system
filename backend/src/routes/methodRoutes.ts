import type { FastifyPluginAsync } from 'fastify';
import {
  getAllMethods,
  getMethodById,
  createMethod,
  updateMethod,
  deleteMethod,
  getMethodsJson,
  getMethodsReport
} from '../controllers/methodController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  paginationSchema,
  createMethodSchema,
  updateMethodSchema,
  methodJsonQuerySchema,
  methodReportQuerySchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const methodRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // JSON API - any authenticated user
  fastify.get('/json', {
    schema: {
      description: 'Get methods in JSON format for autocomplete/select components',
      tags: ['Methods'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(methodJsonQuerySchema)
    },
    preHandler: [validate(methodJsonQuerySchema, 'query')]
  }, getMethodsJson);

  // Report - SuperAdmin only
  fastify.get('/report', {
    schema: {
      description: `Export methods report. ${roleDescription([1])}`,
      tags: ['Methods'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(methodReportQuerySchema)
    },
    preHandler: [authorize(1), validate(methodReportQuerySchema, 'query')]
  }, getMethodsReport);

  // Standard REST endpoints
  fastify.get('/', {
    schema: {
      description: `Get all methods with pagination. ${roleDescription([1, 2, 3])}`,
      tags: ['Methods'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(paginationSchema, 'query')]
  }, getAllMethods);

  fastify.get('/:id', {
    schema: {
      description: `Get method detail by ID. ${roleDescription([1, 2, 3])}`,
      tags: ['Methods'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(idParamSchema, 'params')]
  }, getMethodById);

  fastify.post('/', {
    schema: {
      description: `Create a new method. ${roleDescription([1, 2, 3])}`,
      tags: ['Methods'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createMethodSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(createMethodSchema)]
  }, createMethod);

  fastify.put('/:id', {
    schema: {
      description: `Update an existing method. ${roleDescription([1, 2, 3])}`,
      tags: ['Methods'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateMethodSchema)
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: updateMethodSchema })]
  }, updateMethod);

  fastify.delete('/:id', {
    schema: {
      description: `Delete a method. ${roleDescription([1, 2, 3])}`,
      tags: ['Methods'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(idParamSchema, 'params')]
  }, deleteMethod);
};

export default methodRoutes;
