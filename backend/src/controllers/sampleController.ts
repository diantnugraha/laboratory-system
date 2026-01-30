import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { SampleRepository } from '../repositories/implementations/SampleRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
} from '../errors/AppError.js';
import {
  VALIDATION_ERRORS,
  RESOURCE_ERRORS,
  AUTH_ERRORS,
  SUCCESS_MESSAGES,
} from '../constants/errorMessages.js';
import { DueDateCalculatorService } from '../services/dueDateCalculatorService.js';
import { PaymentVerificationService } from '../services/paymentVerificationService.js';
import { SAMPLE_ROLES, SamplePriority } from '../config/sample.js';
import type {
  ApproveSampleBody,
  ReceiveSampleBody,
  CancelSampleBody,
  SampleReportQuery,
} from '../validators/sample.js';

// Initialize repository and services
const sampleRepo = new SampleRepository(prisma);
const dueDateService = new DueDateCalculatorService(prisma);
const paymentService = new PaymentVerificationService(prisma);

/**
 * GET /api/samples/generate-code - Get next auto-generated code
 */
export const getGeneratedCode = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const result = await sampleRepo.generateCode();

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('kode sampel'));
  }

  return reply.send({ success: true, data: { code: result.getValue() } });
};

/**
 * GET /api/samples - List with search & pagination
 */
export const getAllSamples = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, string | undefined>;
  const page = parseQueryParam(query.page, 1);
  const limit = parseQueryParam(query.limit, 20);
  const search = typeof query.search === 'string' ? query.search : undefined;
  const orderId = query.order_id ? parseId(query.order_id as string) : undefined;
  const customerId = query.customer_id ? parseId(query.customer_id as string) : undefined;
  const status = typeof query.status === 'string' ? query.status : undefined;

  const result = await sampleRepo.findAll({
    search,
    orderId: orderId || undefined,
    customerId: customerId || undefined,
    status,
    page,
    limit,
    userRole: request.user?.role_id,
    userCustomerId: request.user?.customer_id ?? undefined,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('sampel'));
  }

  const data = result.getValue();
  const response: ApiResponse = {
    success: true,
    data: data.data,
    pagination: data.pagination,
  };

  return reply.send(response);
};

/**
 * GET /api/samples/:id
 */
export const getSampleById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await sampleRepo.findById(id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.SAMPLE_NOT_FOUND);
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/samples/:id/detail - Get sample with detailed information including worksheets
 */
export const getSampleDetail = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await sampleRepo.findByIdWithDetails(id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.SAMPLE_NOT_FOUND);
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/samples/json - For autocomplete/dropdown
 */
export const getSamplesJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const search = typeof query.q === 'string' ? query.q : undefined;
  const orderId = query.order_id ? parseId(query.order_id as string) : undefined;

  const result = await sampleRepo.findForAutocomplete(search, orderId || undefined);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('sampel'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/samples/by-order/:orderId - Get samples by order
 */
export const getSamplesByOrder = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const params = request.params as { orderId: string };
  const orderId = parseId(params.orderId);

  if (!orderId) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await sampleRepo.findByOrderId(orderId);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('sampel'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/samples
 */
export const createSample = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const body = request.body as {
    order_id: number;
    standart_id?: number;
    name: string;
    description?: string;
    volume?: string;
    sample_storage?: string;
    received_date?: string;
    quantity?: number;
    priority?: string;
    status?: string;
    due_date?: string;
    coa_release_due_date?: string;
  };
  const {
    order_id,
    standart_id,
    name,
    description,
    volume,
    sample_storage,
    received_date,
    quantity,
    priority,
    status,
    due_date,
    coa_release_due_date,
  } = body;

  // Generate code
  const codeResult = await sampleRepo.generateCode();
  if (codeResult.isFailure()) {
    throw new AppError(500, codeResult.error || RESOURCE_ERRORS.FETCH_FAILED('kode sampel'));
  }

  const result = await sampleRepo.create({
    code: codeResult.getValue(),
    orderId: order_id,
    standartId: standart_id,
    name,
    description,
    volume,
    sampleStorage: sample_storage,
    receivedDate: received_date ? new Date(received_date) : null,
    quantity,
    priority,
    status: status || 'Process',
    dueDate: due_date ? new Date(due_date) : null,
    coaReleaseDueDate: coa_release_due_date ? new Date(coa_release_due_date) : null,
    createdBy: request.user.id,
  });

  if (result.isFailure()) {
    throw new AppError(400, result.error || RESOURCE_ERRORS.CREATE_FAILED('sampel'));
  }

  return reply.code(201).send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.CREATE_SUCCESS('Sampel'),
  });
};

/**
 * PUT /api/samples/:id
 */
export const updateSample = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Check if sample exists
  const existingResult = await sampleRepo.findById(id);
  if (existingResult.isFailure()) {
    throw new NotFoundError(existingResult.error || RESOURCE_ERRORS.SAMPLE_NOT_FOUND);
  }

  const body = request.body as {
    standart_id?: number;
    name?: string;
    description?: string;
    volume?: string;
    sample_storage?: string;
    received_date?: string | null;
    quantity?: number;
    priority?: string;
    status?: string;
    due_date?: string | null;
    coa_release_due_date?: string | null;
    analysis_finished_date?: string | null;
    lead_time?: string;
  };
  const {
    standart_id,
    name,
    description,
    volume,
    sample_storage,
    received_date,
    quantity,
    priority,
    status,
    due_date,
    coa_release_due_date,
    analysis_finished_date,
    lead_time,
  } = body;

  const result = await sampleRepo.update(id, {
    standartId: standart_id,
    name,
    description,
    volume,
    sampleStorage: sample_storage,
    receivedDate: received_date !== undefined ? (received_date ? new Date(received_date) : null) : undefined,
    quantity,
    priority,
    status,
    dueDate: due_date !== undefined ? (due_date ? new Date(due_date) : null) : undefined,
    coaReleaseDueDate: coa_release_due_date !== undefined ? (coa_release_due_date ? new Date(coa_release_due_date) : null) : undefined,
    analysisFinishedDate: analysis_finished_date !== undefined ? (analysis_finished_date ? new Date(analysis_finished_date) : null) : undefined,
    leadTime: lead_time,
    updatedBy: request.user.id,
  });

  if (result.isFailure()) {
    throw new AppError(400, result.error || RESOURCE_ERRORS.UPDATE_FAILED('sampel'));
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.UPDATE_SUCCESS('Sampel'),
  });
};

/**
 * PATCH /api/samples/:id/status - Update sample status
 */
export const updateSampleStatus = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const body = request.body as { status: string };
  const { status } = body;

  const result = await sampleRepo.updateStatus(id, status, request.user.id);

  if (result.isFailure()) {
    throw new AppError(400, result.error || RESOURCE_ERRORS.UPDATE_FAILED('status sampel'));
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.UPDATE_SUCCESS('Status sampel'),
  });
};

/**
 * DELETE /api/samples/:id
 */
export const deleteSample = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await sampleRepo.delete(id, request.user.id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.SAMPLE_NOT_FOUND);
  }

  return reply.send({
    success: true,
    message: SUCCESS_MESSAGES.DELETE_SUCCESS('Sampel'),
  });
};

// ===== Workflow Endpoints =====

/**
 * POST /api/samples/:id/approve - Approve sample (TM only)
 */
export const approveSample = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  // Check TM role
  if (request.user.role_id !== SAMPLE_ROLES.TECHNICAL_MANAGER) {
    throw new AuthorizationError('Only Technical Manager can approve samples');
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const body = request.body as ApproveSampleBody;

  // Get sample to check customer
  const sampleResult = await sampleRepo.findById(id);
  if (sampleResult.isFailure()) {
    throw new NotFoundError(sampleResult.error || RESOURCE_ERRORS.SAMPLE_NOT_FOUND);
  }

  const sample = sampleResult.getValue();
  if (!sample) {
    throw new NotFoundError(RESOURCE_ERRORS.SAMPLE_NOT_FOUND);
  }

  if (!sample.order.customer) {
    throw new AppError(400, 'Sample order has no customer assigned');
  }

  // Verify payment status
  const paymentResult = await paymentService.verifyForApproval(
    sample.order.customer.id,
    sample.order.id
  );

  if (!paymentResult.canProceed) {
    throw new AppError(400, paymentResult.reason || 'Payment verification failed');
  }

  // Approve sample
  const result = await sampleRepo.approveSample(id, request.user.id, {
    publishCoa: body.publish_coa,
    sendEmail: body.send_email,
    resultSummary: body.result_summary,
  });

  if (result.isFailure()) {
    throw new AppError(400, result.error || 'Failed to approve sample');
  }

  const approvalResult = result.getValue();

  return reply.send({
    success: true,
    data: approvalResult,
    message: SUCCESS_MESSAGES.UPDATE_SUCCESS('Sample approved'),
    paymentWarning: paymentResult.isSpecialCustomer && paymentResult.outstandingAmount > 0
      ? paymentResult.reason
      : undefined,
  });
};

/**
 * POST /api/samples/:id/verify - Verify sample (QC only)
 */
export const verifySample = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  // Check QC role
  if (request.user.role_id !== SAMPLE_ROLES.QC) {
    throw new AuthorizationError('Only Quality Control can verify samples');
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Get user's analyst type authorization
  const analystRules = await prisma.analystRules.findMany({
    where: {
      user_id: request.user.id,
      trash: null,
    },
    select: {
      analyst_type_id: true,
    },
  });

  if (analystRules.length === 0) {
    throw new AuthorizationError('No analyst type authorization found for this user');
  }

  const analystTypeIds = analystRules.map(r => r.analyst_type_id);

  // Verify sample
  const result = await sampleRepo.verifySample(id, request.user.id, analystTypeIds);

  if (result.isFailure()) {
    throw new AppError(400, result.error || 'Failed to verify sample');
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.UPDATE_SUCCESS('Sample verification'),
  });
};

/**
 * POST /api/samples/:id/cancel - Cancel sample
 */
export const cancelSample = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const body = request.body as CancelSampleBody;

  const result = await sampleRepo.cancelSample(id, request.user.id, body.reason ?? undefined);

  if (result.isFailure()) {
    throw new AppError(400, result.error || 'Failed to cancel sample');
  }

  const cancelResult = result.getValue();

  return reply.send({
    success: true,
    data: cancelResult,
    message: SUCCESS_MESSAGES.UPDATE_SUCCESS('Sample cancelled'),
  });
};

/**
 * POST /api/samples/:id/receive - Receive sample
 */
export const receiveSample = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const body = request.body as ReceiveSampleBody;

  // Fetch sample to get order's number_holiday
  const sampleResult = await sampleRepo.findById(id);
  if (sampleResult.isFailure()) {
    throw new NotFoundError(sampleResult.error || RESOURCE_ERRORS.SAMPLE_NOT_FOUND);
  }

  const sample = sampleResult.getValue();
  if (!sample) {
    throw new NotFoundError(RESOURCE_ERRORS.SAMPLE_NOT_FOUND);
  }

  // Get number_holiday from order (defaults to 0 if not set)
  const orderHolidayCount = (sample.order as any)?.number_holiday ?? 0;

  // Parse received date
  const receivedDate = new Date(body.received_date);
  if (isNaN(receivedDate.getTime())) {
    throw new ValidationError('Invalid received date');
  }

  // Extract time from received date for time-of-day adjustment
  // Format: "HH:mm" - if received after 14:00, adds 1 day to due date
  const receivedHours = receivedDate.getHours().toString().padStart(2, '0');
  const receivedMinutes = receivedDate.getMinutes().toString().padStart(2, '0');
  const receivedTime = `${receivedHours}:${receivedMinutes}`;

  // Calculate due dates based on priority
  // Business rules:
  // - Normal: 6 working days
  // - Urgent: 4 working days
  // - Very Urgent: 2 working days
  // - Add 1 day if received after 14:00
  // - Add order.number_holiday days
  const priority = body.priority || 'Normal';
  const dueDates = await dueDateService.calculate({
    startDate: receivedDate,
    priority: priority as SamplePriority,
    receivedTime: receivedTime,
    holidayCount: orderHolidayCount,
  });

  // Receive sample
  const result = await sampleRepo.receiveSample(
    id,
    {
      receivedDate,
      dueDate: dueDates.dueDate,
      coaReleaseDueDate: dueDates.coaReleaseDueDate,
      name: body.name,
      description: body.description,
      quantity: body.quantity,
    },
    request.user.id
  );

  if (result.isFailure()) {
    throw new AppError(400, result.error || 'Failed to receive sample');
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.UPDATE_SUCCESS('Sample received'),
  });
};

/**
 * GET /api/samples/report - Export sample report (Excel)
 */
export const exportSampleReport = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const query = request.query as SampleReportQuery;

  const dateFrom = new Date(query.start);
  const dateTo = new Date(query.end);

  if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
    throw new ValidationError('Invalid date range');
  }

  // Set end date to end of day
  dateTo.setHours(23, 59, 59, 999);

  const result = await sampleRepo.findForReport({
    dateFrom,
    dateTo,
    customerId: query.customer_id,
    status: query.status ? [query.status] : undefined,
    includeTrash: query.include_trash,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to generate report');
  }

  const data = result.getValue();

  // Build CSV content (can be enhanced to Excel later)
  const headers = [
    'ID',
    'Code',
    'Name',
    'Status',
    'Priority',
    'Received Date',
    'Due Date',
    'COA Release Due',
    'Analysis Finished',
    'Order Code',
    'Customer Code',
    'Customer Name',
    'Worksheets',
    'Approved',
    'Created At',
  ];

  const rows = data.map(row => [
    row.id,
    row.code,
    row.name,
    row.status,
    row.priority,
    row.receivedDate?.toISOString().split('T')[0] || '',
    row.dueDate?.toISOString().split('T')[0] || '',
    row.coaReleaseDueDate?.toISOString().split('T')[0] || '',
    row.analysisFinishedDate?.toISOString().split('T')[0] || '',
    row.orderCode,
    row.customerCode,
    row.customerName,
    row.worksheetCount,
    row.worksheetApprovedCount,
    row.createdAt.toISOString().split('T')[0],
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

  const filename = `sample-report-${query.start}-${query.end}.csv`;

  return reply
    .header('Content-Type', 'text/csv')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(csvContent);
};

/**
 * GET /api/samples/report-csv - Export sample report (CSV)
 */
export const exportSampleReportCsv = exportSampleReport;
