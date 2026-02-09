import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { WorksheetRepository } from '../repositories/implementations/WorksheetRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';
import { ROLE_IDS, isCustomer, isSubcontractStaff } from '../config/roles.js';
import {
  sendCsvFromArray,
  formatDateForCsv,
  WORKSHEET_REPORT_HEADERS,
  TODO_ANALYST_HEADERS,
  ENVIRO_REPORT_HEADERS,
} from '../utils/csvHelper.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  BusinessError,
} from '../errors/AppError.js';
import {
  VALIDATION_ERRORS,
  RESOURCE_ERRORS,
  AUTH_ERRORS,
  AUTHORIZATION_ERRORS,
  BUSINESS_ERRORS,
  SUCCESS_MESSAGES,
} from '../constants/errorMessages.js';

// Initialize repository
const worksheetRepo = new WorksheetRepository(prisma);

/**
 * GET /api/worksheets/generate-code - Get next auto-generated code
 */
export const getGeneratedCode = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const result = await worksheetRepo.generateCode();

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet code'));
  }

  return reply.send({ success: true, data: { code: result.getValue() } });
};

/**
 * GET /api/worksheets - List with search & pagination
 */
export const getAllWorksheets = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const page = parseQueryParam(query.page, 1);
  const limit = parseQueryParam(query.limit, 20);
  const search = typeof query.search === 'string' ? query.search : undefined;
  const sampleId = query.sample_id ? parseId(query.sample_id as string) : undefined;
  const orderId = query.order_id ? parseId(query.order_id as string) : undefined;
  const status = typeof query.status === 'string' ? query.status : undefined;
  const isSubcontract = query.is_subcontract === 'true' || query.is_subcontract === '1';

  // Get analyst type IDs for analyst role
  let userAnalystTypeIds: number[] | undefined;
  if (request.user?.role_id === 5) {
    const analystTypesResult = await worksheetRepo.getUserAnalystTypeIds(request.user.id);
    if (analystTypesResult.isSuccess()) {
      userAnalystTypeIds = analystTypesResult.getValue();
    }
  }

  const result = await worksheetRepo.findAll({
    search,
    sampleId: sampleId || undefined,
    orderId: orderId || undefined,
    status,
    isSubcontract: query.is_subcontract ? isSubcontract : undefined,
    page,
    limit,
    userRole: request.user?.role_id,
    userCustomerId: request.user?.customer_id ?? undefined,
    userAnalystTypeIds,
    analystId: request.user?.role_id === 5 ? request.user.id : undefined,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet'));
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
 * GET /api/worksheets/cursor - List with cursor-based pagination (optimized for large datasets)
 */
export const getWorksheetsWithCursor = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const cursor = query.cursor ? parseId(query.cursor as string) : undefined;
  const limit = parseQueryParam(query.limit, 50);
  const search = typeof query.search === 'string' ? query.search : undefined;
  const sampleId = query.sample_id ? parseId(query.sample_id as string) : undefined;
  const orderId = query.order_id ? parseId(query.order_id as string) : undefined;
  const status = typeof query.status === 'string' ? query.status : undefined;

  // Get analyst type IDs for analyst role
  let userAnalystTypeIds: number[] | undefined;
  if (request.user?.role_id === 5) {
    const analystTypesResult = await worksheetRepo.getUserAnalystTypeIds(request.user.id);
    if (analystTypesResult.isSuccess()) {
      userAnalystTypeIds = analystTypesResult.getValue();
    }
  }

  const result = await worksheetRepo.findAllCursor({
    search,
    sampleId: sampleId || undefined,
    orderId: orderId || undefined,
    status,
    cursor: cursor || undefined,
    limit,
    userRole: request.user?.role_id,
    userCustomerId: request.user?.customer_id ?? undefined,
    userAnalystTypeIds,
    analystId: request.user?.role_id === 5 ? request.user.id : undefined,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet'));
  }

  const data = result.getValue();
  const response: ApiResponse = {
    success: true,
    data: data.items,
    cursor: data.nextCursor,
    hasMore: data.hasMore,
  };

  return reply.send(response);
};

/**
 * GET /api/worksheets/:id
 */
export const getWorksheetById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Check analyst authorization
  if (request.user?.role_id === ROLE_IDS.ANALYST) {
    const authResult = await worksheetRepo.checkAnalystAuthorization(id, request.user.id);
    if (authResult.isSuccess() && !authResult.getValue().isAuthorized) {
      throw new AuthorizationError(authResult.getValue().reason || AUTHORIZATION_ERRORS.FORBIDDEN);
    }
  }

  const result = await worksheetRepo.findById(id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.WORKSHEET_NOT_FOUND);
  }

  const worksheet = result.getValue();

  // Check customer authorization - customers can only view their own worksheets
  if (isCustomer(request.user?.role_id)) {
    if (worksheet && worksheet.sample.order.customer.id !== request.user?.customer_id) {
      throw new AuthorizationError(AUTHORIZATION_ERRORS.CUSTOMER_ACCESS_DENIED);
    }
  }

  // Check subcontract staff authorization - can only view subcontracted worksheets
  if (isSubcontractStaff(request.user?.role_id)) {
    if (worksheet && worksheet.service.status !== 'Subcontracted') {
      throw new AuthorizationError(AUTHORIZATION_ERRORS.SUBCONTRACT_ONLY);
    }
  }

  return reply.send({ success: true, data: worksheet });
};

/**
 * GET /api/worksheets/:id/detail - Get worksheet with detailed information
 */
export const getWorksheetDetail = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Check analyst authorization
  if (request.user?.role_id === ROLE_IDS.ANALYST) {
    const authResult = await worksheetRepo.checkAnalystAuthorization(id, request.user.id);
    if (authResult.isSuccess() && !authResult.getValue().isAuthorized) {
      throw new AuthorizationError(authResult.getValue().reason || AUTHORIZATION_ERRORS.FORBIDDEN);
    }
  }

  const result = await worksheetRepo.findByIdWithDetails(id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.WORKSHEET_NOT_FOUND);
  }

  const worksheet = result.getValue();

  // Check customer authorization - customers can only view their own worksheets
  if (isCustomer(request.user?.role_id)) {
    if (worksheet && worksheet.order.customerName && request.user?.customer_id) {
      // Additional check if needed
    }
  }

  return reply.send({ success: true, data: worksheet });
};

/**
 * GET /api/worksheets/json - For autocomplete/dropdown
 * Supports no_count parameter for optimized queries
 */
export const getWorksheetsJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const search = typeof query.q === 'string' ? query.q : undefined;
  const sampleId = query.sample_id ? parseId(query.sample_id as string) : undefined;
  const noCount = query.no_count === 'true' || query.no_count === '1';
  const limit = parseQueryParam(query.limit, 20);

  // If no_count is true, use optimized query without COUNT
  if (noCount) {
    // Get analyst type IDs for analyst role
    let userAnalystTypeIds: number[] | undefined;
    if (request.user?.role_id === ROLE_IDS.ANALYST) {
      const analystTypesResult = await worksheetRepo.getUserAnalystTypeIds(request.user.id);
      if (analystTypesResult.isSuccess()) {
        userAnalystTypeIds = analystTypesResult.getValue();
      }
    }

    const result = await worksheetRepo.findAllWithNoCount({
      search,
      sampleId: sampleId || undefined,
      limit,
      userRole: request.user?.role_id,
      userCustomerId: request.user?.customer_id ?? undefined,
      userAnalystTypeIds,
      analystId: request.user?.role_id === ROLE_IDS.ANALYST ? request.user.id : undefined,
    });

    if (result.isFailure()) {
      throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet'));
    }

    const { data, hasMore } = result.getValue();
    return reply.send({
      success: true,
      data,
      has_more: hasMore,
    });
  }

  // Default: use autocomplete query
  const result = await worksheetRepo.findForAutocomplete(search, sampleId || undefined, limit);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/worksheets/datatables - DataTables format for legacy compatibility
 */
export const getWorksheetsDataTables = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const sEcho = parseQueryParam(query.sEcho, 1);
  const iDisplayStart = parseQueryParam(query.iDisplayStart, 0);
  const iDisplayLength = parseQueryParam(query.iDisplayLength, 20);
  const sSearch = typeof query.sSearch === 'string' ? query.sSearch : undefined;
  const status = typeof query.status === 'string' ? query.status : undefined;
  const isSubcontract = query.is_subcontract === 'true' || query.is_subcontract === '1';

  // Get analyst type IDs for analyst role
  let userAnalystTypeIds: number[] | undefined;
  if (request.user?.role_id === 5) {
    const analystTypesResult = await worksheetRepo.getUserAnalystTypeIds(request.user.id);
    if (analystTypesResult.isSuccess()) {
      userAnalystTypeIds = analystTypesResult.getValue();
    }
  }

  const result = await worksheetRepo.findForDataTables(
    {
      status,
      isSubcontract: query.is_subcontract ? isSubcontract : undefined,
      userRole: request.user?.role_id,
      userCustomerId: request.user?.customer_id ?? undefined,
      userAnalystTypeIds,
    },
    sEcho,
    iDisplayStart,
    iDisplayLength,
    sSearch
  );

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet'));
  }

  return reply.send(result.getValue());
};

/**
 * GET /api/worksheets/by-sample/:sampleId - Get worksheets by sample
 */
export const getWorksheetsBySample = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const params = request.params as { sampleId: string };
  const sampleId = parseId(params.sampleId);

  if (!sampleId) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await worksheetRepo.findBySampleId(sampleId);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/worksheets
 */
export const createWorksheet = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const body = request.body as Record<string, unknown>;
  const { sample_id, service_id, package_id, standart_id, discount, index_array } = body;

  // Generate code
  const codeResult = await worksheetRepo.generateCode();
  if (codeResult.isFailure()) {
    throw new AppError(500, codeResult.error || RESOURCE_ERRORS.FETCH_FAILED('kode worksheet'));
  }

  const result = await worksheetRepo.create({
    code: codeResult.getValue(),
    sampleId: sample_id as number,
    serviceId: service_id as number,
    packageId: package_id as number | undefined,
    standartId: standart_id as number | undefined,
    discount: discount as number | undefined,
    indexArray: index_array as number[] | undefined,
    createdBy: request.user.id,
  });

  if (result.isFailure()) {
    throw new AppError(400, result.error || RESOURCE_ERRORS.CREATE_FAILED('worksheet'));
  }

  return reply.code(201).send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.CREATE_SUCCESS('Worksheet'),
  });
};

/**
 * PATCH /api/worksheets/:id - Update worksheet result (Analyst action)
 */
export const updateWorksheetResult = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Check analyst authorization (type-based)
  if (request.user.role_id === ROLE_IDS.ANALYST) {
    const authResult = await worksheetRepo.checkAnalystAuthorization(id, request.user.id);
    if (authResult.isSuccess() && !authResult.getValue().isAuthorized) {
      throw new AuthorizationError(authResult.getValue().reason || AUTHORIZATION_ERRORS.FORBIDDEN);
    }

    // Check worksheet assignment (analyst can only update unassigned or own worksheets)
    const assignmentCheck = await worksheetRepo.checkWorksheetAssignment(id, request.user.id);
    if (assignmentCheck.isSuccess() && !assignmentCheck.getValue().canUpdate) {
      throw new AuthorizationError(assignmentCheck.getValue().reason || AUTHORIZATION_ERRORS.WORKSHEET_ASSIGNED_TO_OTHER);
    }
  }

  // Check subcontract staff authorization - can only update subcontracted worksheets
  if (isSubcontractStaff(request.user.role_id)) {
    const worksheetResult = await worksheetRepo.findById(id);
    if (worksheetResult.isSuccess()) {
      const worksheet = worksheetResult.getValue();
      if (worksheet && worksheet.service.status !== 'Subcontracted') {
        throw new AuthorizationError(AUTHORIZATION_ERRORS.SUBCONTRACT_ONLY);
      }
    }
  }

  // Check order status
  const orderCheckResult = await worksheetRepo.checkOrderStatusForUpdate(id);
  if (orderCheckResult.isSuccess() && !orderCheckResult.getValue().canUpdate) {
    throw new BusinessError(orderCheckResult.getValue().reason || BUSINESS_ERRORS.ORDER_STATUS_INVALID);
  }

  const body = request.body as Record<string, unknown>;
  const { result, n_result, unit, remarks, document } = body;

  const updateResult = await worksheetRepo.updateResult(
    id,
    {
      result: result as string | undefined,
      nResult: n_result as number | undefined,
      unit: unit as string | undefined,
      remarks: remarks as string | undefined,
      document: document as string | undefined,
      updatedBy: request.user.id,
    },
    request.user.id,
    request.user.role_id
  );

  if (updateResult.isFailure()) {
    throw new AppError(400, updateResult.error || RESOURCE_ERRORS.UPDATE_FAILED('worksheet'));
  }

  return reply.send({
    success: true,
    data: updateResult.getValue(),
    message: SUCCESS_MESSAGES.UPDATE_SUCCESS('Worksheet'),
  });
};

/**
 * POST /api/worksheets/:id/verify - QC verify worksheet
 */
export const verifyWorksheet = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // QC Type Authorization Check - Microbiology QC vs Chemistry QC
  if (request.user.role_id === ROLE_IDS.QC) {
    const qcTypeCheck = await worksheetRepo.checkQCTypeAuthorization(id, request.user.id);
    if (qcTypeCheck.isSuccess() && !qcTypeCheck.getValue().canVerify) {
      throw new AuthorizationError(qcTypeCheck.getValue().reason || AUTHORIZATION_ERRORS.QC_TYPE_MISMATCH);
    }
  }

  const body = request.body as { message?: string };
  const { message } = body;

  const result = await worksheetRepo.verify(id, {
    verifiedBy: request.user.id,
    message,
  });

  if (result.isFailure()) {
    throw new AppError(400, result.error || RESOURCE_ERRORS.UPDATE_FAILED('worksheet verification'));
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: 'Worksheet verified successfully',
  });
};

/**
 * POST /api/worksheets/:id/approve - TM approve worksheet
 */
export const approveWorksheet = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const body = request.body as { message?: string };
  const { message } = body;

  const result = await worksheetRepo.approve(id, {
    approvedBy: request.user.id,
    message,
  });

  if (result.isFailure()) {
    throw new AppError(400, result.error || RESOURCE_ERRORS.UPDATE_FAILED('worksheet approval'));
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: 'Worksheet approved successfully',
  });
};

/**
 * POST /api/worksheets/:id/revision - QC request revision
 * Uses cascade method to update COA and related entities
 */
export const requestRevision = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // QC Type Authorization Check - Microbiology QC vs Chemistry QC
  if (request.user.role_id === ROLE_IDS.QC) {
    const qcTypeCheck = await worksheetRepo.checkQCTypeAuthorization(id, request.user.id);
    if (qcTypeCheck.isSuccess() && !qcTypeCheck.getValue().canVerify) {
      throw new AuthorizationError(qcTypeCheck.getValue().reason || AUTHORIZATION_ERRORS.QC_TYPE_MISMATCH);
    }
  }

  const body = request.body as { message?: string };
  const { message } = body;

  if (!message) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Revision message'));
  }

  // Use cascade method for full revision workflow (including COA update)
  const result = await worksheetRepo.requestRevisionWithCascade(id, {
    requestedBy: request.user.id,
    message,
  });

  if (result.isFailure()) {
    throw new AppError(400, result.error || RESOURCE_ERRORS.UPDATE_FAILED('revision request'));
  }

  const cascadeResult = result.getValue();
  return reply.send({
    success: true,
    data: {
      worksheet: cascadeResult.worksheet,
      revertedWorksheetCount: cascadeResult.revertedWorksheetCount,
      coaUpdated: cascadeResult.coaUpdated,
      sampleStatus: cascadeResult.newSampleStatus,
      orderStatus: cascadeResult.newOrderStatus,
    },
    message: 'Revision request submitted successfully',
  });
};

/**
 * POST /api/worksheets/:id/internal-retest - QC request internal retest
 */
export const requestInternalRetest = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const body = request.body as { message?: string };
  const { message } = body;

  if (!message) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Retest message'));
  }

  const result = await worksheetRepo.requestInternalRetest(id, {
    requestedBy: request.user.id,
    message,
    isCustomerRetest: false,
  });

  if (result.isFailure()) {
    throw new AppError(400, result.error || RESOURCE_ERRORS.UPDATE_FAILED('internal retest request'));
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: 'Internal retest request submitted successfully',
  });
};

/**
 * POST /api/worksheets/:id/customer-retest - Request customer retest
 * Uses cascade method to update related entities and create notifications
 */
export const requestCustomerRetest = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // QC Type Authorization Check - Microbiology QC vs Chemistry QC
  if (request.user.role_id === ROLE_IDS.QC) {
    const qcTypeCheck = await worksheetRepo.checkQCTypeAuthorization(id, request.user.id);
    if (qcTypeCheck.isSuccess() && !qcTypeCheck.getValue().canVerify) {
      throw new AuthorizationError(qcTypeCheck.getValue().reason || AUTHORIZATION_ERRORS.QC_TYPE_MISMATCH);
    }
  }

  const body = request.body as { message?: string };
  const { message } = body;

  if (!message) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Retest message'));
  }

  // Use cascade method for full customer retest workflow (including notifications)
  const result = await worksheetRepo.requestCustomerRetestWithCascade(id, {
    requestedBy: request.user.id,
    message,
    isCustomerRetest: true,
  });

  if (result.isFailure()) {
    throw new AppError(400, result.error || RESOURCE_ERRORS.UPDATE_FAILED('customer retest request'));
  }

  const cascadeResult = result.getValue();
  return reply.send({
    success: true,
    data: {
      worksheet: cascadeResult.worksheet,
      sampleStatus: cascadeResult.newSampleStatus,
      orderStatus: cascadeResult.newOrderStatus,
      notificationCreated: cascadeResult.notificationId !== null,
    },
    message: 'Customer retest request submitted successfully',
  });
};

/**
 * POST /api/worksheets/quick-submit - Quick result submission
 */
export const quickSubmitResult = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const body = request.body as { worksheet_id: number; result: string; unit: string; n_result?: number };
  const { worksheet_id, result, unit, n_result } = body;

  // Check analyst authorization
  if (request.user.role_id === 5) {
    const authResult = await worksheetRepo.checkAnalystAuthorization(worksheet_id, request.user.id);
    if (authResult.isSuccess() && !authResult.getValue().isAuthorized) {
      throw new AuthorizationError(authResult.getValue().reason || AUTHORIZATION_ERRORS.FORBIDDEN);
    }
  }

  // Check order status
  const orderCheckResult = await worksheetRepo.checkOrderStatusForUpdate(worksheet_id);
  if (orderCheckResult.isSuccess() && !orderCheckResult.getValue().canUpdate) {
    throw new BusinessError(orderCheckResult.getValue().reason || BUSINESS_ERRORS.ORDER_STATUS_INVALID);
  }

  const submitResult = await worksheetRepo.quickSubmit(
    worksheet_id,
    result,
    unit,
    n_result,
    request.user.id,
    request.user.role_id
  );

  if (submitResult.isFailure()) {
    throw new AppError(400, submitResult.error || RESOURCE_ERRORS.UPDATE_FAILED('worksheet result'));
  }

  return reply.send({
    success: true,
    data: submitResult.getValue(),
    message: 'Result submitted successfully',
  });
};

/**
 * PATCH /api/worksheets/:id/subcontract - Update subcontract info
 */
export const updateSubcontract = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const body = request.body as {
    air_way_bill?: string;
    subcon_send_date?: string;
    subcon_received_date?: string;
    subcon_end_date?: string;
  };
  const { air_way_bill, subcon_send_date, subcon_received_date, subcon_end_date } = body;

  const result = await worksheetRepo.updateSubcontract(id, {
    airWayBill: air_way_bill,
    subconSendDate: subcon_send_date ? new Date(subcon_send_date) : undefined,
    subconReceivedDate: subcon_received_date ? new Date(subcon_received_date) : undefined,
    subconEndDate: subcon_end_date ? new Date(subcon_end_date) : undefined,
    updatedBy: request.user.id,
  });

  if (result.isFailure()) {
    throw new AppError(400, result.error || RESOURCE_ERRORS.UPDATE_FAILED('subcontract info'));
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.UPDATE_SUCCESS('Subcontract info'),
  });
};

/**
 * POST /api/worksheets/:id/cancel - Cancel worksheet
 */
export const cancelWorksheet = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const body = request.body as { reason?: string };
  const { reason } = body;

  const result = await worksheetRepo.cancel(id, request.user.id, reason);

  if (result.isFailure()) {
    throw new AppError(400, result.error || RESOURCE_ERRORS.UPDATE_FAILED('worksheet cancellation'));
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: 'Worksheet cancelled successfully',
  });
};

/**
 * DELETE /api/worksheets/:id
 */
export const deleteWorksheet = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await worksheetRepo.delete(id, request.user.id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.WORKSHEET_NOT_FOUND);
  }

  return reply.send({
    success: true,
    message: SUCCESS_MESSAGES.DELETE_SUCCESS('Worksheet'),
  });
};

// ============================================================================
// SPECIALIZED LIST ENDPOINTS
// ============================================================================

/**
 * GET /api/worksheets/delay - Get delayed worksheets (due_date < today)
 */
export const getDelayedWorksheets = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const page = parseQueryParam(query.page, 1);
  const limit = parseQueryParam(query.limit, 20);

  // Get analyst type IDs for analyst role
  let userAnalystTypeIds: number[] | undefined;
  if (request.user?.role_id === ROLE_IDS.ANALYST) {
    const analystTypesResult = await worksheetRepo.getUserAnalystTypeIds(request.user.id);
    if (analystTypesResult.isSuccess()) {
      userAnalystTypeIds = analystTypesResult.getValue();
    }
  }

  const result = await worksheetRepo.findDelayedWorksheets({
    page,
    limit,
    userRole: request.user?.role_id,
    userCustomerId: request.user?.customer_id ?? undefined,
    userAnalystTypeIds,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet terlambat'));
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
 * GET /api/worksheets/today - Get today's worksheets (due_date = today)
 */
export const getTodaysWorksheets = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const page = parseQueryParam(query.page, 1);
  const limit = parseQueryParam(query.limit, 20);

  // Get analyst type IDs for analyst role
  let userAnalystTypeIds: number[] | undefined;
  if (request.user?.role_id === ROLE_IDS.ANALYST) {
    const analystTypesResult = await worksheetRepo.getUserAnalystTypeIds(request.user.id);
    if (analystTypesResult.isSuccess()) {
      userAnalystTypeIds = analystTypesResult.getValue();
    }
  }

  const result = await worksheetRepo.findTodaysWorksheets({
    page,
    limit,
    userRole: request.user?.role_id,
    userCustomerId: request.user?.customer_id ?? undefined,
    userAnalystTypeIds,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet hari ini'));
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
 * GET /api/worksheets/retest - Get retest worksheets
 */
export const getRetestWorksheets = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const page = parseQueryParam(query.page, 1);
  const limit = parseQueryParam(query.limit, 20);

  // Get analyst type IDs for analyst role
  let userAnalystTypeIds: number[] | undefined;
  if (request.user?.role_id === ROLE_IDS.ANALYST) {
    const analystTypesResult = await worksheetRepo.getUserAnalystTypeIds(request.user.id);
    if (analystTypesResult.isSuccess()) {
      userAnalystTypeIds = analystTypesResult.getValue();
    }
  }

  const result = await worksheetRepo.findRetestWorksheets({
    page,
    limit,
    userRole: request.user?.role_id,
    userCustomerId: request.user?.customer_id ?? undefined,
    userAnalystTypeIds,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet retest'));
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
 * GET /api/worksheets/revision - Get revision worksheets
 */
export const getRevisionWorksheets = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const page = parseQueryParam(query.page, 1);
  const limit = parseQueryParam(query.limit, 20);

  // Get analyst type IDs for analyst role
  let userAnalystTypeIds: number[] | undefined;
  if (request.user?.role_id === ROLE_IDS.ANALYST) {
    const analystTypesResult = await worksheetRepo.getUserAnalystTypeIds(request.user.id);
    if (analystTypesResult.isSuccess()) {
      userAnalystTypeIds = analystTypesResult.getValue();
    }
  }

  const result = await worksheetRepo.findRevisionWorksheets({
    page,
    limit,
    userRole: request.user?.role_id,
    userCustomerId: request.user?.customer_id ?? undefined,
    userAnalystTypeIds,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet revisi'));
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
 * GET /api/worksheets/calculation - Get calculation worksheets (specific service IDs)
 */
export const getCalculationWorksheets = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const page = parseQueryParam(query.page, 1);
  const limit = parseQueryParam(query.limit, 20);

  const result = await worksheetRepo.findCalculationWorksheets({
    page,
    limit,
    userRole: request.user?.role_id,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('worksheet kalkulasi'));
  }

  const data = result.getValue();
  const response: ApiResponse = {
    success: true,
    data: data.data,
    pagination: data.pagination,
  };

  return reply.send(response);
};

// ============================================================================
// REPORT EXPORT ENDPOINTS
// ============================================================================

/**
 * GET /api/worksheets/reports/worksheet - Export worksheet report as CSV
 */
export const exportWorksheetReport = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const start = query.start ? new Date(query.start as string) : undefined;
  const end = query.end ? new Date(query.end as string) : undefined;
  const type = (query.type as 'M' | 'C' | '') || '';

  const result = await worksheetRepo.findForReport({
    dateFrom: start,
    dateTo: end,
    type: type || undefined,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('laporan worksheet'));
  }

  const worksheets = result.getValue();

  // Transform to CSV format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const csvData = worksheets.map((ws: any) => ({
    'WORKSHEET CODE': ws.code,
    'SAMPLE CODE': ws.sample.code,
    'SAMPLE NAME': ws.sample.name,
    'PRIORITY': ws.sample.priority,
    'REVIEWED DATE': formatDateForCsv(ws.order.reviewedDate),
    'RELEASE DUE DATE': formatDateForCsv(ws.sample.coaReleaseDueDate),
    'PARAMETER': ws.service.name,
    'METHOD': ws.method.name,
    'DUE DATE': formatDateForCsv(ws.sample.dueDate),
    'STATUS': ws.status,
    'RESULT': ws.result || '',
    'UNIT': ws.unit || '',
    'ANALYST': ws.analyst.name || '',
    'QC': ws.qc.name || '',
    'CUSTOMER': ws.customer.name,
    'CATEGORY': ws.service.category || '',
    'PRICE': ws.service.price || '',
  }));

  const filename = `worksheet_report_${new Date().toISOString().split('T')[0]}.csv`;
  sendCsvFromArray(reply, csvData, filename, WORKSHEET_REPORT_HEADERS);
};

/**
 * GET /api/worksheets/reports/todo-analyst - Export analyst TODO summary as CSV
 */
export const exportTodoAnalyst = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const start = query.start
    ? new Date(query.start as string)
    : new Date(new Date().setDate(new Date().getDate() - 7)); // Default: last 7 days
  const end = query.end
    ? new Date(query.end as string)
    : new Date();

  const result = await worksheetRepo.findTodoAnalystSummary(start, end);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('laporan TODO analis'));
  }

  const summary = result.getValue();

  // Transform to CSV format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const csvData = summary.map((item: any) => ({
    'ANALYST TYPE': item.typeName,
    'PARAMETER': item.parameterName,
    'COUNT': item.count,
  }));

  const filename = `todo_analyst_${new Date().toISOString().split('T')[0]}.csv`;
  sendCsvFromArray(reply, csvData, filename, TODO_ANALYST_HEADERS);
};

/**
 * GET /api/worksheets/reports/enviro - Export environmental report as CSV
 */
export const exportEnviroReport = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as Record<string, unknown>;
  const start = query.start
    ? new Date(query.start as string)
    : new Date(new Date().setMonth(new Date().getMonth() - 1)); // Default: last month
  const end = query.end
    ? new Date(query.end as string)
    : new Date();

  const result = await worksheetRepo.findEnviroWorksheets(start, end);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('laporan lingkungan'));
  }

  const worksheets = result.getValue();

  // Transform to CSV format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const csvData = worksheets.map((ws: any) => ({
    'WORKSHEET CODE': ws.code,
    'SAMPLE CODE': ws.sample.code,
    'SERVICE NAME': ws.service.name,
    'METHOD': ws.method.name,
    'STATUS': ws.status,
    'DUE DATE': formatDateForCsv(ws.sample.dueDate),
    'FINISH DATE': formatDateForCsv(ws.finishDate),
    'ANALYST': ws.analyst.name || '',
  }));

  const filename = `enviro_report_${new Date().toISOString().split('T')[0]}.csv`;
  sendCsvFromArray(reply, csvData, filename, ENVIRO_REPORT_HEADERS);
};

// ============================================================================
// AUTHORIZATION HELPER FUNCTIONS
// ============================================================================

/**
 * Check customer authorization for worksheet access
 */
export const checkCustomerWorksheetAccess = async (
  worksheetId: number,
  userCustomerId: number | null | undefined
): Promise<{ authorized: boolean; reason?: string }> => {
  if (!userCustomerId) {
    return { authorized: false, reason: 'Customer ID not found' };
  }

  const result = await worksheetRepo.findById(worksheetId);
  if (result.isFailure()) {
    return { authorized: false, reason: result.error };
  }

  const worksheet = result.getValue();
  if (!worksheet) {
    return { authorized: false, reason: 'Worksheet not found' };
  }

  if (worksheet.sample.order.customer.id !== userCustomerId) {
    return { authorized: false, reason: 'Cannot access other customer worksheets' };
  }

  return { authorized: true };
};

/**
 * Check subcontract staff authorization for worksheet access
 */
export const checkSubcontractAccess = async (
  worksheetId: number
): Promise<{ authorized: boolean; reason?: string }> => {
  const result = await worksheetRepo.findById(worksheetId);
  if (result.isFailure()) {
    return { authorized: false, reason: result.error };
  }

  const worksheet = result.getValue();
  if (!worksheet) {
    return { authorized: false, reason: 'Worksheet not found' };
  }

  if (worksheet.service.status !== 'Subcontracted') {
    return { authorized: false, reason: 'Worksheet is not subcontracted' };
  }

  return { authorized: true };
};
