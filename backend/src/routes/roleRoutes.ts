import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../plugins/auth.js';
import { validate } from '../plugins/zodValidator.js';
import { getRoles, getRoleById } from '../controllers/roleController.js';
import { idParamSchema, roleQuerySchema } from '../validators/index.js';
import { zodToSwagger } from '../schemas/swagger/index.js';

const roleRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // List of roles (requires authentication)
  fastify.get('/', {
    schema: {
      description: 'Get all roles with optional search',
      tags: ['Roles'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(roleQuerySchema)
    },
    preHandler: [validate(roleQuerySchema, 'query')]
  }, getRoles);

  // Get role detail by ID (requires authentication)
  fastify.get('/:id', {
    schema: {
      description: 'Get role detail by ID',
      tags: ['Roles'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [validate(idParamSchema, 'params')]
  }, getRoleById);
};

export default roleRoutes;
