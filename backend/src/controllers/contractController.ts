import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { CONTRACT_DEFAULTS, CONTRACT_STATUS, ContractStatus } from '../config/contract.js';
import { sanitizeSearchQuery } from '../utils/searchHelper.js';
import { parseId, parseQueryParam, ApiResponse, safeParseInt, safeParseIntOptional, safeParseFloatOptional } from '../types/index.js';
import { ContractRepository } from '../repositories/implementations/ContractRepository.js';
import { ContractDetailDTO } from '../repositories/contracts/IContractRepository.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthenticationError,
  AuthorizationError,
} from '../errors/AppError.js';
import {
  VALIDATION_ERRORS,
  RESOURCE_ERRORS,
  AUTH_ERRORS,
  AUTHORIZATION_ERRORS,
  SUCCESS_MESSAGES,
} from '../constants/errorMessages.js';

// Response interface for contracts JSON endpoint
interface ContractAutocompleteItem {
  id: number;
  code: string;
  customer_name: string;
}

interface ContractsJsonResponse {
  total_count: number;
  incomplete_results: boolean;
  items?: ContractAutocompleteItem[];
  data?: ContractAutocompleteItem[];
}

// Initialize repository
const contractRepository = new ContractRepository(prisma);

// Destructure contract defaults for easier use
const {
  URGENT_CHARGE: DEFAULT_URGENT_CHARGE,
  VERY_URGENT_CHARGE: DEFAULT_VERY_URGENT_CHARGE,
  DISCOUNT: DEFAULT_DISCOUNT,
} = CONTRACT_DEFAULTS;

// Helper interfaces for input parsing
interface RawServiceInput {
  service_id?: string | number;
  discount?: string | number;
  'pc-urgent'?: string | number;
  'pc-very-urgent'?: string | number;
}

interface RawPackageInput {
  package_id?: string | number;
  discount?: string | number;
  'pc-urgent'?: string | number;
  'pc-very-urgent'?: string | number;
}

/**
 * Parse service details from request body with safe number parsing
 */
function parseServiceDetails(services: RawServiceInput[] | undefined): ContractDetailDTO[] {
  if (!services || !Array.isArray(services)) return [];

  return services
    .filter(s => s.service_id)
    .map(s => ({
      serviceId: safeParseInt(s.service_id, 'service_id'),
      discountNormal: safeParseFloatOptional(s.discount, DEFAULT_DISCOUNT),
      discountUrgent: safeParseIntOptional(s['pc-urgent'], DEFAULT_URGENT_CHARGE),
      discountVeryUrgent: safeParseIntOptional(s['pc-very-urgent'], DEFAULT_VERY_URGENT_CHARGE),
    }));
}

/**
 * Parse package details from request body with safe number parsing
 */
function parsePackageDetails(packages: RawPackageInput[] | undefined): ContractDetailDTO[] {
  if (!packages || !Array.isArray(packages)) return [];

  return packages
    .filter(p => p.package_id)
    .map(p => ({
      packageId: safeParseInt(p.package_id, 'package_id'),
      discountNormal: safeParseFloatOptional(p.discount, DEFAULT_DISCOUNT),
      discountUrgent: safeParseIntOptional(p['pc-urgent'], DEFAULT_URGENT_CHARGE),
      discountVeryUrgent: safeParseIntOptional(p['pc-very-urgent'], DEFAULT_VERY_URGENT_CHARGE),
    }));
}

/**
 * Parse document value from various input formats (string, JSON string, array)
 * Includes depth limit protection and filename sanitization for security
 */
function parseDocumentValue(docValue: unknown, maxDepth = 3): string | null {
  if (!docValue) return null;

  let parsed: unknown = docValue;
  let depth = 0;

  // Handle string input with nested JSON parsing
  if (typeof parsed === 'string') {
    while (
      depth < maxDepth &&
      typeof parsed === 'string' &&
      (parsed.startsWith('[') || parsed.startsWith('"'))
    ) {
      try {
        const temp = JSON.parse(parsed);
        parsed = Array.isArray(temp) ? temp[0] : temp;
        depth++;
      } catch {
        break;
      }
    }
  }

  // Handle array input
  if (Array.isArray(parsed)) {
    parsed = parsed[0];
  }

  // Validate result is a string
  if (typeof parsed !== 'string') return null;

  // Sanitize filename - only allow safe characters
  const sanitized = parsed.replace(/[^a-zA-Z0-9._\-\s]/g, '').trim();

  // Validate length
  if (sanitized.length === 0 || sanitized.length > 255) return null;

  return sanitized;
}

/**
 * GET /api/contracts/generate-code - Generate next contract code
 */
export const getGenerateCode = async (_request: FastifyRequest, reply: FastifyReply) => {
  const result = await contractRepository.generateCode();

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('kode kontrak'));
  }

  return reply.send({
    success: true,
    data: { code: result.getValue() },
  });
};

/**
 * Helper function to parse date from d-m-Y or ISO format
 */
function parseDate(dateString: string | undefined): Date | null {
  if (!dateString) return null;

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T00:00:00');
  }

  // Try d-m-Y format (DD-MM-YYYY)
  const dmyMatch = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try other formats
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Helper function to format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Helper to convert status_service string to ContractStatus type
 */
function parseStatusService(value: string | undefined): ContractStatus {
  if (!value) return CONTRACT_STATUS.ALL;
  const lower = String(value).toLowerCase().trim();
  return lower === CONTRACT_STATUS.SELECTED ? CONTRACT_STATUS.SELECTED : CONTRACT_STATUS.ALL;
}

/**
 * GET /api/contracts - List contracts with search, pagination, and filters
 */
export const getContracts = async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as {
    limit?: string | number;
    offset?: string | number;
    search?: string;
    q?: string;
    period_to_start?: string;
    period_to_end?: string;
    customer_id?: string;
    priority?: string | number;
  };
  const limit = Math.min(parseQueryParam(query.limit, 20), 100);
  const offset = parseQueryParam(query.offset, 0);
  const search = sanitizeSearchQuery((query.search || query.q) as string | undefined);
  const user = request.user;

  // Parse date filters
  let periodToStart: Date | undefined;
  let periodToEnd: Date | undefined;

  if (query.period_to_start) {
    const parsed = parseDate(query.period_to_start as string);
    if (parsed) periodToStart = parsed;
  }

  if (query.period_to_end) {
    const parsed = parseDate(query.period_to_end as string);
    if (parsed) periodToEnd = parsed;
  }

  const result = await contractRepository.findAll({
    search,
    customerId: query.customer_id ? parseId(query.customer_id as string) || undefined : undefined,
    periodToStart,
    periodToEnd,
    priority: query.priority ? parseQueryParam(query.priority, 0) : undefined,
    offset,
    limit,
    userRole: user?.role_id,
    userCustomerId: user?.customer_id ?? undefined,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('kontrak'));
  }

  const { data, pagination } = result.getValue();

  const response: ApiResponse = {
    success: true,
    data,
    pagination,
  };

  return reply.send(response);
};

/**
 * GET /api/contracts/:id - Get contract detail by ID
 */
export const getContractById = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = parseId((request.params as { id: string }).id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await contractRepository.findById(id);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('kontrak'));
  }

  const contract = result.getValue();

  if (!contract) {
    throw new NotFoundError(RESOURCE_ERRORS.CONTRACT_NOT_FOUND);
  }

  return reply.send({
    success: true,
    data: contract,
  });
};

/**
 * GET /api/contracts/customer - Get customer's latest active contract
 */
export const getCustomerContract = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user;

  if (!user || !user.customer_id) {
    throw new AuthorizationError(AUTHORIZATION_ERRORS.CUSTOMER_ACCESS_DENIED);
  }

  const result = await contractRepository.findByCustomerId(user.customer_id);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('kontrak pelanggan'));
  }

  const contract = result.getValue();

  if (!contract) {
    throw new NotFoundError(RESOURCE_ERRORS.CONTRACT_NOT_FOUND);
  }

  return reply.send({
    success: true,
    data: contract,
  });
};

/**
 * POST /api/contracts - Create new contract
 */
export const createContract = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user;

  if (!user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const createdBy = user.id;

  const {
    customer_id,
    period,
    periode_from,
    periode_to,
    period_from,
    period_to,
    period_alias,
    normal_day,
    urgent_day,
    very_urgent_day,
    status_service,
    statusService: statusServiceCamel,
    discount,
    dsc_urgent,
    dsc_very_urgent,
    promotion_id,
    remarks,
    services,
    packages,
  } = request.body as {
    customer_id?: number;
    period?: string;
    periode_from?: string;
    periode_to?: string;
    period_from?: string;
    period_to?: string;
    period_alias?: string;
    normal_day?: number;
    urgent_day?: number;
    very_urgent_day?: number;
    status_service?: string;
    statusService?: string;
    discount?: number;
    dsc_urgent?: number;
    dsc_very_urgent?: number;
    promotion_id?: number;
    remarks?: string;
    services?: RawServiceInput[];
    packages?: RawPackageInput[];
    contract_document?: unknown;
  };

  // Validate required fields (code is auto-generated)
  if (!customer_id || !period) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('customer_id dan period'));
  }

  // Auto-generate contract code using repository
  const codeResult = await contractRepository.generateCode();
  if (codeResult.isFailure()) {
    throw new AppError(500, codeResult.error || RESOURCE_ERRORS.FETCH_FAILED('kode kontrak'));
  }
  const code = codeResult.getValue();

  // Parse dates (support both periode_from/to and period_from/to)
  const periodFrom = parseDate(periode_from || period_from);
  const periodTo = parseDate(periode_to || period_to);

  if (!periodFrom || !periodTo) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_DATE);
  }

  if (periodFrom > periodTo) {
    throw new ValidationError('period_from must be less than or equal to period_to');
  }

  // Validate required lead time fields
  if (!normal_day || !urgent_day || !very_urgent_day) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('normal_day, urgent_day, very_urgent_day'));
  }

  // Parse status_service (handle both snake_case and camelCase)
  const rawStatusService = status_service ?? statusServiceCamel;
  const statusService = parseStatusService(rawStatusService);

  // Note: Duplicate code check removed - database unique constraint on code field
  // handles this case. Prisma error P2002 will be caught by errorHandler middleware.

  // Check overlap
  const overlapResult = await contractRepository.checkOverlap(
    customer_id,
    periodFrom,
    periodTo
  );

  if (overlapResult.isFailure()) {
    throw new AppError(500, overlapResult.error || 'Failed to check contract overlap');
  }

  const overlapCheck = overlapResult.getValue();
  if (overlapCheck.hasOverlap && overlapCheck.overlappingContract) {
    const oc = overlapCheck.overlappingContract;
    throw new ConflictError(`Contract overlaps with contract ${oc.code} (${formatDate(oc.periodFrom)} - ${formatDate(oc.periodTo)})`);
  }

  // Handle documents - store only the filename, not JSON
  const documents = parseDocumentValue((request.body as { contract_document?: unknown }).contract_document);

  // Prepare service and package details
  const serviceDetails = statusService === CONTRACT_STATUS.SELECTED ? parseServiceDetails(services) : [];
  const packageDetails = statusService === CONTRACT_STATUS.SELECTED ? parsePackageDetails(packages) : [];

  // Create contract
  const result = await contractRepository.create(
    {
      code: code.trim(),
      customerId: customer_id,
      period,
      periodFrom,
      periodTo,
      periodAlias: period_alias || null,
      normalDay: normal_day,
      urgentDay: urgent_day,
      veryUrgentDay: very_urgent_day,
      statusService,
      discount: discount ?? DEFAULT_DISCOUNT,
      discountUrgent: dsc_urgent ?? DEFAULT_URGENT_CHARGE,
      discountVeryUrgent: dsc_very_urgent ?? DEFAULT_VERY_URGENT_CHARGE,
      promotionId: promotion_id || null,
      remarks: remarks || null,
      documents,
      createdBy,
    },
    serviceDetails,
    packageDetails
  );

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.CREATE_FAILED('kontrak'));
  }

  return reply.code(201).send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.CREATE_SUCCESS('Kontrak'),
  });
};

/**
 * PUT /api/contracts/:id - Update contract
 */
export const updateContract = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = parseId((request.params as { id: string }).id);
  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const user = request.user;

  if (!user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const updatedBy = user.id;

  // Get existing contract
  const existingResult = await contractRepository.findById(id);
  if (existingResult.isFailure()) {
    throw new AppError(500, existingResult.error || RESOURCE_ERRORS.FETCH_FAILED('kontrak'));
  }

  const existing = existingResult.getValue();
  if (!existing) {
    throw new NotFoundError(RESOURCE_ERRORS.CONTRACT_NOT_FOUND);
  }

  const {
    code,
    customer_id,
    period,
    periode_from,
    periode_to,
    period_from,
    period_to,
    period_alias,
    normal_day,
    urgent_day,
    very_urgent_day,
    status_service,
    statusService: statusServiceCamel,
    discount,
    dsc_urgent,
    dsc_very_urgent,
    promotion_id,
    remarks,
    services,
    packages,
  } = request.body as {
    code?: string;
    customer_id?: number;
    period?: string;
    periode_from?: string;
    periode_to?: string;
    period_from?: string;
    period_to?: string;
    period_alias?: string;
    normal_day?: number;
    urgent_day?: number;
    very_urgent_day?: number;
    status_service?: string;
    statusService?: string;
    discount?: number;
    dsc_urgent?: number;
    dsc_very_urgent?: number;
    promotion_id?: number;
    remarks?: string;
    services?: RawServiceInput[];
    packages?: RawPackageInput[];
    contract_document?: unknown;
  };

  // Validate unique code if changed
  if (code && code !== existing.code) {
    const codeCheckResult = await contractRepository.findByCode(code, id);
    if (codeCheckResult.isFailure()) {
      throw new AppError(500, codeCheckResult.error || RESOURCE_ERRORS.FETCH_FAILED('kode kontrak'));
    }

    if (codeCheckResult.getValue()) {
      throw new ConflictError(RESOURCE_ERRORS.CODE_EXISTS);
    }
  }

  // Parse dates if provided
  let periodFrom = existing.periodFrom;
  let periodTo = existing.periodTo;

  if (periode_from || period_from) {
    const parsed = parseDate(periode_from || period_from);
    if (parsed) periodFrom = parsed;
  }

  if (periode_to || period_to) {
    const parsed = parseDate(periode_to || period_to);
    if (parsed) periodTo = parsed;
  }

  if (periodFrom > periodTo) {
    throw new ValidationError('period_from must be less than or equal to period_to');
  }

  // Validate no overlap if dates or customer changed
  // Use getTime() for proper Date comparison (comparing timestamps, not object references)
  const customerId = customer_id ?? existing.customerId;
  const existingPeriodFrom = new Date(existing.periodFrom);
  const existingPeriodTo = new Date(existing.periodTo);
  const datesChanged = periodFrom.getTime() !== existingPeriodFrom.getTime() ||
                       periodTo.getTime() !== existingPeriodTo.getTime();
  if (datesChanged || customerId !== existing.customerId) {
    const overlapResult = await contractRepository.checkOverlap(customerId, periodFrom, periodTo, id);

    if (overlapResult.isFailure()) {
      throw new AppError(500, overlapResult.error || 'Failed to check contract overlap');
    }

    const overlapCheck = overlapResult.getValue();
    if (overlapCheck.hasOverlap && overlapCheck.overlappingContract) {
      const oc = overlapCheck.overlappingContract;
      throw new ConflictError(`Contract overlaps with contract ${oc.code} (${formatDate(oc.periodFrom)} - ${formatDate(oc.periodTo)})`);
    }
  }

  // Parse status_service (handle both snake_case and camelCase)
  const rawStatusService = status_service ?? statusServiceCamel;
  const statusService = rawStatusService
    ? parseStatusService(rawStatusService)
    : existing.statusService;

  // Handle documents - undefined means don't update, null clears the value
  const bodyWithDoc = request.body as { contract_document?: unknown };
  const documents = bodyWithDoc.contract_document === undefined
    ? undefined  // Don't update if not provided
    : parseDocumentValue(bodyWithDoc.contract_document);  // Returns null or sanitized string

  // Prepare service and package details
  const serviceDetails = parseServiceDetails(services);
  const packageDetails = parsePackageDetails(packages);

  // Update contract
  const result = await contractRepository.update(
    id,
    {
      code: code?.trim(),
      customerId: customer_id,
      period,
      periodFrom,
      periodTo,
      periodAlias: period_alias,
      normalDay: normal_day,
      urgentDay: urgent_day,
      veryUrgentDay: very_urgent_day,
      statusService,
      discount,
      discountUrgent: dsc_urgent,
      discountVeryUrgent: dsc_very_urgent,
      promotionId: promotion_id !== undefined ? (promotion_id || null) : undefined,
      remarks: remarks !== undefined ? (remarks || null) : undefined,
      documents,
      updatedBy,
    },
    serviceDetails.length > 0 ? serviceDetails : undefined,
    packageDetails.length > 0 ? packageDetails : undefined
  );

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.UPDATE_FAILED('kontrak'));
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.UPDATE_SUCCESS('Kontrak'),
  });
};

/**
 * DELETE /api/contracts/:id - Soft delete contract
 */
export const deleteContract = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = parseId((request.params as { id: string }).id);
  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const user = request.user;

  if (!user?.id) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const updatedBy = user.id;

  const result = await contractRepository.delete(id, updatedBy);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.CONTRACT_NOT_FOUND);
  }

  return reply.send({
    success: true,
    message: SUCCESS_MESSAGES.DELETE_SUCCESS('Kontrak'),
  });
};

/**
 * GET /api/contracts/json - Get contracts as JSON (for autocomplete/search)
 */
export const getContractsJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as { q?: string; dataTable?: string; pretty?: string };
  const searchQuery = sanitizeSearchQuery((query.q as string) || '');
  const useDataTable = query.dataTable === 'true' || query.dataTable === '1';
  const pretty = query.pretty === 'true' || query.pretty === '1';

  const result = await contractRepository.findForAutocomplete(searchQuery, useDataTable);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('kontrak'));
  }

  const items = result.getValue() as ContractAutocompleteItem[];

  const response: ContractsJsonResponse = {
    total_count: items.length,
    incomplete_results: false,
  };

  if (useDataTable) {
    response.data = items;
  } else {
    response.items = items;
  }

  if (pretty) {
    reply.header('Content-Type', 'application/json');
    return reply.send(JSON.stringify(response, null, 2));
  } else {
    return reply.send(response);
  }
};

/**
 * GET /api/contracts/fetch-json - Fetch contracts with advanced filters
 */
export const getContractsFetchJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as {
    per_page?: string | number;
    page?: string | number;
    periode_to_start?: string;
    periode_to_end?: string;
    customer_id?: string;
    priority?: string | number;
  };
  const perPage = Math.min(parseQueryParam(query.per_page, 20), 100);
  const page = parseQueryParam(query.page, 1);
  const offset = (page - 1) * perPage;
  const user = request.user;

  // Parse date filters
  let periodToStart: Date | undefined;
  let periodToEnd: Date | undefined;

  if (query.periode_to_start) {
    const parsed = parseDate(query.periode_to_start as string);
    if (parsed) periodToStart = parsed;
  }

  if (query.periode_to_end) {
    const parsed = parseDate(query.periode_to_end as string);
    if (parsed) periodToEnd = parsed;
  }

  const result = await contractRepository.findWithFilters({
    customerId: query.customer_id ? parseId(query.customer_id as string) || undefined : undefined,
    periodToStart,
    periodToEnd,
    priority: query.priority ? parseQueryParam(query.priority, 0) : undefined,
    offset,
    limit: perPage,
    userRole: user?.role_id,
    userCustomerId: user?.customer_id ?? undefined,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch contracts');
  }

  const { data, pagination } = result.getValue();

  return reply.send({
    total_count: pagination.total,
    items: data,
  });
};
