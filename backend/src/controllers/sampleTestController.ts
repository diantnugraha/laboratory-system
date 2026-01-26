import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { SampleRepository } from '../repositories/implementations/SampleRepository.js';
// parseId, parseQueryParam, ApiResponse are available if needed
import {
  AppError,
  AuthenticationError,
} from '../errors/AppError.js';
import {
  AUTH_ERRORS,
} from '../constants/errorMessages.js';
import { SAMPLE_CONFIG } from '../config/sample.js';
import type { SampleTestQuery } from '../validators/sampleTest.js';
import type { SampleDashboardFilter } from '../repositories/contracts/ISampleRepository.js';

// Initialize repository
const sampleRepo = new SampleRepository(prisma);

/**
 * Parse sample test query parameters into dashboard filter
 */
const parseQueryToFilter = (
  query: SampleTestQuery,
  request: FastifyRequest
): SampleDashboardFilter => {
  return {
    search: query.search || query.q || query.q_code,
    orderId: query.order_id,
    customerId: query.customer_id,
    status: query.status,
    page: query.page || query.iDisplayStart
      ? Math.floor((query.iDisplayStart || 0) / (query.iDisplayLength || SAMPLE_CONFIG.DEFAULT_LIMIT)) + 1
      : SAMPLE_CONFIG.DEFAULT_PAGE,
    limit: query.limit || query.per_page || query.iDisplayLength || SAMPLE_CONFIG.DEFAULT_LIMIT,
    orderBy: query.order_by,
    sortDir: query.sort_dir || query.sSortDir_0,
    includeCoa: query.include?.includes('coa'),
    includeCustomer: query.include?.includes('customer'),
    userRole: request.user?.role_id,
    userCustomerId: request.user?.customer_id ?? undefined,
  };
};

/**
 * Format response for DataTable if requested
 */
const formatResponse = (
  data: any,
  pagination: any,
  query: SampleTestQuery
): any => {
  if (query.dataTable) {
    return {
      sEcho: query.sEcho || 1,
      iTotalRecords: pagination.total,
      iTotalDisplayRecords: pagination.total,
      aaData: data.map((item: any) => [
        item.code,
        item.name,
        item.order?.code || '',
        item.order?.customer?.customer_name || '',
        item.status,
        item.receivedDate?.toISOString().split('T')[0] || '',
        item.coaReleaseDueDate?.toISOString().split('T')[0] || '',
        item.remainingTime || '',
        item.id, // For action buttons
      ]),
    };
  }

  return {
    success: true,
    data,
    pagination,
  };
};

/**
 * GET /api/sample-tests/json - Main sample list with filters
 */
export const getSampleTestJson = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const query = request.query as SampleTestQuery;
  const filter = parseQueryToFilter(query, request);

  // Use findAll with dashboard-style filter
  const result = await sampleRepo.findAll({
    ...filter,
    // Additional dashboard filters can be added here
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch samples');
  }

  const { data, pagination } = result.getValue();

  return reply.send(formatResponse(data, pagination, query));
};

/**
 * GET /api/sample-tests/delay - Delayed samples (past COA due date)
 */
export const getSampleDelayJson = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const query = request.query as SampleTestQuery;
  const filter = parseQueryToFilter(query, request);

  const result = await sampleRepo.findDelayedSamples(filter);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch delayed samples');
  }

  const { data, pagination } = result.getValue();

  return reply.send(formatResponse(data, pagination, query));
};

/**
 * GET /api/sample-tests/today - Samples due today
 */
export const getSampleTodayJson = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const query = request.query as SampleTestQuery;
  const filter = parseQueryToFilter(query, request);

  const result = await sampleRepo.findSamplesDueToday(filter);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch samples due today');
  }

  const { data, pagination } = result.getValue();

  return reply.send(formatResponse(data, pagination, query));
};

/**
 * GET /api/sample-tests/retest - Samples in retest status
 */
export const getSampleRetestJson = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const query = request.query as SampleTestQuery;
  const filter = parseQueryToFilter(query, request);

  // Check for retest type in query
  const retestType = (query as any).retest_type as 'internal' | 'customer' | undefined;
  if (retestType) {
    filter.retestStatus = retestType;
  }

  const result = await sampleRepo.findRetestSamples(filter);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch retest samples');
  }

  const { data, pagination } = result.getValue();

  return reply.send(formatResponse(data, pagination, query));
};

/**
 * GET /api/sample-tests/revise - Samples needing revision
 */
export const getSampleReviseJson = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const query = request.query as SampleTestQuery;
  const filter = parseQueryToFilter(query, request);

  const result = await sampleRepo.findRevisionSamples(filter);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch revision samples');
  }

  const { data, pagination } = result.getValue();

  return reply.send(formatResponse(data, pagination, query));
};

/**
 * GET /api/sample-tests/waiting-payment - Delayed samples waiting for payment
 */
export const getSampleWaitingPaymentJson = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const query = request.query as SampleTestQuery;
  const filter = parseQueryToFilter(query, request);

  const result = await sampleRepo.findWaitingPaymentSamples(filter);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch samples waiting payment');
  }

  const { data, pagination } = result.getValue();

  return reply.send(formatResponse(data, pagination, query));
};
