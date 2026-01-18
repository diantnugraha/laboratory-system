import type { FastifyPluginAsync } from 'fastify';
import {
  getAllSamples,
  getSampleById,
  getSamplesJson,
  getSamplesByOrder,
  createSample,
  updateSample,
  updateSampleStatus,
  deleteSample,
  getGeneratedCode,
} from '../controllers/sampleController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import { idParamSchema } from '../validators/index.js';
import {
  sampleQuerySchema,
  sampleJsonQuerySchema,
  createSampleSchema,
  updateSampleSchema,
  updateSampleStatusSchema,
} from '../validators/sample.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const sampleRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  // ===== Utility endpoints (before parameterized routes) =====

  // JSON API endpoint - for autocomplete/dropdown
  fastify.get('/json', {
    schema: {
      description: 'Get samples in JSON format for autocomplete/select components',
      tags: ['Samples'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(sampleJsonQuerySchema)
    },
    preHandler: [validate(sampleJsonQuerySchema, 'query')]
  }, getSamplesJson);

  // Generate code endpoint - for creating new samples
  fastify.get('/generate-code', {
    schema: {
      description: `Generate a new sample code. ${roleDescription([1, 2, 3])}`,
      tags: ['Samples'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: [authorize(1, 2, 3)]
  }, getGeneratedCode);

  // Get samples by order
  fastify.get('/by-order/:orderId', {
    schema: {
      description: `Get samples by order ID. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Samples'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Order ID' }
        },
        required: ['orderId']
      }
    },
    preHandler: [authorize(1, 2, 3, 8)]
  }, getSamplesByOrder);

  // ===== CRUD operations =====

  // GET /api/samples - List with search (role-based: SuperAdmin, Admin, Sales, Customer)
  fastify.get('/', {
    schema: {
      description: `Get all samples with search and pagination. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Samples'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(sampleQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 8), validate(sampleQuerySchema, 'query')]
  }, getAllSamples);

  // GET /api/samples/:id - Get detail
  fastify.get('/:id', {
    schema: {
      description: `Get sample detail by ID. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Samples'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3, 8), validate(idParamSchema, 'params')]
  }, getSampleById);

  // POST /api/samples - Create (role-based: SuperAdmin, Admin, Sales)
  fastify.post('/', {
    schema: {
      description: `Create a new sample. ${roleDescription([1, 2, 3])}`,
      tags: ['Samples'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createSampleSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(createSampleSchema)]
  }, createSample);

  // PUT /api/samples/:id - Update
  fastify.put('/:id', {
    schema: {
      description: `Update an existing sample. ${roleDescription([1, 2, 3])}`,
      tags: ['Samples'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateSampleSchema)
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: updateSampleSchema })]
  }, updateSample);

  // PATCH /api/samples/:id/status - Update status
  fastify.patch('/:id/status', {
    schema: {
      description: `Update sample status. ${roleDescription([1, 2, 3])}`,
      tags: ['Samples'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateSampleStatusSchema)
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: updateSampleStatusSchema })]
  }, updateSampleStatus);

  // DELETE /api/samples/:id - Delete
  fastify.delete('/:id', {
    schema: {
      description: `Delete a sample. ${roleDescription([1, 2])}`,
      tags: ['Samples'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, deleteSample);
};

export default sampleRoutes;
