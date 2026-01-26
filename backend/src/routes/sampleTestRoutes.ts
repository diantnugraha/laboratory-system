import type { FastifyPluginAsync } from 'fastify';
import {
  getSampleTestJson,
  getSampleDelayJson,
  getSampleTodayJson,
  getSampleRetestJson,
  getSampleReviseJson,
  getSampleWaitingPaymentJson,
} from '../controllers/sampleTestController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate } from '../plugins/zodValidator.js';
import {
  sampleTestQuerySchema,
  sampleRetestQuerySchema,
} from '../validators/sampleTest.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const sampleTestRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  // GET /api/sample-tests/json - Main sample list with filters
  fastify.get('/json', {
    schema: {
      description: `Get samples for dashboard with filters. ${roleDescription([1, 2, 3, 5, 6, 7, 8])}`,
      tags: ['Sample Tests'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(sampleTestQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 8), validate(sampleTestQuerySchema, 'query')]
  }, getSampleTestJson);

  // GET /api/sample-tests/delay - Delayed samples (past COA due date)
  fastify.get('/delay', {
    schema: {
      description: `Get delayed samples (past COA release due date). ${roleDescription([1, 2, 3, 5, 6, 7, 8])}`,
      tags: ['Sample Tests'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(sampleTestQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 8), validate(sampleTestQuerySchema, 'query')]
  }, getSampleDelayJson);

  // GET /api/sample-tests/today - Samples due today
  fastify.get('/today', {
    schema: {
      description: `Get samples due today. ${roleDescription([1, 2, 3, 5, 6, 7, 8])}`,
      tags: ['Sample Tests'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(sampleTestQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 8), validate(sampleTestQuerySchema, 'query')]
  }, getSampleTodayJson);

  // GET /api/sample-tests/retest - Samples in retest status
  fastify.get('/retest', {
    schema: {
      description: `Get samples in retest status (Internal or Customer Retest). ${roleDescription([1, 2, 3, 5, 6, 7, 8])}`,
      tags: ['Sample Tests'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(sampleRetestQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 8), validate(sampleRetestQuerySchema, 'query')]
  }, getSampleRetestJson);

  // GET /api/sample-tests/revise - Samples needing revision
  fastify.get('/revise', {
    schema: {
      description: `Get samples needing revision. ${roleDescription([1, 2, 3, 5, 6, 7, 8])}`,
      tags: ['Sample Tests'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(sampleTestQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 8), validate(sampleTestQuerySchema, 'query')]
  }, getSampleReviseJson);

  // GET /api/sample-tests/waiting-payment - Delayed samples waiting for payment
  fastify.get('/waiting-payment', {
    schema: {
      description: `Get delayed samples waiting for payment. ${roleDescription([1, 2, 3, 5, 6, 7, 8])}`,
      tags: ['Sample Tests'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(sampleTestQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 8), validate(sampleTestQuerySchema, 'query')]
  }, getSampleWaitingPaymentJson);
};

export default sampleTestRoutes;
