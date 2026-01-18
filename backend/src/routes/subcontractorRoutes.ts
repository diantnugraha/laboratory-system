import type { FastifyPluginAsync } from 'fastify';
import {
  getAllSubcontractors,
  getSubcontractorById,
  createSubcontractor,
  updateSubcontractor,
  deleteSubcontractor,
  getSubcontractorsJson
} from '../controllers/subcontractorController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  paginationSchema,
  autocompleteQuerySchema,
  createSubcontractorSchema,
  updateSubcontractorSchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const subcontractorRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // JSON endpoint - any authenticated user can access
  fastify.get('/json', {
    schema: {
      description: 'Get subcontractors in JSON format for autocomplete/select components',
      tags: ['Subcontractors'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(autocompleteQuerySchema)
    },
    preHandler: [validate(autocompleteQuerySchema, 'query')]
  }, getSubcontractorsJson);

  // Standard REST endpoints
  fastify.get('/', {
    schema: {
      description: `Get all subcontractors with pagination. ${roleDescription([1, 3])}`,
      tags: ['Subcontractors'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationSchema)
    },
    preHandler: [authorize(1, 3), validate(paginationSchema, 'query')]
  }, getAllSubcontractors);

  fastify.get('/:id', {
    schema: {
      description: `Get subcontractor detail by ID. ${roleDescription([1, 3])}`,
      tags: ['Subcontractors'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 3), validate(idParamSchema, 'params')]
  }, getSubcontractorById);

  fastify.post('/', {
    schema: {
      description: `Create a new subcontractor. ${roleDescription([1, 3])}`,
      tags: ['Subcontractors'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createSubcontractorSchema)
    },
    preHandler: [authorize(1, 3), validate(createSubcontractorSchema)]
  }, createSubcontractor);

  fastify.put('/:id', {
    schema: {
      description: `Update an existing subcontractor. ${roleDescription([1, 3])}`,
      tags: ['Subcontractors'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateSubcontractorSchema)
    },
    preHandler: [authorize(1, 3), validateRequest({ params: idParamSchema, body: updateSubcontractorSchema })]
  }, updateSubcontractor);

  fastify.delete('/:id', {
    schema: {
      description: `Delete a subcontractor. ${roleDescription([1, 3])}`,
      tags: ['Subcontractors'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 3), validate(idParamSchema, 'params')]
  }, deleteSubcontractor);
};

export default subcontractorRoutes;
