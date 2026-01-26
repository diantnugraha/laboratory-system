import type { FastifyPluginAsync } from 'fastify';
import {
  getAllPreOrders,
  getPreOrderById,
  getPreOrdersJson,
  getPreOrdersDataTables,
  getGeneratedCode,
  checkCanCreateOrder,
  getPreOrderSamples,
  checkOutstanding,
  createPreOrder,
  createFromQuotation,
  updatePreOrder,
  unlockPreOrder,
  deletePreOrder,
} from '../controllers/preOrderController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import { idParamSchema } from '../validators/index.js';
import {
  preOrderQuerySchema,
  preOrderJsonQuerySchema,
  generateCodeQuerySchema,
  createPreOrderSchema,
  updatePreOrderSchema,
  createFromQuotationSchema,
  preOrderDataTablesSchema,
} from '../validators/preOrder.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

/**
 * Quotation ID param schema for create from quotation
 */
import { z } from 'zod';
const quotationIdParamSchema = z.object({
  quotationId: z.string()
    .regex(/^\d+$/, 'Quotation ID must be a number')
    .transform(Number)
});

const preOrderRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  // ===== Utility endpoints (before parameterized routes) =====

  // JSON API endpoint - for autocomplete/dropdown
  fastify.get('/json', {
    schema: {
      description: 'Get pre-orders in JSON format for autocomplete/select components',
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(preOrderJsonQuerySchema),
    },
    preHandler: [validate(preOrderJsonQuerySchema, 'query')],
  }, getPreOrdersJson);

  // DataTables format endpoint - for legacy compatibility
  fastify.get('/datatables', {
    schema: {
      description: `Get pre-orders in DataTables format. ${roleDescription([1, 2, 3, 5, 6, 7])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(preOrderDataTablesSchema),
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7), validate(preOrderDataTablesSchema, 'query')],
  }, getPreOrdersDataTables);

  // Generate code endpoint
  fastify.get('/generate-code', {
    schema: {
      description: `Generate a new pre-order code. ${roleDescription([1, 2, 3, 5, 6])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(generateCodeQuerySchema),
    },
    preHandler: [authorize(1, 2, 3, 5, 6), validate(generateCodeQuerySchema, 'query')],
  }, getGeneratedCode);

  // ===== CRUD operations =====

  // GET /api/pre-orders - List with search (role-based)
  fastify.get('/', {
    schema: {
      description: `Get all pre-orders with search, pagination, and filters. ${roleDescription([1, 2, 3, 5, 6, 7, 8])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(preOrderQuerySchema),
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 8), validate(preOrderQuerySchema, 'query')],
  }, getAllPreOrders);

  // GET /api/pre-orders/:id - Get detail
  fastify.get('/:id', {
    schema: {
      description: `Get pre-order detail by ID. ${roleDescription([1, 2, 3, 5, 6, 7, 8])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 8), validate(idParamSchema, 'params')],
  }, getPreOrderById);

  // GET /api/pre-orders/:id/can-create-order - Check order eligibility
  fastify.get('/:id/can-create-order', {
    schema: {
      description: `Check if pre-order can create an order. ${roleDescription([1, 2, 3, 5, 6])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
    },
    preHandler: [authorize(1, 2, 3, 5, 6), validate(idParamSchema, 'params')],
  }, checkCanCreateOrder);

  // GET /api/pre-orders/:id/samples - Get samples for pre-order
  fastify.get('/:id/samples', {
    schema: {
      description: `Get samples for a pre-order. ${roleDescription([1, 2, 3, 5, 6, 7, 8])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 8), validate(idParamSchema, 'params')],
  }, getPreOrderSamples);

  // GET /api/pre-orders/:id/outstanding - Check outstanding for customer
  fastify.get('/:id/outstanding', {
    schema: {
      description: `Check outstanding invoices for pre-order's customer. ${roleDescription([1, 2, 3, 5, 6, 7])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7), validate(idParamSchema, 'params')],
  }, checkOutstanding);

  // POST /api/pre-orders - Create (role-based: SuperAdmin, Admin, Sales, Reception, SampleReceiving)
  fastify.post('/', {
    schema: {
      description: `Create a new pre-order. ${roleDescription([1, 2, 3, 5, 6])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authorize(1, 2, 3, 5, 6), validate(createPreOrderSchema)],
  }, createPreOrder);

  // POST /api/pre-orders/from-quotation/:quotationId - Create from quotation
  fastify.post('/from-quotation/:quotationId', {
    schema: {
      description: `Create a pre-order from an existing quotation. ${roleDescription([1, 2, 3, 5, 6])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(quotationIdParamSchema),
    },
    preHandler: [
      authorize(1, 2, 3, 5, 6),
      validateRequest({ params: quotationIdParamSchema, body: createFromQuotationSchema }),
    ],
  }, createFromQuotation);

  // PATCH /api/pre-orders/:id - Update (role-based)
  fastify.patch('/:id', {
    schema: {
      description: `Update an existing pre-order. ${roleDescription([1, 2, 3, 5, 6])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
    },
    preHandler: [
      authorize(1, 2, 3, 5, 6),
      validateRequest({ params: idParamSchema, body: updatePreOrderSchema }),
    ],
  }, updatePreOrder);

  // POST /api/pre-orders/:id/unlock - Unlock (SuperAdmin/TechnicalManager only)
  fastify.post('/:id/unlock', {
    schema: {
      description: `Unlock a pre-order to bypass outstanding payment lock. ${roleDescription([1, 7])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
    },
    preHandler: [authorize(1, 7), validate(idParamSchema, 'params')],
  }, unlockPreOrder);

  // DELETE /api/pre-orders/:id - Delete (SuperAdmin/Admin only)
  fastify.delete('/:id', {
    schema: {
      description: `Delete a pre-order. ${roleDescription([1, 2])}`,
      tags: ['PreOrders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')],
  }, deletePreOrder);
};

export default preOrderRoutes;
