import type { FastifyPluginAsync } from 'fastify';
import {
  getAllParameters,
  getParameterById,
  createParameter,
  updateParameter,
  deleteParameter,
  getParameterJson,
  getParameterReport
} from '../controllers/parameterController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  paginationSchema,
  createParameterSchema,
  updateParameterSchema,
  parameterJsonQuerySchema,
  parameterReportQuerySchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const parameterRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // JSON API - any authenticated user
  fastify.get('/json', {
    schema: {
      description: 'Get parameters in JSON format for autocomplete/select components',
      tags: ['Parameters'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(parameterJsonQuerySchema)
    },
    preHandler: [validate(parameterJsonQuerySchema, 'query')]
  }, getParameterJson);

  // Report - SuperAdmin only
  fastify.get('/report', {
    schema: {
      description: `Export parameters report. ${roleDescription([1])}`,
      tags: ['Parameters'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(parameterReportQuerySchema)
    },
    preHandler: [authorize(1), validate(parameterReportQuerySchema, 'query')]
  }, getParameterReport);

  // Standard REST endpoints
  fastify.get('/', {
    schema: {
      description: `Get all parameters with pagination. ${roleDescription([1, 2, 3])}`,
      tags: ['Parameters'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(paginationSchema, 'query')]
  }, getAllParameters);

  fastify.get('/:id', {
    schema: {
      description: `Get parameter detail by ID. ${roleDescription([1, 2, 3])}`,
      tags: ['Parameters'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(idParamSchema, 'params')]
  }, getParameterById);

  fastify.post('/', {
    schema: {
      description: `Create a new parameter. ${roleDescription([1, 2, 3])}`,
      tags: ['Parameters'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createParameterSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(createParameterSchema)]
  }, createParameter);

  fastify.put('/:id', {
    schema: {
      description: `Update an existing parameter. ${roleDescription([1, 2, 3])}`,
      tags: ['Parameters'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateParameterSchema)
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: updateParameterSchema })]
  }, updateParameter);

  fastify.delete('/:id', {
    schema: {
      description: `Delete a parameter. ${roleDescription([1, 2, 3])}`,
      tags: ['Parameters'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(idParamSchema, 'params')]
  }, deleteParameter);
};

export default parameterRoutes;
