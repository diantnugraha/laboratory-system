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
import {
  IdParamSchema,
  GenerateCodeQuerySchema,
  QuotationQuerySchema,
  QuotationJsonQuerySchema,
  FetchJsonQuerySchema,
  FetchJsonEnvQuerySchema,
  ReportQuerySchema,
  PdfPreviewQuerySchema,
  CreateQuotationBodySchema,
  UpdateQuotationBodySchema,
} from '../schemas/quotation.js';
import { roleDescription } from '../schemas/swagger/index.js';

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
        querystring: QuotationJsonQuerySchema,
      },
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
        querystring: GenerateCodeQuerySchema,
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
        querystring: FetchJsonQuerySchema,
      },
      preHandler: [authorize(1, 2, 3, 4, 7)],
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
        querystring: FetchJsonEnvQuerySchema,
      },
      preHandler: [authorize(1, 2, 3, 4, 7)],
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
        querystring: ReportQuerySchema,
      },
      preHandler: [authorize(1, 3)],
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
        querystring: QuotationQuerySchema,
      },
      preHandler: [authorize(8)],
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
        params: IdParamSchema,
      },
      preHandler: [authorize(1, 2, 3)],
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
        querystring: QuotationQuerySchema,
      },
      preHandler: [authorize(1, 2, 3, 4, 7, 10)],
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
        params: IdParamSchema,
      },
      preHandler: [authorize(1, 2, 3, 4, 7)],
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
        body: CreateQuotationBodySchema,
      },
      preHandler: [authorize(1, 2, 3)],
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
        params: IdParamSchema,
        body: UpdateQuotationBodySchema,
      },
      preHandler: [authorize(1, 2, 3, 10)],
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
        params: IdParamSchema,
      },
      preHandler: [authorize(1, 2)],
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
        params: IdParamSchema,
      },
      preHandler: [authorize(1, 2, 3, 4, 7, 8)],
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
        params: IdParamSchema,
      },
      preHandler: [authorize(1, 2, 3, 4, 7)],
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
        params: IdParamSchema,
      },
      preHandler: [authorize(1, 2, 3, 4, 7)],
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
        params: IdParamSchema,
        querystring: PdfPreviewQuerySchema,
        response: {
          200: {
            description: 'PDF document or HTML preview',
            type: 'string',
            format: 'binary',
          },
        },
      },
      preHandler: [authorize(1, 2, 3, 4, 7, 8)],
    },
    previewQuotationPdf
  );
};

export default quotationRoutes;