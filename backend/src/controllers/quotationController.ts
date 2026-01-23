import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { QuotationRepository } from '../repositories/implementations/QuotationRepository.js';
import {
  QuotationFilter,
  SampleInput,
  ProductInput,
  ServiceDetailInput,
  PackageDetailInput,
} from '../repositories/contracts/IQuotationRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';
import { parseDateFlexible } from '../utils/dateHelper.js';
import { QUOTATION_CONFIG, ENVIRONMENTAL_LAB_USER_IDS, LAB_TYPE } from '../config/quotation.js';
import {
  AppError,
  ValidationError,
  NotFoundError,
  BusinessError,
} from '../errors/AppError.js';
import {
  VALIDATION_ERRORS,
  RESOURCE_ERRORS,
  SUCCESS_MESSAGES,
} from '../constants/errorMessages.js';
import { quotationPdfService, QuotationPdfData } from '../services/quotationPdfService.js';

// Initialize repository
const quotationRepo = new QuotationRepository(prisma);

/**
 * Parse and validate pagination parameters with bounds checking
 */
const parsePaginationParams = (query: FastifyRequest['query']): { page: number; limit: number } => {
  const queryObj = query as Record<string, string | string[] | undefined>;
  let page = parseQueryParam(queryObj.page, QUOTATION_CONFIG.DEFAULT_PAGE);
  let limit = parseQueryParam(queryObj.limit || queryObj.per_page, QUOTATION_CONFIG.DEFAULT_LIMIT);

  // Validate bounds
  page = Math.max(QUOTATION_CONFIG.MIN_PAGE, Math.min(page, QUOTATION_CONFIG.MAX_PAGE));
  limit = Math.max(QUOTATION_CONFIG.MIN_LIMIT, Math.min(limit, QUOTATION_CONFIG.MAX_LIMIT));

  return { page, limit };
};

// Use centralized date parsing from dateHelper.ts (parseDateFlexible)

/**
 * Parse sampling request value to string
 */
function parseSamplingRequest(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 1 || value === '1' || value === 'true') return '1';
  return null;
}

/**
 * Determine lab type based on user
 */
function determineLabType(userId: number, requestedLab?: string): string {
  // Check if user is in environmental lab list
  if (ENVIRONMENTAL_LAB_USER_IDS.includes(userId)) {
    return LAB_TYPE.ENVIRONMENTAL;
  }
  // Use requested lab if provided, otherwise default to standard
  return requestedLab || LAB_TYPE.STANDARD;
}

/**
 * Parse samples from request body
 */
function parseSamples(samplesInput: unknown): SampleInput[] | undefined {
  if (!samplesInput || !Array.isArray(samplesInput)) return undefined;

  return samplesInput.map((sample: any) => {
    const services: ServiceDetailInput[] = [];
    const packages: PackageDetailInput[] = [];

    // Parse services
    if (sample.services && Array.isArray(sample.services)) {
      for (const svc of sample.services) {
        if (svc.id) {
          services.push({
            serviceId: parseInt(svc.id, 10),
            quantity: parseInt(svc.quantity || '1', 10),
            discount: parseFloat(svc.discount || '0'),
            idDetail: svc.id_detail ? parseInt(svc.id_detail, 10) : undefined,
            order: svc.order !== undefined ? parseInt(svc.order, 10) : undefined,
          });
        }
      }
    }

    // Parse packages
    if (sample.packages && Array.isArray(sample.packages)) {
      for (const pkg of sample.packages) {
        if (pkg.id) {
          packages.push({
            packageId: parseInt(pkg.id, 10),
            quantity: parseInt(pkg.quantity || '1', 10),
            discount: parseFloat(pkg.discount || '0'),
            idDetail: pkg.id_detail,
            order: pkg.order !== undefined ? parseInt(pkg.order, 10) : undefined,
          });
        }
      }
    }

    return {
      name: sample.name || '',
      quantity: parseInt(sample.quantity || '1', 10),
      priority: sample.priority || 'normal',
      services: services.length > 0 ? services : undefined,
      packages: packages.length > 0 ? packages : undefined,
    };
  });
}

/**
 * Parse products from request body
 */
function parseProducts(productsInput: unknown): ProductInput[] | undefined {
  if (!productsInput || !Array.isArray(productsInput)) return undefined;

  return productsInput.map((product: any) => ({
    name: product.name || '',
    quantity: parseInt(product.quantity || '1', 10),
    price: parseFloat(product.price || '0'),
    discount: parseFloat(product.discount || '0'),
    idDetail: product.id_detail ? parseInt(product.id_detail, 10) : undefined,
  }));
}

// ===== Controller Functions =====

/**
 * GET /api/quotations/generate-code - Get next auto-generated code
 */
export const getGeneratedCode = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const lab = typeof queryObj.lab === 'string' ? queryObj.lab : undefined;

  // Determine lab type based on user
  const labType = determineLabType(request.user!.id, lab);

  const result = await quotationRepo.generateCode(labType);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('quotation code'));
  }

  return reply.send({ success: true, data: { code: result.getValue() } });
};

/**
 * GET /api/quotations - List with search & pagination
 */
export const getAllQuotations = async (request: FastifyRequest, reply: FastifyReply) => {
  const { page, limit } = parsePaginationParams(request.query);
  const queryObj = request.query as Record<string, unknown>;
  const search = typeof queryObj.search === 'string' ? queryObj.search : undefined;
  const qCode = typeof queryObj.q_code === 'string' ? queryObj.q_code : undefined;
  const customerId = queryObj.customer_id ? parseId(queryObj.customer_id as string) : undefined;
  const lab = typeof queryObj.lab === 'string' ? queryObj.lab : undefined;

  const result = await quotationRepo.findAll({
    search,
    qCode,
    customerId: customerId || undefined,
    lab,
    page,
    limit,
    userRole: request.user?.role_id,
    userCustomerId: request.user?.customer_id ?? undefined,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('quotation'));
  }

  const data = result.getValue();

  // Transform data to camelCase format for frontend
  const transformedData = data.data.map((item: any) => {
    // Calculate expired date if not present (quo_date + 1 month)
    let expiredDate = item.expired_date;
    if (!expiredDate && item.quo_date) {
      const quoDate = new Date(item.quo_date);
      quoDate.setMonth(quoDate.getMonth() + 1);
      expiredDate = quoDate.toISOString();
    }

    return {
      id: item.id,
      code: item.code,
      quoStatus: item.quo_status,
      quoDate: item.quo_date,
      expiredDate,
      samplingRequest: item.sampling_request,
      samplingDate: item.sampling_date,
      subTotal: item.sub_total,
      total: item.total,
      percentVat: item.percent_vat,
      percentPc: item.percent_pc,
      priority: item.priority,
      lab: item.lab,
      customer: item.customer ? {
        id: item.customer.id,
        name: item.customer.customer_name,
        code: item.customer.code,
      } : null,
      contact: item.contact ? {
        id: item.contact.id,
        name: [item.contact.first_name, item.contact.middle_name, item.contact.surname].filter(Boolean).join(' '),
      } : null,
      createdBy: item.created_by ? {
        id: item.created_by,
        name: '',
      } : null,
    };
  });

  const response: ApiResponse = {
    success: true,
    data: transformedData,
    pagination: data.pagination,
  };

  return reply.send(response);
};

/**
 * GET /api/quotations/:id
 */
export const getQuotationById = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await quotationRepo.findById(id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/quotations/json - For autocomplete/dropdown (matches actionJson)
 */
export const getQuotationsJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const search = typeof queryObj.q === 'string' ? queryObj.q : undefined;
  const customerId = queryObj.customer_id ? parseId(queryObj.customer_id as string) : undefined;
  const isDataTable = !!queryObj.dataTable;

  const result = await quotationRepo.findForAutocomplete(search, customerId || undefined, isDataTable);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('quotation'));
  }

  const items = result.getValue();

  // Format response based on dataTable flag
  const response = {
    total_count: items.length,
    incomplete_results: false,
    [isDataTable ? 'data' : 'items']: items,
  };

  return reply.send(response);
};

/**
 * GET /api/quotations/fetch-json - Standard lab quotations (matches actionFetchJson)
 */
export const getFetchJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const { page, limit } = parsePaginationParams(request.query);

  const filter: QuotationFilter = {
    qCode: typeof queryObj.q_code === 'string' ? queryObj.q_code : undefined,
    customerId: queryObj.customer_id ? parseId(queryObj.customer_id as string) || undefined : undefined,
    status: typeof queryObj.search_status === 'string' ? queryObj.search_status : undefined,
    salesId: queryObj.search_sales ? parseId(queryObj.search_sales as string) || undefined : undefined,
    dateStart: queryObj.date_start ? parseDateFlexible(queryObj.date_start as string) || undefined : undefined,
    dateEnd: queryObj.date_end ? parseDateFlexible(queryObj.date_end as string) || undefined : undefined,
    sortSubtotal:
      typeof queryObj.sort_subtotal === 'string'
        ? (queryObj.sort_subtotal.toUpperCase() as 'ASC' | 'DESC')
        : undefined,
    page,
    limit,
    lab: LAB_TYPE.STANDARD,
  };

  const result = await quotationRepo.findForFetchJson(filter);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('quotation'));
  }

  const data = result.getValue();

  return reply.send({
    total_count: data.totalCount,
    stats: data.stats,
    items: data.items,
  });
};

/**
 * GET /api/quotations/fetch-json-env - Environmental lab quotations (matches actionFetchJsonEnv)
 */
export const getFetchJsonEnv = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const { page, limit } = parsePaginationParams(request.query);

  const filter: QuotationFilter = {
    qCode: typeof queryObj.q_code === 'string' ? queryObj.q_code : undefined,
    customerId: queryObj.customer_id ? parseId(queryObj.customer_id as string) || undefined : undefined,
    status: typeof queryObj.search_status === 'string' ? queryObj.search_status : undefined,
    dateStart: queryObj.date_start ? parseDateFlexible(queryObj.date_start as string) || undefined : undefined,
    dateEnd: queryObj.date_end ? parseDateFlexible(queryObj.date_end as string) || undefined : undefined,
    page,
    limit,
    lab: LAB_TYPE.ENVIRONMENTAL,
  };

  const result = await quotationRepo.findForFetchJsonEnv(filter);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('quotation'));
  }

  const data = result.getValue();

  return reply.send({
    total_count: data.totalCount,
    items: data.items,
  });
};

/**
 * GET /api/quotations/report - CSV report export
 */
export const getReport = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;

  const startDate = queryObj.start ? parseDateFlexible(queryObj.start as string) : undefined;
  const endDate = queryObj.end ? parseDateFlexible(queryObj.end as string) : undefined;
  const includeTrash = queryObj.trash === 'true' || queryObj.trash === '1';

  const result = await quotationRepo.getReportData(startDate || undefined, endDate || undefined, includeTrash);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('report'));
  }

  const rows = result.getValue();

  // Generate CSV
  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', 'attachment; filename=report-quotation.csv');

  let csv = 'CODE, CUSTOMER NAME, CONTACT PERSON, STATUS, ORDER STATUS, DATE, CREATED BY, SUB TOTAL, TOTAL\r\n';

  for (const row of rows) {
    csv += `"${row.quotationCode}","${row.customerName}","${row.contactName}","${row.status}","${row.orderStatus || ''}","${row.quotationDate}","${row.creator}","${row.subTotal}","${row.total}"\r\n`;
  }

  return reply.send(csv);
};

/**
 * GET /api/quotations/duplicate/:id - Get quotation data for duplication
 */
export const getDuplicateData = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await quotationRepo.getForDuplication(id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  const data = result.getValue();
  if (!data) {
    throw new NotFoundError(RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  return reply.send({
    success: true,
    data: {
      quotation: data.quotation,
      sampleArray: data.sampleArray,
    },
  });
};

/**
 * POST /api/quotations
 */
export const createQuotation = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as Record<string, unknown>;
  const userId = request.user!.id;

  // Parse date fields
  const quoDate = parseDateFlexible(body.quo_date as string);
  if (!quoDate) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_DATE);
  }

  const samplingRequest = parseSamplingRequest(body.sampling_request);
  const samplingDate = samplingRequest ? parseDateFlexible(body.sampling_date as string) : null;

  // Determine lab type
  const labType = determineLabType(userId, body.lab as string | undefined);

  // Generate code
  const codeResult = await quotationRepo.generateCode(labType);
  if (codeResult.isFailure()) {
    throw new AppError(500, codeResult.error || RESOURCE_ERRORS.FETCH_FAILED('quotation code'));
  }

  // Parse samples and products
  const samples = parseSamples(body.samples);
  const products = parseProducts(body.products);

  // Validate at least one sample or product
  const hasSamples = samples && samples.length > 0;
  const hasProducts = products && products.length > 0;
  if (!hasSamples && !hasProducts) {
    throw new ValidationError('Sample cannot be empty. At least one sample or product is required.');
  }

  // Calculate total
  let subTotal = parseFloat(String(body.sub_total || '0'));
  let total = subTotal;
  if (total < QUOTATION_CONFIG.MIN_TOTAL) {
    total = QUOTATION_CONFIG.MIN_TOTAL;
  }

  const result = await quotationRepo.create({
    code: codeResult.getValue(),
    quoStatus: (body.quo_status as string) || 'Created',
    quoDate,
    samplingRequest,
    samplingDate,
    customerId: parseInt(String(body.customer_id), 10),
    contactId: parseInt(String(body.contact_id), 10),
    addressId: parseInt(String(body.address_id), 10),
    volume: (body.volume as string) || null,
    remarks: (body.remarks as string) || null,
    minVolumeSample: (body.min_volume_sample as string) || '',
    subTotal,
    percentDiscount: parseFloat(String(body.percent_discount || '0')),
    percentVat: parseFloat(String(body.percent_vat || QUOTATION_CONFIG.DEFAULT_VAT_PERCENT)),
    percentPc: body.percent_pc ? parseFloat(String(body.percent_pc)) : null,
    priceGroup: body.price_group ? parseInt(String(body.price_group), 10) : null,
    priority: (body.priority as string) || 'normal',
    total,
    lab: labType,
    createdBy: userId,
    samples,
    products,
  });

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.CREATE_FAILED('quotation'));
  }

  return reply.code(201).send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.CREATE_SUCCESS('Quotation'),
  });
};

/**
 * PUT /api/quotations/:id
 */
export const updateQuotation = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Check if quotation exists and not trashed
  const existingResult = await quotationRepo.findById(id);
  if (existingResult.isFailure()) {
    throw new NotFoundError(existingResult.error || RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  const body = request.body as Record<string, unknown>;
  const userId = request.user!.id;

  // Parse date fields
  const quoDate = body.quo_date ? parseDateFlexible(body.quo_date as string) : undefined;
  const samplingRequest = body.sampling_request !== undefined ? parseSamplingRequest(body.sampling_request) : undefined;
  const samplingDate =
    body.sampling_date !== undefined ? (samplingRequest ? parseDateFlexible(body.sampling_date as string) : null) : undefined;

  // Parse samples and products
  const samples = body.samples !== undefined ? parseSamples(body.samples) : undefined;
  const products = body.products !== undefined ? parseProducts(body.products) : undefined;

  // Calculate total if sub_total provided
  let total: number | undefined;
  if (body.sub_total !== undefined) {
    const subTotal = parseFloat(String(body.sub_total));
    total = subTotal < QUOTATION_CONFIG.MIN_TOTAL ? QUOTATION_CONFIG.MIN_TOTAL : subTotal;
  }

  const result = await quotationRepo.update(id, {
    quoStatus: body.quo_status as string | undefined,
    quoDate: quoDate || undefined,
    samplingRequest,
    samplingDate,
    customerId: body.customer_id ? parseInt(String(body.customer_id), 10) : undefined,
    contactId: body.contact_id ? parseInt(String(body.contact_id), 10) : undefined,
    addressId: body.address_id ? parseInt(String(body.address_id), 10) : undefined,
    volume: body.volume as string | undefined,
    remarks: body.remarks as string | undefined,
    minVolumeSample: body.min_volume_sample as string | undefined,
    subTotal: body.sub_total ? parseFloat(String(body.sub_total)) : undefined,
    percentDiscount: body.percent_discount ? parseFloat(String(body.percent_discount)) : undefined,
    percentVat: body.percent_vat ? parseFloat(String(body.percent_vat)) : undefined,
    percentPc: body.percent_pc ? parseFloat(String(body.percent_pc)) : undefined,
    priceGroup: body.price_group ? parseInt(String(body.price_group), 10) : undefined,
    priority: body.priority as string | undefined,
    total,
    lab: body.lab as string | undefined,
    updatedBy: userId,
    samples,
    products,
  });

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('quotation'));
  }

  return reply.send({
    success: true,
    data: result.getValue(),
    message: SUCCESS_MESSAGES.UPDATE_SUCCESS('Quotation'),
  });
};

/**
 * DELETE /api/quotations/:id
 */
export const deleteQuotation = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Check if quotation exists
  const existingResult = await quotationRepo.findById(id);
  if (existingResult.isFailure()) {
    throw new NotFoundError(existingResult.error || RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  const result = await quotationRepo.delete(id, request.user!.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.DELETE_FAILED('quotation'));
  }

  return reply.send({
    success: true,
    message: SUCCESS_MESSAGES.DELETE_SUCCESS('Quotation'),
  });
};

/**
 * GET /api/quotations/:id/details - Get quotation details
 */
export const getQuotationDetails = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await quotationRepo.getDetails(id);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('quotation details'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/quotations/:id/linked-order - Check if quotation has linked order
 */
export const checkLinkedOrder = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await quotationRepo.hasLinkedOrder(id);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('linked order'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/quotations/:id/linked-preorder - Check if quotation has linked pre-order
 */
export const checkLinkedPreOrder = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await quotationRepo.hasLinkedPreOrder(id);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('linked pre-order'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/quotations/customer-portal - Quotations for customer portal (QuotationTestController equivalent)
 */
export const getCustomerPortalQuotations = async (request: FastifyRequest, reply: FastifyReply) => {
  const { page, limit } = parsePaginationParams(request.query);
  const queryObj = request.query as Record<string, unknown>;

  // Get user's customer ID and departments
  const userCustomerId = request.user?.customer_id;
  const userDepartment = request.user?.department;

  if (!userCustomerId) {
    throw new ValidationError('Customer ID is required for portal access');
  }

  // Parse departments
  const userDepartments = userDepartment ? userDepartment.split(';;').filter(Boolean) : undefined;

  const filter: QuotationFilter = {
    qCode: typeof queryObj.q_code === 'string' ? queryObj.q_code : undefined,
    customerId: userCustomerId,
    page,
    limit,
    userRole: request.user?.role_id,
    userCustomerId,
    userDepartments,
  };

  const result = await quotationRepo.findForCustomerPortal(filter, userDepartments);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('quotation'));
  }

  const data = result.getValue();

  return reply.send({
    total_count: data.pagination.total,
    items: data.data,
  });
};

/**
 * GET /api/quotations/:id/preview-pdf - Preview quotation as PDF
 */
export const previewQuotationPdf = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Get quotation data with relations
  const quotationResult = await quotationRepo.findById(id);
  if (quotationResult.isFailure()) {
    throw new NotFoundError(quotationResult.error || RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  const quotation = quotationResult.getValue();
  if (!quotation) {
    throw new NotFoundError(RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  // Get quotation details
  const detailsResult = await quotationRepo.getDetails(id);
  if (detailsResult.isFailure()) {
    throw new AppError(500, detailsResult.error || RESOURCE_ERRORS.FETCH_FAILED('quotation details'));
  }

  const details = detailsResult.getValue();

  // Get creator info - use snake_case as Prisma returns raw data
  const quotationRaw = quotation as any;
  const creatorId = quotationRaw.created_by || quotation.createdBy;
  const creator = creatorId
    ? await prisma.users.findUnique({
        where: { id: creatorId },
        select: { display_name: true },
      })
    : null;

  // Group details by sample
  const sampleMap = new Map<number, {
    name: string;
    priority: string;
    quantity: number;
    services: Array<{
      service?: any;
      package?: any;
      quantity: number;
      discount: number;
      price: number;
      isProduct?: boolean;
    }>;
  }>();

  const products: Array<{ name: string; price: number; quantity: number; discount: number }> = [];

  for (const detail of details) {
    // Check if it's a product (additional charge)
    if (detail.product === 1) {
      products.push({
        name: detail.sampleName,
        price: detail.price || 0,
        quantity: detail.quantity,
        discount: detail.percentDiscount,
      });
      continue;
    }

    const sampleIndex = detail.indexSample || 0;

    if (!sampleMap.has(sampleIndex)) {
      sampleMap.set(sampleIndex, {
        name: detail.sampleName,
        priority: detail.priority,
        quantity: 1, // Sample quantity is always 1 for quotations (detail.quantity is service quantity, not sample quantity)
        services: [],
      });
    }

    const sample = sampleMap.get(sampleIndex)!;

    // Skip duplicate package entries (keep only first one per package)
    if (detail.packageId) {
      const existingPackage = sample.services.find(
        s => s.package && s.package.id === detail.packageId
      );
      if (existingPackage) continue;
    }

    sample.services.push({
      service: detail.service,
      package: detail.package,
      quantity: detail.quantity,
      discount: detail.percentDiscount,
      price: detail.price || (detail.service?.price || 0),
    });
  }

  // Calculate expired date (quo_date + 1 month)
  const expiredDate = new Date(quotation.quoDate);
  expiredDate.setMonth(expiredDate.getMonth() + 1);

  // Get values directly from database - NO CALCULATION, just reference!
  // Use quotationRaw for snake_case fields from Prisma
  const percentVat = quotationRaw.percent_vat ?? quotation.percentVat ?? 11;
  const percentDiscount = quotationRaw.percent_discount ?? quotation.percentDiscount ?? 0;

  // Get priority rate from quotation priority
  const getPriorityRate = (priority: string | null): number => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 50;
      case 'very urgent': case 'very-urgent': return 100;
      default: return 0;
    }
  };
  const priorityRate = getPriorityRate(quotationRaw.priority ?? quotation.priority);

  // Get stored values from database (sub_total is the base total before discount)
  const storedSubTotal = quotationRaw.sub_total ?? quotation.subTotal ?? 0;
  const storedTotal = quotationRaw.total ?? quotation.total ?? 0;

  // Calculate derived values based on stored sub_total (same formula as frontend display)
  const discountAmount = Math.round(storedSubTotal * (percentDiscount / 100));
  const afterDiscount = storedSubTotal - discountAmount;
  const priorityCharge = Math.round(afterDiscount * (priorityRate / 100));
  const afterPc = afterDiscount + priorityCharge;
  const vat = Math.round(afterPc * (percentVat / 100));
  const grandTotal = afterPc + vat;

  // Prepare PDF data - use snake_case as Prisma returns raw data
  const pdfData: QuotationPdfData = {
    id: quotation.id,
    code: quotation.code,
    quo_date: quotation.quoDate,
    created_at: quotation.createdAt,
    expired_date: expiredDate,
    priority: quotation.priority || 'normal',
    lab: quotationRaw.lab || quotation.lab,
    percent_vat: quotationRaw.percent_vat ?? quotation.percentVat,
    percent_discount: quotationRaw.percent_discount ?? quotation.percentDiscount,
    remarks: quotation.remarks,
    customer: {
      id: quotation.customer?.id || 0,
      customer_name: quotation.customer?.customer_name || '',
      top: quotation.customer?.top,
    },
    contact: {
      first_name: quotation.contact?.first_name || '',
      middle_name: quotation.contact?.middle_name,
      surname: quotation.contact?.surname || '',
      phone: quotation.contact?.phone,
      email: quotation.contact?.email,
    },
    address: {
      address: quotation.address?.address || '',
      city: quotation.address?.city,
      state: quotation.address?.state,
      country: quotation.address?.country,
    },
    creator: {
      first_name: creator?.display_name || '',
      middle_name: null,
      surname: '',
    },
    samples: Array.from(sampleMap.values()),
    products,
    totals: {
      total: storedSubTotal,       // Subtotal from database (sebelum quotation-level discount)
      discount: discountAmount,    // Quotation-level discount
      priorityCharge: priorityCharge,
      subTotal: afterPc,           // After discount + priority charge
      vat: vat,
      grandTotal: grandTotal,
    },
  };

  // Check query param for html preview (debugging)
  const query = request.query as Record<string, unknown>;
  if (query.format === 'html') {
    const html = await quotationPdfService.generateHtmlPreview(pdfData);
    return reply.type('text/html').send(html);
  }

  // Generate PDF
  const pdfBuffer = await quotationPdfService.generatePdf(pdfData);

  // Set response headers
  return reply
    .type('application/pdf')
    .header('Content-Disposition', `inline; filename="Quotation-${quotation.code}.pdf"`)
    .send(pdfBuffer);
};
