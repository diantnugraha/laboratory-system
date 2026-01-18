import type { FastifyPluginAsync } from 'fastify';
import {
  getAllMatrices,
  getMatrixById,
  createMatrix,
  updateMatrix,
  deleteMatrix,
  getMatricesJson
} from '../controllers/matrixController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  paginationSchema,
  autocompleteQuerySchema,
  createMatrixSchema,
  updateMatrixSchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const matrixRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // JSON API - any authenticated user
  fastify.get('/json', {
    schema: {
      description: 'Get matrices in JSON format for autocomplete/select components',
      tags: ['Matrices'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(autocompleteQuerySchema)
    },
    preHandler: [validate(autocompleteQuerySchema, 'query')]
  }, getMatricesJson);

  // Standard REST endpoints
  fastify.get('/', {
    schema: {
      description: `Get all matrices with pagination. ${roleDescription([1, 2, 3])}`,
      tags: ['Matrices'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(paginationSchema, 'query')]
  }, getAllMatrices);

  fastify.get('/:id', {
    schema: {
      description: `Get matrix detail by ID. ${roleDescription([1, 2, 3])}`,
      tags: ['Matrices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(idParamSchema, 'params')]
  }, getMatrixById);

  fastify.post('/', {
    schema: {
      description: `Create a new matrix. ${roleDescription([1, 2, 3])}`,
      tags: ['Matrices'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createMatrixSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(createMatrixSchema)]
  }, createMatrix);

  fastify.put('/:id', {
    schema: {
      description: `Update an existing matrix. ${roleDescription([1, 2, 3])}`,
      tags: ['Matrices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateMatrixSchema)
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: updateMatrixSchema })]
  }, updateMatrix);

  fastify.delete('/:id', {
    schema: {
      description: `Delete a matrix. ${roleDescription([1, 2, 3])}`,
      tags: ['Matrices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(idParamSchema, 'params')]
  }, deleteMatrix);
};

export default matrixRoutes;
