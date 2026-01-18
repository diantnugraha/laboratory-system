import type { FastifyPluginAsync } from 'fastify';
import {
  getAllCategories,
  getCategoryById,
  getCategoriesJson,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  paginationSchema,
  autocompleteQuerySchema,
  createCategorySchema,
  updateCategorySchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // JSON endpoint for autocomplete (MUST be before /:id)
  fastify.get('/json', {
    schema: {
      description: 'Get categories in JSON format for autocomplete/select components',
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(autocompleteQuerySchema)
    },
    preHandler: [validate(autocompleteQuerySchema, 'query')]
  }, getCategoriesJson);

  // Standard REST endpoints
  fastify.get('/', {
    schema: {
      description: `Get all categories with pagination. ${roleDescription([1, 2])}`,
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationSchema)
    },
    preHandler: [authorize(1, 2), validate(paginationSchema, 'query')]
  }, getAllCategories);

  fastify.get('/:id', {
    schema: {
      description: `Get category detail by ID. ${roleDescription([1, 2])}`,
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, getCategoryById);

  fastify.post('/', {
    schema: {
      description: `Create a new category. ${roleDescription([1, 2])}`,
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createCategorySchema)
    },
    preHandler: [authorize(1, 2), validate(createCategorySchema)]
  }, createCategory);

  fastify.put('/:id', {
    schema: {
      description: `Update an existing category. ${roleDescription([1, 2])}`,
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateCategorySchema)
    },
    preHandler: [authorize(1, 2), validateRequest({ params: idParamSchema, body: updateCategorySchema })]
  }, updateCategory);

  fastify.delete('/:id', {
    schema: {
      description: `Delete a category. ${roleDescription([1, 2])}`,
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, deleteCategory);
};

export default categoryRoutes;
