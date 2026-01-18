import type { FastifyPluginAsync } from 'fastify';
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  markInvoiceAsSent,
  markInvoiceAsPaid,
  addOrdersToInvoice,
  removeOrdersFromInvoice,
  getInvoiceOrders,
  getOutstandingInvoices,
  getInvoiceStats,
  getGeneratedCode,
} from '../controllers/invoiceController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import { idParamSchema } from '../validators/index.js';
import {
  invoiceQuerySchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
  markInvoiceSentSchema,
  markInvoicePaidSchema,
  addOrdersToInvoiceSchema,
  invoiceStatsQuerySchema,
} from '../validators/invoice.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const invoiceRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  // ===== Utility endpoints (before parameterized routes) =====

  // Generate code endpoint - for creating new invoices
  fastify.get('/generate-code', {
    schema: {
      description: `Generate a new invoice code. ${roleDescription([1, 2, 3])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: [authorize(1, 2, 3)]
  }, getGeneratedCode);

  // Statistics endpoint
  fastify.get('/stats', {
    schema: {
      description: `Get invoice statistics. ${roleDescription([1, 2, 3])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(invoiceStatsQuerySchema)
    },
    preHandler: [authorize(1, 2, 3), validate(invoiceStatsQuerySchema, 'query')]
  }, getInvoiceStats);

  // Outstanding invoices
  fastify.get('/outstanding', {
    schema: {
      description: `Get outstanding invoices. ${roleDescription([1, 2, 3])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(invoiceQuerySchema)
    },
    preHandler: [authorize(1, 2, 3), validate(invoiceQuerySchema, 'query')]
  }, getOutstandingInvoices);

  // ===== CRUD operations =====

  // GET /api/invoices - List with search (role-based: SuperAdmin, Admin, Sales, Customer)
  fastify.get('/', {
    schema: {
      description: `Get all invoices with search and pagination. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(invoiceQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 8), validate(invoiceQuerySchema, 'query')]
  }, getAllInvoices);

  // GET /api/invoices/:id - Get detail
  fastify.get('/:id', {
    schema: {
      description: `Get invoice detail by ID. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3, 8), validate(idParamSchema, 'params')]
  }, getInvoiceById);

  // POST /api/invoices - Create (role-based: SuperAdmin, Admin, Sales)
  fastify.post('/', {
    schema: {
      description: `Create a new invoice. ${roleDescription([1, 2, 3])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createInvoiceSchema)
    },
    preHandler: [authorize(1, 2, 3), validate(createInvoiceSchema)]
  }, createInvoice);

  // PUT /api/invoices/:id - Update
  fastify.put('/:id', {
    schema: {
      description: `Update an existing invoice. ${roleDescription([1, 2, 3])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateInvoiceSchema)
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: updateInvoiceSchema })]
  }, updateInvoice);

  // DELETE /api/invoices/:id - Delete
  fastify.delete('/:id', {
    schema: {
      description: `Delete an invoice. ${roleDescription([1, 2])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, deleteInvoice);

  // ===== Status workflows =====

  // PATCH /api/invoices/:id/status - Update status
  fastify.patch('/:id/status', {
    schema: {
      description: `Update invoice status. ${roleDescription([1, 2, 3])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(updateInvoiceStatusSchema)
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: updateInvoiceStatusSchema })]
  }, updateInvoiceStatus);

  // POST /api/invoices/:id/send - Mark as sent
  fastify.post('/:id/send', {
    schema: {
      description: `Mark invoice as sent. ${roleDescription([1, 2, 3])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(markInvoiceSentSchema)
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: markInvoiceSentSchema })]
  }, markInvoiceAsSent);

  // POST /api/invoices/:id/paid - Mark as paid
  fastify.post('/:id/paid', {
    schema: {
      description: `Mark invoice as paid. ${roleDescription([1, 2])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(markInvoicePaidSchema)
    },
    preHandler: [authorize(1, 2), validateRequest({ params: idParamSchema, body: markInvoicePaidSchema })]
  }, markInvoiceAsPaid);

  // ===== Order management =====

  // GET /api/invoices/:id/orders - Get orders for invoice
  fastify.get('/:id/orders', {
    schema: {
      description: `Get orders for an invoice. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3, 8), validate(idParamSchema, 'params')]
  }, getInvoiceOrders);

  // POST /api/invoices/:id/orders - Add orders to invoice
  fastify.post('/:id/orders', {
    schema: {
      description: `Add orders to an invoice. ${roleDescription([1, 2, 3])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(addOrdersToInvoiceSchema)
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: addOrdersToInvoiceSchema })]
  }, addOrdersToInvoice);

  // DELETE /api/invoices/:id/orders - Remove orders from invoice
  fastify.delete('/:id/orders', {
    schema: {
      description: `Remove orders from an invoice. ${roleDescription([1, 2, 3])}`,
      tags: ['Invoices'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: zodToSwagger(addOrdersToInvoiceSchema)
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: addOrdersToInvoiceSchema })]
  }, removeOrdersFromInvoice);
};

export default invoiceRoutes;
