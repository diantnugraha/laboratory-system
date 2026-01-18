import type { FastifyPluginAsync } from 'fastify';
import {
  getAllLabs,
  getLabById,
  createLab,
  updateLab,
  deleteLab,
  getLabsJson
} from '../controllers/labController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  paginationSchema,
  autocompleteQuerySchema,
  createLabSchema,
  updateLabSchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const labRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // JSON API - any authenticated user
  fastify.get('/json', {
    schema: {
      description: 'Get labs in JSON format for autocomplete/select components',
      tags: ['Labs'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(autocompleteQuerySchema)
    },
    preHandler: [validate(autocompleteQuerySchema, 'query')]
  }, getLabsJson);

  // Standard REST endpoints
  fastify.get('/', {
    schema: {
      description: `Get all labs with pagination. ${roleDescription([1, 2])}`,
      tags: ['Labs'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationSchema)
    },
    preHandler: [authorize(1, 2), validate(paginationSchema, 'query')]
  }, getAllLabs);

  fastify.get('/:id', {
    schema: {
      description: `Get lab detail by ID. ${roleDescription([1, 2])}`,
      tags: ['Labs'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, getLabById);

  fastify.post('/', {
    schema: {
      description: `Create a new lab. ${roleDescription([1, 2])}`,
      tags: ['Labs'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createLabSchema)
    },
    preHandler: [authorize(1, 2), validate(createLabSchema)]
  }, createLab);

  fastify.put('/:id', {
    schema: {
      description: `Update an existing lab. ${roleDescription([1, 2])}`,
      tags: ['Labs'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateLabSchema)
    },
    preHandler: [authorize(1, 2), validateRequest({ params: idParamSchema, body: updateLabSchema })]
  }, updateLab);

  fastify.delete('/:id', {
    schema: {
      description: `Delete a lab. ${roleDescription([1, 2])}`,
      tags: ['Labs'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, deleteLab);
};

export default labRoutes;
