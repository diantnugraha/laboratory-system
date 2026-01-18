import type { FastifyPluginAsync } from 'fastify';
import { pingSimlab } from '../controllers/pingController.js';

const publicRoutes: FastifyPluginAsync = async (fastify) => {
  // Health check to DB simlab_dev (public, no auth needed)
  fastify.get('/ping', {
    schema: {
      description: 'Health check endpoint to verify database connectivity',
      tags: ['Public'],
      response: {
        200: {
          description: 'Database connection successful',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'pong' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        500: {
          description: 'Database connection failed',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Database connection error' }
          }
        }
      }
    }
  }, pingSimlab);
};

export default publicRoutes;
