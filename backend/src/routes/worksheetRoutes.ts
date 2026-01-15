import express, { Router } from 'express';
import {
  getAllWorksheets,
  getWorksheetById,
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
} from '../controllers/worksheetController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateRequest } from '../middleware/zodValidator';
import {
  idParamSchema,
} from '../validators';
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
} from '../validators/worksheet';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// ===== Utility endpoints (before parameterized routes) =====

// JSON API endpoint - for autocomplete/dropdown
router.get('/json', validate(worksheetJsonQuerySchema, 'query'), getWorksheetsJson);

// DataTables format - for legacy compatibility
router.get('/datatables', validate(worksheetDataTablesQuerySchema, 'query'), getWorksheetsDataTables);

// Generate code endpoint - for creating new worksheets
router.get('/generate-code', authorize(1, 2, 3), getGeneratedCode);

// Get worksheets by sample
router.get('/by-sample/:sampleId', authorize(1, 2, 3, 5, 6, 7, 9, 8), getWorksheetsBySample);

// ===== Quick submit endpoint =====
// Analyst (5) can quick submit results
router.post('/quick-submit', authorize(5), validate(quickSubmitSchema), quickSubmitResult);

// ===== CRUD operations =====

// GET /api/worksheets - List with search
// Roles: SuperAdmin(1), Admin(2), Sales(3), Analyst(5), QC(6), TechnicalManager(7), Supervisor(9), Customer(8)
router.get('/', authorize(1, 2, 3, 5, 6, 7, 9, 8), validate(worksheetQuerySchema, 'query'), getAllWorksheets);

// GET /api/worksheets/:id - Get detail
router.get('/:id', authorize(1, 2, 3, 5, 6, 7, 9, 8), validate(idParamSchema, 'params'), getWorksheetById);

// POST /api/worksheets - Create (role-based: SuperAdmin, Admin, Sales)
router.post('/', authorize(1, 2, 3), validate(createWorksheetSchema), createWorksheet);

// PATCH /api/worksheets/:id - Update result (Analyst action)
// Roles: Analyst(5), SubcontractStaff(10)
router.patch('/:id', authorize(5, 10), validateRequest({
  params: idParamSchema,
  body: updateWorksheetResultSchema,
}), updateWorksheetResult);

// DELETE /api/worksheets/:id - Delete (SuperAdmin, Admin only)
router.delete('/:id', authorize(1, 2), validate(idParamSchema, 'params'), deleteWorksheet);

// ===== Status workflow actions =====

// POST /api/worksheets/:id/verify - QC verify
router.post('/:id/verify', authorize(6), validateRequest({
  params: idParamSchema,
  body: verifyWorksheetSchema,
}), verifyWorksheet);

// POST /api/worksheets/:id/approve - TM approve
router.post('/:id/approve', authorize(7), validateRequest({
  params: idParamSchema,
  body: approveWorksheetSchema,
}), approveWorksheet);

// POST /api/worksheets/:id/revision - QC request revision
router.post('/:id/revision', authorize(6), validateRequest({
  params: idParamSchema,
  body: revisionRequestSchema,
}), requestRevision);

// POST /api/worksheets/:id/internal-retest - QC request internal retest
router.post('/:id/internal-retest', authorize(6), validateRequest({
  params: idParamSchema,
  body: retestRequestSchema,
}), requestInternalRetest);

// POST /api/worksheets/:id/customer-retest - Customer retest (QC or Customer)
router.post('/:id/customer-retest', authorize(6, 8), validateRequest({
  params: idParamSchema,
  body: retestRequestSchema,
}), requestCustomerRetest);

// ===== Additional actions =====

// PATCH /api/worksheets/:id/subcontract - Update subcontract info
router.patch('/:id/subcontract', authorize(1, 2, 3, 10), validateRequest({
  params: idParamSchema,
  body: updateSubcontractSchema,
}), updateSubcontract);

// POST /api/worksheets/:id/cancel - Cancel worksheet
router.post('/:id/cancel', authorize(1, 2, 6), validateRequest({
  params: idParamSchema,
  body: cancelWorksheetSchema,
}), cancelWorksheet);

export default router;
