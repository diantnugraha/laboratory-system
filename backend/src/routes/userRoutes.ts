import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  getPublicUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersJson,
  getUsersFetchJson,
  resendWelcomeEmail,
  createUserFromContact
} from '../controllers/userController.js';
import {
  idParamSchema,
  createUserSchema,
  updateUserSchema,
  publicUsersQuerySchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  // JSON API endpoints - any authenticated user (must come before /:id route)
  fastify.get('/json', {
    schema: {
      description: 'Get users in JSON format for autocomplete/select components',
      tags: ['Users'],
      security: [{ bearerAuth: [] }]
    }
  }, getUsersJson);

  fastify.get('/fetchJson', {
    schema: {
      description: 'Fetch users data in JSON format',
      tags: ['Users'],
      security: [{ bearerAuth: [] }]
    }
  }, getUsersFetchJson);

  // List of users (requires authentication and authorization)
  fastify.get('/', {
    schema: {
      description: `Get all users with search and pagination. ${roleDescription([1, 2])}`,
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(publicUsersQuerySchema)
    },
    preHandler: [authorize(1, 2), validate(publicUsersQuerySchema, 'query')]
  }, getPublicUsers);

  // Get user detail by ID (requires authentication and authorization)
  fastify.get('/:id', {
    schema: {
      description: `Get user detail by ID. ${roleDescription([1, 2])}`,
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, getUserById);

  // Create user (requires SuperAdmin or HRDManager)
  fastify.post('/', {
    schema: {
      description: `Create a new user. ${roleDescription([1, 2])}`,
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createUserSchema)
    },
    preHandler: [authorize(1, 2), validate(createUserSchema)]
  }, createUser);

  // Resend welcome email (requires SuperAdmin or HRDManager)
  fastify.post('/resendWelcome/:id', {
    schema: {
      description: `Resend welcome email to user. ${roleDescription([1, 2])}`,
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, resendWelcomeEmail);

  // Create user from contact (requires SuperAdmin or HRDManager)
  fastify.post('/from-contact', {
    schema: {
      description: `Create user from existing contact. ${roleDescription([1, 2])}`,
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          contact_id: { type: 'integer', description: 'Contact ID to convert to user' }
        }
      }
    },
    preHandler: [authorize(1, 2)]
  }, createUserFromContact);

  // Update user by ID (requires authentication and authorization)
  fastify.put('/:id', {
    schema: {
      description: `Update an existing user. ${roleDescription([1, 2])}`,
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateUserSchema)
    },
    preHandler: [authorize(1, 2), validateRequest({ params: idParamSchema, body: updateUserSchema })]
  }, updateUser);

  // Delete user (requires SuperAdmin only)
  fastify.delete('/:id', {
    schema: {
      description: `Delete a user. ${roleDescription([1])}`,
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1), validate(idParamSchema, 'params')]
  }, deleteUser);
};

export default userRoutes;
