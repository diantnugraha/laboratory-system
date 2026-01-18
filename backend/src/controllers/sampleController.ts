import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { SampleRepository } from '../repositories/implementations/SampleRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
} from '../errors/AppError.js';
import {
  VALIDATION_ERRORS,
  RESOURCE_ERRORS,
  AUTH_ERRORS,
  SUCCESS_MESSAGES,
} from '../constants/errorMessages.js';

// Initialize repository
const sampleRepo = new SampleRepository(prisma);

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
  const query = request.query as Record<string, unknown>;
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
    sample_type?: string;
    sample_condition?: string;
    sampling_date?: string;
    received_date?: string;
    quantity?: number;
    unit?: string;
    status?: string;
    due_date?: string;
    coa_release_due_date?: string;
  };
  const {
    order_id,
    standart_id,
    name,
    description,
    sample_type,
    sample_condition,
    sampling_date,
    received_date,
    quantity,
    unit,
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
    sampleType: sample_type,
    sampleCondition: sample_condition,
    samplingDate: sampling_date ? new Date(sampling_date) : null,
    receivedDate: received_date ? new Date(received_date) : null,
    quantity,
    unit,
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
    sample_type?: string;
    sample_condition?: string;
    sampling_date?: string | null;
    received_date?: string | null;
    quantity?: number;
    unit?: string;
    status?: string;
    due_date?: string | null;
    coa_release_due_date?: string | null;
    analysis_finished_date?: string | null;
    lead_time?: number;
  };
  const {
    standart_id,
    name,
    description,
    sample_type,
    sample_condition,
    sampling_date,
    received_date,
    quantity,
    unit,
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
    sampleType: sample_type,
    sampleCondition: sample_condition,
    samplingDate: sampling_date !== undefined ? (sampling_date ? new Date(sampling_date) : null) : undefined,
    receivedDate: received_date !== undefined ? (received_date ? new Date(received_date) : null) : undefined,
    quantity,
    unit,
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
