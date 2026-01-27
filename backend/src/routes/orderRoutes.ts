import type { FastifyPluginAsync } from 'fastify';
import {
  getAllOrders,
  getOrderById,
  getOrdersJson,
  getSingleOrderJson,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getGeneratedCode,
  reviewOrder,
  uploadPaymentDocument,
  confirmPayment,
  resendOrderEmail,
  createRevision,
  unlockOrder,
  getOrderStats,
  getWaitingPaymentOrders,
  getOutstandingWhitelistOrders,
  getOrderInvoiceStatusBatch,
  exportOrders,
  downloadOrderDocument,
  exportCTS,
  exportNonCTS,
  exportCalibration,
  exportActiveCustomers,
  exportOrderReport,
} from '../controllers/orderController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import { idParamSchema } from '../validators/index.js';
import {
  orderQuerySchema,
  orderJsonQuerySchema,
  createOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  reviewOrderSchema,
  createRevisionSchema,
  orderStatsQuerySchema,
} from '../validators/order.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  // ===== Utility endpoints (before parameterized routes) =====

  // JSON API endpoint - for autocomplete/dropdown
  fastify.get('/json', {
    schema: {
      description: 'Get orders in JSON format for autocomplete/select components',
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(orderJsonQuerySchema)
    },
    preHandler: [validate(orderJsonQuerySchema, 'query')]
  }, getOrdersJson);

  // Single order JSON endpoint - for dropdown selection
  fastify.get('/single-json/:id', {
    schema: {
      description: `Get a single order in lightweight JSON format for dropdown selection. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3, 8), validate(idParamSchema, 'params')]
  }, getSingleOrderJson);

  // Generate code endpoint - for creating new orders
  fastify.get('/generate-code', {
    schema: {
      description: `Generate a new order code. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: [authorize(1, 2, 3)]
  }, getGeneratedCode);

  // Statistics endpoint
  fastify.get('/stats', {
    schema: {
      description: `Get order statistics. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(orderStatsQuerySchema)
    },
    preHandler: [authorize(1, 2, 3), validate(orderStatsQuerySchema, 'query')]
  }, getOrderStats);

  // Waiting payment orders (non-whitelist customers)
  fastify.get('/waiting-payment', {
    schema: {
      description: `Get orders waiting for payment (non-whitelist customers). ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(orderQuerySchema)
    },
    preHandler: [authorize(1, 2, 3), validate(orderQuerySchema, 'query')]
  }, getWaitingPaymentOrders);

  // Outstanding whitelist orders (overdue invoices)
  fastify.get('/outstanding-whitelist', {
    schema: {
      description: `Get outstanding whitelist orders (overdue invoices). ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(orderQuerySchema)
    },
    preHandler: [authorize(1, 2, 3), validate(orderQuerySchema, 'query')]
  }, getOutstandingWhitelistOrders);

  // Batch invoice status lookup
  fastify.get('/invoices', {
    schema: {
      description: `Get batch invoice status for orders. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: [authorize(1, 2, 3, 8)]
  }, getOrderInvoiceStatusBatch);

  // Export orders to CSV
  fastify.get('/export', {
    schema: {
      description: `Export orders to CSV. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(orderQuerySchema)
    },
    preHandler: [authorize(1, 2, 3), validate(orderQuerySchema, 'query')]
  }, exportOrders);

  // Export CTS (Customer Testing Service) orders to CSV
  fastify.get('/export/cts', {
    schema: {
      description: `Export CTS (Customer Testing Service) orders to CSV. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          customer_id: { type: 'integer', description: 'Filter by customer ID' },
          status: { type: 'string', description: 'Filter by order status' },
          date_from: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
          date_to: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
        }
      }
    },
    preHandler: [authorize(1, 2, 3)]
  }, exportCTS);

  // Export Non-CTS (subcontracted) orders to CSV
  fastify.get('/export/ncts', {
    schema: {
      description: `Export Non-CTS (subcontracted) orders to CSV. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          customer_id: { type: 'integer', description: 'Filter by customer ID' },
          status: { type: 'string', description: 'Filter by order status' },
          date_from: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
          date_to: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
        }
      }
    },
    preHandler: [authorize(1, 2, 3)]
  }, exportNonCTS);

  // Export calibration orders to CSV
  fastify.get('/export/calibration', {
    schema: {
      description: `Export calibration orders to CSV. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          customer_id: { type: 'integer', description: 'Filter by customer ID' },
          status: { type: 'string', description: 'Filter by order status' },
          date_from: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
          date_to: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
        }
      }
    },
    preHandler: [authorize(1, 2, 3)]
  }, exportCalibration);

  // Export active customers report to CSV
  fastify.get('/export/active-customers', {
    schema: {
      description: `Export active customers report to CSV. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          date_from: { type: 'string', format: 'date', description: 'Start date for order filter (YYYY-MM-DD)' },
          date_to: { type: 'string', format: 'date', description: 'End date for order filter (YYYY-MM-DD)' }
        }
      }
    },
    preHandler: [authorize(1, 2, 3)]
  }, exportActiveCustomers);

  // Generate order report by date range
  fastify.get('/export/report', {
    schema: {
      description: `Generate order report by date range. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        required: ['date_from', 'date_to'],
        properties: {
          date_from: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
          date_to: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
        }
      }
    },
    preHandler: [authorize(1, 2, 3)]
  }, exportOrderReport);

  // ===== CRUD operations =====

  // GET /api/orders - List with search (role-based: SuperAdmin, Admin, Sales, Customer)
  fastify.get('/', {
    schema: {
      description: `Get all orders with search, pagination, and filters. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(orderQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 8), validate(orderQuerySchema, 'query')]
  }, getAllOrders);

  // GET /api/orders/:id - Get detail
  fastify.get('/:id', {
    schema: {
      description: `Get order detail by ID. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3, 8), validate(idParamSchema, 'params')]
  }, getOrderById);

  // POST /api/orders - Create (role-based: SuperAdmin, Admin, Sales)
  fastify.post('/', {
    schema: {
      description: `Create a new order. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['customer_id'],
        properties: {
          customer_id: { type: 'integer' },
          contract_id: { type: 'integer', nullable: true },
          order_date: { type: 'string', format: 'date' },
          due_date: { type: 'string', format: 'date' },
          priority: { type: 'string', enum: ['Normal', 'Urgent', 'Very Urgent'] },
          notes: { type: 'string' },
          samples: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sample_name: { type: 'string' },
                matrix_id: { type: 'integer' },
                services: { type: 'array', items: { type: 'object' } }
              }
            }
          }
        }
      }
    },
    preHandler: [authorize(1, 2, 3), validate(createOrderSchema)]
  }, createOrder);

  // PUT /api/orders/:id - Update
  fastify.put('/:id', {
    schema: {
      description: `Update an existing order. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        properties: {
          order_date: { type: 'string', format: 'date' },
          due_date: { type: 'string', format: 'date' },
          priority: { type: 'string', enum: ['normal', 'urgent', 'very_urgent'] },
          notes: { type: 'string' }
        }
      }
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: updateOrderSchema })]
  }, updateOrder);

  // PATCH /api/orders/:id/status - Update status
  fastify.patch('/:id/status', {
    schema: {
      description: `Update order status. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', description: 'New order status' }
        }
      }
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: updateOrderStatusSchema })]
  }, updateOrderStatus);

  // DELETE /api/orders/:id - Delete
  fastify.delete('/:id', {
    schema: {
      description: `Delete an order. ${roleDescription([1, 2])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, deleteOrder);

  // ===== Workflow endpoints =====

  // POST /api/orders/:id/review - Review order (approve/reject)
  fastify.post('/:id/review', {
    schema: {
      description: `Review order (approve or reject). ${roleDescription([1, 2, 5])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['approve', 'reject'] },
          notes: { type: 'string' }
        }
      }
    },
    preHandler: [authorize(1, 2, 5), validateRequest({ params: idParamSchema, body: reviewOrderSchema })]
  }, reviewOrder);

  // POST /api/orders/:id/upload-payment - Upload payment document
  fastify.post('/:id/upload-payment', {
    schema: {
      description: `Upload payment document for an order. ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        properties: {
          file: { type: 'string', format: 'binary', description: 'Payment document file' }
        }
      }
    },
    preHandler: [authorize(1, 2, 3, 8), validate(idParamSchema, 'params')]
  }, uploadPaymentDocument);

  // POST /api/orders/:id/confirm-payment - Admin confirms payment
  fastify.post('/:id/confirm-payment', {
    schema: {
      description: `Confirm payment for an order. ${roleDescription([1, 2])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, confirmPayment);

  // POST /api/orders/:id/resend-email - Resend order notification email
  fastify.post('/:id/resend-email', {
    schema: {
      description: `Resend order notification email. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        properties: {
          email_type: {
            type: 'string',
            enum: ['review', 'status', 'payment'],
            description: 'Type of email to resend: review (order reviewed), status (status change), payment (payment confirmation)'
          }
        }
      }
    },
    preHandler: [authorize(1, 2, 3), validate(idParamSchema, 'params')]
  }, resendOrderEmail);

  // POST /api/orders/:id/revise - Create order revision
  fastify.post('/:id/revise', {
    schema: {
      description: `Create a revision for an order. ${roleDescription([1, 2, 3])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Revision reason' },
          changes: { type: 'object', description: 'Changes to apply' }
        }
      }
    },
    preHandler: [authorize(1, 2, 3), validateRequest({ params: idParamSchema, body: createRevisionSchema })]
  }, createRevision);

  // POST /api/orders/:id/unlock - Unlock locked order
  fastify.post('/:id/unlock', {
    schema: {
      description: `Unlock a locked order. ${roleDescription([1, 4])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 4), validate(idParamSchema, 'params')]
  }, unlockOrder);

  // GET /api/orders/:id/download - Download order document (SPPC, Quotation, etc.)
  fastify.get('/:id/download', {
    schema: {
      description: `Download order document (SPPC, Quotation, Request Form, COA Request, COA Release). ${roleDescription([1, 2, 3, 8])}`,
      tags: ['Orders'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      querystring: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['sppc', 'quotation', 'request_form', 'coa_request', 'coa_release'],
            description: 'Document type to download: sppc (Sample Processing Payment Confirmation), quotation, request_form (Sample Request Form), coa_request (COA Request), coa_release (COA Release)'
          }
        }
      }
    },
    preHandler: [authorize(1, 2, 3, 8), validate(idParamSchema, 'params')]
  }, downloadOrderDocument);
};

export default orderRoutes;
