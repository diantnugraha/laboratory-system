import type { FastifyPluginAsync } from 'fastify';
import {
  getAllQuotations,
  getQuotationById,
  getQuotationsJson,
  getFetchJson,
  getFetchJsonEnv,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getGeneratedCode,
  getReport,
  getDuplicateData,
  getQuotationDetails,
  checkLinkedOrder,
  checkLinkedPreOrder,
  getCustomerPortalQuotations,
  previewQuotationPdf,
} from '../controllers/quotationController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate } from '../plugins/zodValidator.js';
import { idParamSchema } from '../validators/index.js';
import {
  quotationQuerySchema,
  quotationJsonQuerySchema,
  createQuotationSchema,
  quotationReportQuerySchema,
  fetchJsonQuerySchema,
  fetchJsonEnvQuerySchema,
} from '../validators/quotation.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const quotationRoutes: FastifyPluginAsync = async fastify => {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  // ===== Utility endpoints (before parameterized routes) =====

  // JSON API endpoint - for autocomplete/dropdown
  fastify.get(
    '/json',
    {
      schema: {
        description: 'Get quotations in JSON format for autocomplete/select components',
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        querystring: zodToSwagger(quotationJsonQuerySchema),
      },
      preHandler: [validate(quotationJsonQuerySchema, 'query')],
    },
    getQuotationsJson
  );

  // Generate code endpoint - for creating new quotations
  fastify.get(
    '/generate-code',
    {
      schema: {
        description: `Generate a new quotation code. ${roleDescription([1, 2, 3])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [authorize(1, 2, 3)],
    },
    getGeneratedCode
  );

  // Fetch JSON - Standard lab quotations (lab=1)
  fastify.get(
    '/fetch-json',
    {
      schema: {
        description: `Get standard lab quotations with filtering. ${roleDescription([1, 2, 3, 4, 7])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        querystring: zodToSwagger(fetchJsonQuerySchema),
      },
      preHandler: [authorize(1, 2, 3, 4, 7), validate(fetchJsonQuerySchema, 'query')],
    },
    getFetchJson
  );

  // Fetch JSON Env - Environmental lab quotations (lab=2)
  fastify.get(
    '/fetch-json-env',
    {
      schema: {
        description: `Get environmental lab quotations with filtering. ${roleDescription([1, 2, 3, 4, 7])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        querystring: zodToSwagger(fetchJsonEnvQuerySchema),
      },
      preHandler: [authorize(1, 2, 3, 4, 7), validate(fetchJsonEnvQuerySchema, 'query')],
    },
    getFetchJsonEnv
  );

  // Report endpoint - CSV export
  fastify.get(
    '/report',
    {
      schema: {
        description: `Export quotations to CSV report. ${roleDescription([1, 3])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        querystring: zodToSwagger(quotationReportQuerySchema),
      },
      preHandler: [authorize(1, 3), validate(quotationReportQuerySchema, 'query')],
    },
    getReport
  );

  // Customer portal endpoint - for customer users (QuotationTestController equivalent)
  fastify.get(
    '/customer-portal',
    {
      schema: {
        description: `Get quotations for customer portal with department filtering. ${roleDescription([8])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        querystring: zodToSwagger(quotationQuerySchema),
      },
      preHandler: [authorize(8), validate(quotationQuerySchema, 'query')],
    },
    getCustomerPortalQuotations
  );

  // Duplicate endpoint - get quotation data for duplication
  fastify.get(
    '/duplicate/:id',
    {
      schema: {
        description: `Get quotation data for duplication. ${roleDescription([1, 2, 3])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        params: zodToSwagger(idParamSchema),
      },
      preHandler: [authorize(1, 2, 3), validate(idParamSchema, 'params')],
    },
    getDuplicateData
  );

  // ===== CRUD operations =====

  // GET /api/quotations - List with search
  fastify.get(
    '/',
    {
      schema: {
        description: `Get all quotations with search, pagination, and filters. ${roleDescription([1, 2, 3, 4, 7, 10])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        querystring: zodToSwagger(quotationQuerySchema),
      },
      preHandler: [authorize(1, 2, 3, 4, 7, 10), validate(quotationQuerySchema, 'query')],
    },
    getAllQuotations
  );

  // GET /api/quotations/:id - Get detail
  fastify.get(
    '/:id',
    {
      schema: {
        description: `Get quotation detail by ID. ${roleDescription([1, 2, 3, 4, 7])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        params: zodToSwagger(idParamSchema),
      },
      preHandler: [authorize(1, 2, 3, 4, 7), validate(idParamSchema, 'params')],
    },
    getQuotationById
  );

  // POST /api/quotations - Create
  fastify.post(
    '/',
    {
      schema: {
        description: `Create a new quotation. ${roleDescription([1, 2, 3])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['customer_id', 'contact_id', 'address_id', 'quo_date'],
          properties: {
            quo_status: { type: 'string', enum: ['Created', 'Order'] },
            quo_date: { type: 'string', description: 'Date in DD-MM-YYYY or YYYY-MM-DD format' },
            sampling_request: { type: ['boolean', 'string', 'number'] },
            sampling_date: { type: 'string', nullable: true },
            customer_id: { type: 'integer' },
            contact_id: { type: 'integer' },
            address_id: { type: 'integer' },
            volume: { type: 'string', nullable: true },
            remarks: { type: 'string', nullable: true },
            min_volume_sample: { type: 'string' },
            sub_total: { type: 'number' },
            percent_discount: { type: 'number' },
            percent_vat: { type: 'number' },
            percent_pc: { type: 'number', nullable: true },
            price_group: { type: 'integer', nullable: true },
            priority: { type: 'string', enum: ['normal', 'urgent', 'very urgent'] },
            lab: { type: 'string', enum: ['1', '2'] },
            samples: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'integer' },
                  priority: { type: 'string' },
                  services: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        quantity: { type: 'integer' },
                        discount: { type: 'number' },
                      },
                    },
                  },
                  packages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        quantity: { type: 'integer' },
                        discount: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'integer' },
                  price: { type: 'number' },
                  discount: { type: 'number' },
                },
              },
            },
          },
        },
      },
      preHandler: [authorize(1, 2, 3), validate(createQuotationSchema)],
    },
    createQuotation
  );

  // PUT /api/quotations/:id - Update
  fastify.put(
    '/:id',
    {
      schema: {
        description: `Update an existing quotation. ${roleDescription([1, 2, 3, 10])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        params: zodToSwagger(idParamSchema),
        body: {
          type: 'object',
          properties: {
            quo_status: { type: 'string' },
            quo_date: { type: 'string' },
            sampling_request: { type: ['boolean', 'string', 'number'] },
            sampling_date: { type: 'string', nullable: true },
            customer_id: { type: 'integer' },
            contact_id: { type: 'integer' },
            address_id: { type: 'integer' },
            volume: { type: 'string', nullable: true },
            remarks: { type: 'string', nullable: true },
            min_volume_sample: { type: 'string' },
            sub_total: { type: 'number' },
            percent_discount: { type: 'number' },
            percent_vat: { type: 'number' },
            price_group: { type: 'integer', nullable: true },
            priority: { type: 'string' },
            samples: { type: 'array' },
            products: { type: 'array' },
          },
        },
      },
      preHandler: [authorize(1, 2, 3, 10), validate(idParamSchema, 'params')],
    },
    updateQuotation
  );

  // DELETE /api/quotations/:id - Delete (soft delete)
  fastify.delete(
    '/:id',
    {
      schema: {
        description: `Delete a quotation (soft delete). ${roleDescription([1, 2])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        params: zodToSwagger(idParamSchema),
      },
      preHandler: [authorize(1, 2), validate(idParamSchema, 'params')],
    },
    deleteQuotation
  );

  // ===== Additional endpoints =====

  // GET /api/quotations/:id/details - Get quotation details
  fastify.get(
    '/:id/details',
    {
      schema: {
        description: `Get quotation detail items. ${roleDescription([1, 2, 3, 4, 7, 8])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        params: zodToSwagger(idParamSchema),
      },
      preHandler: [authorize(1, 2, 3, 4, 7, 8), validate(idParamSchema, 'params')],
    },
    getQuotationDetails
  );

  // GET /api/quotations/:id/linked-order - Check linked order
  fastify.get(
    '/:id/linked-order',
    {
      schema: {
        description: `Check if quotation has linked order. ${roleDescription([1, 2, 3, 4, 7])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        params: zodToSwagger(idParamSchema),
      },
      preHandler: [authorize(1, 2, 3, 4, 7), validate(idParamSchema, 'params')],
    },
    checkLinkedOrder
  );

  // GET /api/quotations/:id/linked-preorder - Check linked pre-order
  fastify.get(
    '/:id/linked-preorder',
    {
      schema: {
        description: `Check if quotation has linked pre-order. ${roleDescription([1, 2, 3, 4, 7])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        params: zodToSwagger(idParamSchema),
      },
      preHandler: [authorize(1, 2, 3, 4, 7), validate(idParamSchema, 'params')],
    },
    checkLinkedPreOrder
  );

  // GET /api/quotations/:id/preview-pdf - Preview quotation as PDF
  fastify.get(
    '/:id/preview-pdf',
    {
      schema: {
        description: `Preview quotation as PDF document. ${roleDescription([1, 2, 3, 4, 7, 8])}`,
        tags: ['Quotations'],
        security: [{ bearerAuth: [] }],
        params: zodToSwagger(idParamSchema),
        querystring: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['pdf', 'html'], description: 'Output format (default: pdf)' },
          },
        },
        response: {
          200: {
            description: 'PDF document or HTML preview',
            type: 'string',
            format: 'binary',
          },
        },
      },
      preHandler: [authorize(1, 2, 3, 4, 7, 8), validate(idParamSchema, 'params')],
    },
    previewQuotationPdf
  );
};

export default quotationRoutes;
