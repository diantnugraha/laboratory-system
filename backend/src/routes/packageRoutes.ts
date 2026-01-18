import type { FastifyPluginAsync } from 'fastify';
import {
  getPackageById,
  getAllPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getPackagesJson,
} from '../controllers/packageController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import {
  idParamSchema,
  createPackageSchema,
  updatePackageSchema,
  packageQuerySchema,
  packageJsonQuerySchema
} from '../validators/index.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const packageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // GET /api/packages/json - JSON API with contract pricing (any authenticated user)
  fastify.get('/json', {
    schema: {
      description: 'Get packages in JSON format for autocomplete/select components with contract pricing',
      tags: ['Packages'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(packageJsonQuerySchema)
    },
    preHandler: [validate(packageJsonQuerySchema, 'query')]
  }, getPackagesJson);

  // GET /api/packages - List dengan search (role-based: SuperAdmin, Admin, Sales, SampleReceivingStaff)
  fastify.get('/', {
    schema: {
      description: `Get all packages with search and pagination. ${roleDescription([1, 2, 3, 4])}`,
      tags: ['Packages'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(packageQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 4), validate(packageQuerySchema, 'query')]
  }, getAllPackages);

  // GET /api/packages/:id - Get detail (role-based: SuperAdmin, Admin, Sales, SampleReceivingStaff)
  fastify.get('/:id', {
    schema: {
      description: `Get package detail by ID. ${roleDescription([1, 2, 3, 4])}`,
      tags: ['Packages'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3, 4), validate(idParamSchema, 'params')]
  }, getPackageById);

  // POST /api/packages - Create (role-based: SuperAdmin, Sales)
  fastify.post('/', {
    schema: {
      description: `Create a new package. ${roleDescription([1, 3])}`,
      tags: ['Packages'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createPackageSchema)
    },
    preHandler: [authorize(1, 3), validate(createPackageSchema)]
  }, createPackage);

  // PUT /api/packages/:id - Update (role-based: SuperAdmin, Sales)
  fastify.put('/:id', {
    schema: {
      description: `Update an existing package. ${roleDescription([1, 3])}`,
      tags: ['Packages'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updatePackageSchema)
    },
    preHandler: [authorize(1, 3), validateRequest({ params: idParamSchema, body: updatePackageSchema })]
  }, updatePackage);

  // DELETE /api/packages/:id - Delete (role-based: SuperAdmin, Sales)
  fastify.delete('/:id', {
    schema: {
      description: `Delete a package. ${roleDescription([1, 3])}`,
      tags: ['Packages'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 3), validate(idParamSchema, 'params')]
  }, deletePackage);
};

export default packageRoutes;
