import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { PreOrderRepository } from '../repositories/implementations/PreOrderRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';
import { safeParseDate, parseOptionalDate } from '../utils/dateHelper.js';
import { PREORDER_CONFIG } from '../config/preOrder.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  BusinessError,
  AuthorizationError,
} from '../errors/AppError.js';
import {
  VALIDATION_ERRORS,
  RESOURCE_ERRORS,
  SUCCESS_MESSAGES,
  AUTHORIZATION_ERRORS,
} from '../constants/errorMessages.js';

// Initialize repository
const preOrderRepo = new PreOrderRepository(prisma);

/**
 * Parse and validate pagination parameters
 */
const parsePaginationParams = (query: Record<string, unknown>): { page: number; limit: number } => {
  let page = parseQueryParam(query.page, PREORDER_CONFIG.DEFAULT_PAGE);
  let limit = parseQueryParam(query.limit, PREORDER_CONFIG.DEFAULT_LIMIT);

  page = Math.max(PREORDER_CONFIG.MIN_PAGE, Math.min(page, PREORDER_CONFIG.MAX_PAGE));
  limit = Math.max(PREORDER_CONFIG.MIN_LIMIT, Math.min(limit, PREORDER_CONFIG.MAX_LIMIT));

  return { page, limit };
};

/**
 * GET /api/pre-orders/generate-code - Get next auto-generated code
 */
export const getGeneratedCode = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const lab = query.lab ? parseInt(query.lab as string, 10) : undefined;

  const result = await preOrderRepo.generateCode(lab);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('kode pre-order'));
  }

  return reply.send({ success: true, data: { code: result.getValue() } });
};

/**
 * GET /api/pre-orders - List with search & pagination
 */
export const getAllPreOrders = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const { page, limit } = parsePaginationParams(query);

  const result = await preOrderRepo.findAll({
    qCode: typeof query.q_code === 'string' ? query.q_code : undefined,
    customerId: query.customer_id ? parseId(query.customer_id as string) ?? undefined : undefined,
    creator: typeof query.creator === 'string' ? query.creator : undefined,
    orderId: query.order_id as 'null' | 'notnull' | number | undefined,
    priority: typeof query.priority === 'string' ? query.priority : undefined,
    receivedDateStart: safeParseDate(query.received_date_start as string) ?? undefined,
    receivedDateEnd: safeParseDate(query.received_date_end as string) ?? undefined,
    characteristic: query.characteristic ? parseInt(query.characteristic as string, 10) : undefined,
    completeDateStatus: query.complete_date as 'null' | 'notnull' | undefined,
    lab: query.lab ? parseInt(query.lab as string, 10) : undefined,
    page,
    limit,
    orderBy: typeof query.order_by === 'string' ? query.order_by : undefined,
    userRole: request.user?.role_id,
    userCustomerId: request.user?.customer_id ?? undefined,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('pre-order'));
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
 * GET /api/pre-orders/:id - Get by ID
 */
export const getPreOrderById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await preOrderRepo.findById(id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.NOT_FOUND('Pre-order'));
  }

  const preOrder = result.getValue();

  // Check customer authorization - customers can only view their own pre-orders
  if (request.user?.role_id === 8 && preOrder?.customerId !== request.user?.customer_id) {
    throw new AuthorizationError(AUTHORIZATION_ERRORS.CUSTOMER_ACCESS_DENIED);
  }

  return reply.send({ success: true, data: preOrder });
};

/**
 * GET /api/pre-orders/json - For autocomplete/dropdown
 */
export const getPreOrdersJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const search = typeof query.q === 'string' ? query.q : undefined;
  const customerId = query.customer_id ? parseId(query.customer_id as string) ?? undefined : undefined;

  const result = await preOrderRepo.findForAutocomplete(search, customerId);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('pre-order'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/pre-orders/datatables - DataTables format for legacy compatibility
 */
export const getPreOrdersDataTables = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const sEcho = parseQueryParam(query.sEcho, 1);
  const iDisplayStart = parseQueryParam(query.iDisplayStart, 0);
  const iDisplayLength = parseQueryParam(query.iDisplayLength, 20);
  const sSearch = typeof query.sSearch === 'string' ? query.sSearch : undefined;
  const lab = query.lab ? parseInt(query.lab as string, 10) : undefined;

  const result = await preOrderRepo.findForDataTables(
    {
      lab,
      userRole: request.user?.role_id,
      userCustomerId: request.user?.customer_id ?? undefined,
    },
    sEcho,
    iDisplayStart,
    iDisplayLength,
    sSearch
  );

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('pre-order'));
  }

  return reply.send(result.getValue());
};

/**
 * GET /api/pre-orders/:id/can-create-order - Check order eligibility
 */
export const checkCanCreateOrder = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await preOrderRepo.canCreateOrder(id);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to check order eligibility');
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/pre-orders/:id/samples - Get samples for pre-order
 */
export const getPreOrderSamples = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Verify pre-order exists
  const preOrderResult = await preOrderRepo.findById(id);
  if (preOrderResult.isFailure()) {
    throw new NotFoundError(preOrderResult.error || RESOURCE_ERRORS.NOT_FOUND('Pre-order'));
  }

  // Check customer authorization
  const preOrder = preOrderResult.getValue();
  if (request.user?.role_id === 8 && preOrder?.customerId !== request.user?.customer_id) {
    throw new AuthorizationError(AUTHORIZATION_ERRORS.CUSTOMER_ACCESS_DENIED);
  }

  const result = await preOrderRepo.getSamples(id);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('samples'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/pre-orders - Create new pre-order
 */
export const createPreOrder = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new ValidationError('User not authenticated');
  }

  const body = request.body as Record<string, unknown>;

  // Parse samples if provided
  const samples = Array.isArray(body.samples)
    ? body.samples.map((s: any) => ({
        id: s.id,
        standartId: s.standart_id ?? null,
        code: s.code,
        name: s.name,
        description: s.description ?? null,
        volume: s.volume ?? null,
        sampleStorage: s.sample_storage ?? null,
        priority: s.priority ?? null,
        customFields: s.custom_fields ?? null,
        indexSample: s.index_sample,
        indexArray: s.index_array,
      }))
    : undefined;

  const result = await preOrderRepo.create({
    customerId: body.customer_id as number,
    contactId: body.contact_id as number,
    quotationId: body.quotation_id as number | null,
    receivedDate: safeParseDate(body.received_date as string) ?? null,
    delivery: body.delivery as string | null,
    receiptNumber: body.receipt_number as string | null,
    driverId: body.driver_id as number | null,
    submitedBy: body.submited_by as string,
    sampleQuantity: body.sample_quantity as number | undefined,
    priority: body.priority as string | null,
    document: body.document as string | null,
    coveringLetter: body.covering_letter as string | null,
    testingParameters: body.testing_parameters as string | null,
    remarks: body.remarks as string | null,
    characteristic: body.characteristic as number | null,
    lab: body.lab as number,
    subcon: body.subcon as number | null,
    subconId: body.subcon_id as number | null,
    subconDue: safeParseDate(body.subcon_due as string) ?? null,
    notesCustomer: body.notes_customer as string | null,
    createdBy: request.user.id,
    samples,
  });

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.CREATE_FAILED('pre-order'));
  }

  return reply.code(201).send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.CREATE_SUCCESS('Pre-order'),
  });
};

/**
 * POST /api/pre-orders/from-quotation/:quotationId - Create from quotation
 */
export const createFromQuotation = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new ValidationError('User not authenticated');
  }

  const params = request.params as { quotationId: string };
  const quotationId = parseId(params.quotationId);

  if (!quotationId) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const body = request.body as Record<string, unknown>;

  const result = await preOrderRepo.createFromQuotation(quotationId, {
    submitedBy: body.submited_by as string,
    receivedDate: safeParseDate(body.received_date as string) ?? null,
    delivery: body.delivery as string | null,
    receiptNumber: body.receipt_number as string | null,
    driverId: body.driver_id as number | null,
    priority: body.priority as string | null,
    remarks: body.remarks as string | null,
    characteristic: body.characteristic as number | null,
    notesCustomer: body.notes_customer as string | null,
    createdBy: request.user.id,
  });

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.CREATE_FAILED('pre-order from quotation'));
  }

  return reply.code(201).send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.CREATE_SUCCESS('Pre-order from quotation'),
  });
};

/**
 * PATCH /api/pre-orders/:id - Update pre-order
 */
export const updatePreOrder = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new ValidationError('User not authenticated');
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const body = request.body as Record<string, unknown>;

  // Parse samples if provided
  let samples;
  if (body.samples !== undefined) {
    samples = Array.isArray(body.samples)
      ? body.samples.map((s: any) => ({
          id: s.id,
          standartId: s.standart_id ?? null,
          code: s.code,
          name: s.name,
          description: s.description ?? null,
          volume: s.volume ?? null,
          sampleStorage: s.sample_storage ?? null,
          priority: s.priority ?? null,
          customFields: s.custom_fields ?? null,
          indexSample: s.index_sample,
          indexArray: s.index_array,
        }))
      : [];
  }

  const result = await preOrderRepo.update(id, {
    customerId: body.customer_id as number | undefined,
    contactId: body.contact_id as number | undefined,
    quotationId: body.quotation_id !== undefined ? (body.quotation_id as number | null) : undefined,
    receivedDate: body.received_date !== undefined ? parseOptionalDate(body.received_date as string) : undefined,
    delivery: body.delivery !== undefined ? (body.delivery as string | null) : undefined,
    receiptNumber: body.receipt_number !== undefined ? (body.receipt_number as string | null) : undefined,
    driverId: body.driver_id !== undefined ? (body.driver_id as number | null) : undefined,
    submitedBy: body.submited_by as string | undefined,
    sampleQuantity: body.sample_quantity as number | undefined,
    priority: body.priority !== undefined ? (body.priority as string | null) : undefined,
    document: body.document !== undefined ? (body.document as string | null) : undefined,
    coveringLetter: body.covering_letter !== undefined ? (body.covering_letter as string | null) : undefined,
    testingParameters: body.testing_parameters !== undefined ? (body.testing_parameters as string | null) : undefined,
    remarks: body.remarks !== undefined ? (body.remarks as string | null) : undefined,
    characteristic: body.characteristic !== undefined ? (body.characteristic as number | null) : undefined,
    lab: body.lab as number | undefined,
    subcon: body.subcon !== undefined ? (body.subcon as number | null) : undefined,
    subconId: body.subcon_id !== undefined ? (body.subcon_id as number | null) : undefined,
    subconDue: body.subcon_due !== undefined ? parseOptionalDate(body.subcon_due as string) : undefined,
    notesCustomer: body.notes_customer !== undefined ? (body.notes_customer as string | null) : undefined,
    updatedBy: request.user.id,
    samples,
  });

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('pre-order'));
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.UPDATE_SUCCESS('Pre-order'),
  });
};

/**
 * POST /api/pre-orders/:id/unlock - Unlock pre-order (SuperAdmin/TechnicalManager only)
 */
export const unlockPreOrder = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new ValidationError('User not authenticated');
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await preOrderRepo.unlock(id, request.user.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('pre-order unlock'));
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: 'Pre-order unlocked successfully',
  });
};

/**
 * DELETE /api/pre-orders/:id - Soft delete pre-order
 */
export const deletePreOrder = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new ValidationError('User not authenticated');
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await preOrderRepo.delete(id, request.user.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.DELETE_FAILED('pre-order'));
  }

  return reply.send({
    success: true,
    message: SUCCESS_MESSAGES.DELETE_SUCCESS('Pre-order'),
  });
};

/**
 * GET /api/pre-orders/:id/outstanding - Check outstanding for pre-order's customer
 */
export const checkOutstanding = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Get pre-order to get customer ID
  const preOrderResult = await preOrderRepo.findById(id);
  if (preOrderResult.isFailure()) {
    throw new NotFoundError(preOrderResult.error || RESOURCE_ERRORS.NOT_FOUND('Pre-order'));
  }

  const preOrder = preOrderResult.getValue();
  if (!preOrder) {
    throw new NotFoundError(RESOURCE_ERRORS.NOT_FOUND('Pre-order'));
  }

  const result = await preOrderRepo.checkOutstanding(preOrder.customerId);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to check outstanding');
  }

  return reply.send({ success: true, data: result.getValue() });
};
