import type { FastifyPluginAsync } from 'fastify';
import {
  getAllWorksheets,
  getWorksheetById,
  getWorksheetDetail,
  getWorksheetsJson,
  getWorksheetsDataTables,
  getWorksheetsBySample,
  createWorksheet,
  updateWorksheetResult,
  verifyWorksheet,
  approveWorksheet,
  requestRevision,
  requestInternalRetest,
  requestCustomerRetest,
  quickSubmitResult,
  updateSubcontract,
  cancelWorksheet,
  deleteWorksheet,
  getGeneratedCode,
  // Specialized list endpoints
  getDelayedWorksheets,
  getTodaysWorksheets,
  getRetestWorksheets,
  getRevisionWorksheets,
  getCalculationWorksheets,
  // Report export endpoints
  exportWorksheetReport,
  exportTodoAnalyst,
  exportEnviroReport,
} from '../controllers/worksheetController.js';
import { authenticate, authorize } from '../plugins/auth.js';
import { validate, validateRequest } from '../plugins/zodValidator.js';
import { idParamSchema } from '../validators/index.js';
import {
  worksheetQuerySchema,
  worksheetJsonQuerySchema,
  worksheetDataTablesQuerySchema,
  createWorksheetSchema,
  updateWorksheetResultSchema,
  verifyWorksheetSchema,
  approveWorksheetSchema,
  revisionRequestSchema,
  retestRequestSchema,
  quickSubmitSchema,
  updateSubcontractSchema,
  cancelWorksheetSchema,
  reportQuerySchema,
  paginationQuerySchema,
} from '../validators/worksheet.js';
import { zodToSwagger, roleDescription } from '../schemas/swagger/index.js';

const worksheetRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply authentication to all routes
  fastify.addHook('preHandler', authenticate);

  // ===== Utility endpoints (before parameterized routes) =====

  // JSON API endpoint - for autocomplete/dropdown
  fastify.get('/json', {
    schema: {
      description: 'Get worksheets in JSON format for autocomplete/select components',
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(worksheetJsonQuerySchema)
    },
    preHandler: [validate(worksheetJsonQuerySchema, 'query')]
  }, getWorksheetsJson);

  // DataTables format - for legacy compatibility
  fastify.get('/datatables', {
    schema: {
      description: 'Get worksheets in DataTables format for legacy compatibility',
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(worksheetDataTablesQuerySchema)
    },
    preHandler: [validate(worksheetDataTablesQuerySchema, 'query')]
  }, getWorksheetsDataTables);

  // Generate code endpoint - for creating new worksheets
  fastify.get('/generate-code', {
    schema: {
      description: `Generate a new worksheet code. ${roleDescription([1, 2, 3])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }]
    },
    preHandler: [authorize(1, 2, 3)]
  }, getGeneratedCode);

  // Get worksheets by sample
  fastify.get('/by-sample/:sampleId', {
    schema: {
      description: `Get worksheets for a specific sample. ${roleDescription([1, 2, 3, 5, 6, 7, 9, 8])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          sampleId: { type: 'string', description: 'Sample ID' }
        },
        required: ['sampleId']
      }
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 9, 8)]
  }, getWorksheetsBySample);

  // ===== Specialized list endpoints =====

  // Delayed worksheets (due_date < today)
  fastify.get('/delay', {
    schema: {
      description: `Get delayed worksheets (due_date < today). ${roleDescription([1, 5, 6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationQuerySchema)
    },
    preHandler: [authorize(1, 5, 6), validate(paginationQuerySchema, 'query')]
  }, getDelayedWorksheets);

  // Today's worksheets (due_date = today)
  fastify.get('/today', {
    schema: {
      description: `Get today's worksheets (due_date = today). ${roleDescription([1, 5, 6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationQuerySchema)
    },
    preHandler: [authorize(1, 5, 6), validate(paginationQuerySchema, 'query')]
  }, getTodaysWorksheets);

  // Retest worksheets (Internal Retest / Customer Retest)
  fastify.get('/retest', {
    schema: {
      description: `Get worksheets that need retesting. ${roleDescription([1, 5, 6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationQuerySchema)
    },
    preHandler: [authorize(1, 5, 6), validate(paginationQuerySchema, 'query')]
  }, getRetestWorksheets);

  // Revision worksheets (Need to Revised)
  fastify.get('/revision', {
    schema: {
      description: `Get worksheets that need revision. ${roleDescription([1, 5, 6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationQuerySchema)
    },
    preHandler: [authorize(1, 5, 6), validate(paginationQuerySchema, 'query')]
  }, getRevisionWorksheets);

  // Calculation worksheets (specific service IDs)
  fastify.get('/calculation', {
    schema: {
      description: `Get calculation worksheets (specific service IDs). ${roleDescription([1, 6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(paginationQuerySchema)
    },
    preHandler: [authorize(1, 6), validate(paginationQuerySchema, 'query')]
  }, getCalculationWorksheets);

  // ===== Report export endpoints =====

  // Export worksheet report as CSV
  fastify.get('/reports/worksheet', {
    schema: {
      description: `Export worksheet report as CSV. ${roleDescription([1, 3, 5, 6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(reportQuerySchema)
    },
    preHandler: [authorize(1, 3, 5, 6), validate(reportQuerySchema, 'query')]
  }, exportWorksheetReport);

  // Export analyst TODO summary as CSV
  fastify.get('/reports/todo-analyst', {
    schema: {
      description: `Export analyst TODO summary as CSV. ${roleDescription([1, 6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(reportQuerySchema)
    },
    preHandler: [authorize(1, 6), validate(reportQuerySchema, 'query')]
  }, exportTodoAnalyst);

  // Export environmental report as CSV
  fastify.get('/reports/enviro', {
    schema: {
      description: `Export environmental report as CSV. ${roleDescription([1, 6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(reportQuerySchema)
    },
    preHandler: [authorize(1, 6), validate(reportQuerySchema, 'query')]
  }, exportEnviroReport);

  // ===== Quick submit endpoint =====
  // Analyst (5) can quick submit results
  fastify.post('/quick-submit', {
    schema: {
      description: `Quick submit worksheet results. ${roleDescription([5])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['worksheet_id', 'result'],
        properties: {
          worksheet_id: { type: 'integer' },
          result: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    },
    preHandler: [authorize(5), validate(quickSubmitSchema)]
  }, quickSubmitResult);

  // ===== CRUD operations =====

  // GET /api/worksheets - List with search
  fastify.get('/', {
    schema: {
      description: `Get all worksheets with search, pagination, and filters. ${roleDescription([1, 2, 3, 5, 6, 7, 9, 8])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(worksheetQuerySchema)
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 9, 8), validate(worksheetQuerySchema, 'query')]
  }, getAllWorksheets);

  // GET /api/worksheets/:id - Get detail
  fastify.get('/:id', {
    schema: {
      description: `Get worksheet detail by ID. ${roleDescription([1, 2, 3, 5, 6, 7, 9, 8])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 9, 8), validate(idParamSchema, 'params')]
  }, getWorksheetById);

  // GET /api/worksheets/:id/detail - Get worksheet with detailed information
  fastify.get('/:id/detail', {
    schema: {
      description: `Get worksheet detail with user names and history. ${roleDescription([1, 2, 3, 5, 6, 7, 9, 8])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2, 3, 5, 6, 7, 9, 8), validate(idParamSchema, 'params')]
  }, getWorksheetDetail);

  // POST /api/worksheets - Create
  fastify.post('/', {
    schema: {
      description: `Create a new worksheet. ${roleDescription([1, 2, 3])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['sample_id', 'service_id'],
        properties: {
          sample_id: { type: 'integer' },
          service_id: { type: 'integer' },
          analyst_id: { type: 'integer' },
          due_date: { type: 'string', format: 'date' },
          notes: { type: 'string' }
        }
      }
    },
    preHandler: [authorize(1, 2, 3), validate(createWorksheetSchema)]
  }, createWorksheet);

  // PATCH /api/worksheets/:id - Update result (Analyst action)
  fastify.patch('/:id', {
    schema: {
      description: `Update worksheet result (Analyst action). ${roleDescription([5, 10])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        properties: {
          result: { type: 'string', description: 'Test result value' },
          notes: { type: 'string' },
          attachments: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    preHandler: [authorize(5, 10), validateRequest({ params: idParamSchema, body: updateWorksheetResultSchema })]
  }, updateWorksheetResult);

  // DELETE /api/worksheets/:id - Delete
  fastify.delete('/:id', {
    schema: {
      description: `Delete a worksheet. ${roleDescription([1, 2])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema)
    },
    preHandler: [authorize(1, 2), validate(idParamSchema, 'params')]
  }, deleteWorksheet);

  // ===== Status workflow actions =====

  // POST /api/worksheets/:id/verify - QC verify
  fastify.post('/:id/verify', {
    schema: {
      description: `QC verify a worksheet. ${roleDescription([6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        properties: {
          notes: { type: 'string' }
        }
      }
    },
    preHandler: [authorize(6), validateRequest({ params: idParamSchema, body: verifyWorksheetSchema })]
  }, verifyWorksheet);

  // POST /api/worksheets/:id/approve - TM approve
  fastify.post('/:id/approve', {
    schema: {
      description: `Technical Manager approve a worksheet. ${roleDescription([7])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        properties: {
          notes: { type: 'string' }
        }
      }
    },
    preHandler: [authorize(7), validateRequest({ params: idParamSchema, body: approveWorksheetSchema })]
  }, approveWorksheet);

  // POST /api/worksheets/:id/revision - QC request revision
  fastify.post('/:id/revision', {
    schema: {
      description: `QC request revision for a worksheet. ${roleDescription([6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', description: 'Revision reason' }
        }
      }
    },
    preHandler: [authorize(6), validateRequest({ params: idParamSchema, body: revisionRequestSchema })]
  }, requestRevision);

  // POST /api/worksheets/:id/internal-retest - QC request internal retest
  fastify.post('/:id/internal-retest', {
    schema: {
      description: `QC request internal retest for a worksheet. ${roleDescription([6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', description: 'Retest reason' }
        }
      }
    },
    preHandler: [authorize(6), validateRequest({ params: idParamSchema, body: retestRequestSchema })]
  }, requestInternalRetest);

  // POST /api/worksheets/:id/customer-retest - Customer retest (QC or Customer)
  fastify.post('/:id/customer-retest', {
    schema: {
      description: `Request customer retest for a worksheet. ${roleDescription([6, 8])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', description: 'Retest reason' }
        }
      }
    },
    preHandler: [authorize(6, 8), validateRequest({ params: idParamSchema, body: retestRequestSchema })]
  }, requestCustomerRetest);

  // ===== Additional actions =====

  // PATCH /api/worksheets/:id/subcontract - Update subcontract info
  fastify.patch('/:id/subcontract', {
    schema: {
      description: `Update subcontract information for a worksheet. ${roleDescription([1, 2, 3, 10])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        properties: {
          subcontractor_id: { type: 'integer' },
          subcontract_status: { type: 'string' },
          subcontract_notes: { type: 'string' }
        }
      }
    },
    preHandler: [authorize(1, 2, 3, 10), validateRequest({ params: idParamSchema, body: updateSubcontractSchema })]
  }, updateSubcontract);

  // POST /api/worksheets/:id/cancel - Cancel worksheet
  fastify.post('/:id/cancel', {
    schema: {
      description: `Cancel a worksheet. ${roleDescription([1, 2, 6])}`,
      tags: ['Worksheets'],
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(idParamSchema),
      body: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', description: 'Cancellation reason' }
        }
      }
    },
    preHandler: [authorize(1, 2, 6), validateRequest({ params: idParamSchema, body: cancelWorksheetSchema })]
  }, cancelWorksheet);
};

export default worksheetRoutes;
