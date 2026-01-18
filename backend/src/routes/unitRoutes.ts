import type { FastifyPluginAsync } from 'fastify';
import {
  getAllUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  getUnitsJson,
  getUnitsReport
} from '../controllers/unitController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  paginationSchema,
  createUnitSchema,
  updateUnitSchema,
  unitJsonQuerySchema,
  unitReportQuerySchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const unitRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // JSON API - any authenticated user
  fastify.get('/json', {
    schema: {
      description: 'Get units in JSON format for autocomplete/select components',
      tags: ['Units'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(unitJsonQuerySchema)
    },
    preHandler: [validate(unitJsonQuerySchema, 'query')]
  }, getUnitsJson);

  // Report - SuperAdmin only
  fastify.get('/report', {
    schema: {
      description: `Export units report. ${roleDescription([1])}`,
      tags: ['Units'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(unitReportQuerySchema)
    },
    preHandler: [authorize(1), validate(unitReportQuerySchema, 'query')]
  }, getUnitsReport);

  // Standard REST endpoints
  fastify.get('/', {
    schema: {
      description: `Get all units with pagination. ${roleDescription([1, 2])}`,
      tags: ['Units'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationSchema)
    },
    preHandler: [authorize(1, 2), validate(paginationSchema, 'query')]
  }, getAllUnits);

  fastify.get('/:id', {
    schema: {
      description: `Get unit detail by ID. ${roleDescription([1, 2])}`,
      tags: ['Units'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, getUnitById);

  fastify.post('/', {
    schema: {
      description: `Create a new unit. ${roleDescription([1, 2])}`,
      tags: ['Units'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createUnitSchema)
    },
    preHandler: [authorize(1, 2), validate(createUnitSchema)]
  }, createUnit);

  fastify.put('/:id', {
    schema: {
      description: `Update an existing unit. ${roleDescription([1, 2])}`,
      tags: ['Units'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateUnitSchema)
    },
    preHandler: [authorize(1, 2), validateRequest({ params: idParamSchema, body: updateUnitSchema })]
  }, updateUnit);

  fastify.delete('/:id', {
    schema: {
      description: `Delete a unit. ${roleDescription([1, 2])}`,
      tags: ['Units'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, deleteUnit);
};

export default unitRoutes;
