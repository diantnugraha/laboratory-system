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
import { ApiResponse } from '../types/index.js';
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
import { quotationCalculationService } from '../services/quotationCalculationService.js';
import type {
  IdParam,
  GenerateCodeQuery,
  QuotationQuery,
  QuotationJsonQuery,
  FetchJsonQuery,
  FetchJsonEnvQuery,
  ReportQuery,
  PdfPreviewQuery,
  CreateQuotationBody,
  UpdateQuotationBody,
  SampleInput as SampleInputSchema,
  ProductInput as ProductInputSchema,
} from '../schemas/quotation.js';

// Initialize repository
const quotationRepo = new QuotationRepository(prisma);

/**
 * Parse pagination parameters with bounds checking
 */
function parsePaginationParams(query: QuotationQuery | FetchJsonQuery | FetchJsonEnvQuery): { page: number; limit: number } {
  const page = Math.max(
    QUOTATION_CONFIG.MIN_PAGE,
    Math.min(query.page ?? QUOTATION_CONFIG.DEFAULT_PAGE, QUOTATION_CONFIG.MAX_PAGE)
  );
  const limit = Math.max(
    QUOTATION_CONFIG.MIN_LIMIT,
    Math.min(query.limit ?? query.per_page ?? QUOTATION_CONFIG.DEFAULT_LIMIT, QUOTATION_CONFIG.MAX_LIMIT)
  );
  return { page, limit };
}

/**
 * Parse sampling request value to string
 */
function parseSamplingRequest(value: boolean | string | number | undefined): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 1 || value === '1' || value === 'true') return '1';
  return null;
}

/**
 * Determine lab type based on user
 */
function determineLabType(userId: number, requestedLab?: string): string {
  if (ENVIRONMENTAL_LAB_USER_IDS.includes(userId)) {
    return LAB_TYPE.ENVIRONMENTAL;
  }
  return requestedLab || LAB_TYPE.STANDARD;
}

/**
 * Parse samples from request body
 */
function parseSamples(samplesInput: SampleInputSchema[] | undefined): SampleInput[] | undefined {
  if (!samplesInput || samplesInput.length === 0) return undefined;

  return samplesInput.map(sample => {
    const services: ServiceDetailInput[] = [];
    const packages: PackageDetailInput[] = [];

    if (sample.services) {
      for (const svc of sample.services) {
        services.push({
          serviceId: svc.id,
          quantity: typeof svc.quantity === 'string' ? parseInt(svc.quantity, 10) : (svc.quantity ?? 1),
          discount: typeof svc.discount === 'string' ? parseFloat(svc.discount) : (svc.discount ?? 0),
          idDetail: svc.id_detail,
          order: svc.order,
        });
      }
    }

    if (sample.packages) {
      for (const pkg of sample.packages) {
        packages.push({
          packageId: pkg.id,
          quantity: typeof pkg.quantity === 'string' ? parseInt(pkg.quantity, 10) : (pkg.quantity ?? 1),
          discount: typeof pkg.discount === 'string' ? parseFloat(pkg.discount) : (pkg.discount ?? 0),
          idDetail: pkg.id_detail,
          order: pkg.order,
        });
      }
    }

    return {
      name: sample.name || '',
      quantity: typeof sample.quantity === 'string' ? parseInt(sample.quantity, 10) : (sample.quantity ?? 1),
      priority: sample.priority || 'normal',
      services: services.length > 0 ? services : undefined,
      packages: packages.length > 0 ? packages : undefined,
    };
  });
}

/**
 * Parse products from request body
 */
function parseProducts(productsInput: ProductInputSchema[] | undefined): ProductInput[] | undefined {
  if (!productsInput || productsInput.length === 0) return undefined;

  return productsInput.map(product => ({
    name: product.name || '',
    quantity: typeof product.quantity === 'string' ? parseInt(product.quantity, 10) : (product.quantity ?? 1),
    price: typeof product.price === 'string' ? parseFloat(product.price) : (product.price ?? 0),
    discount: typeof product.discount === 'string' ? parseFloat(product.discount) : (product.discount ?? 0),
    idDetail: product.id_detail,
  }));
}

// ===== Controller Functions =====

/**
 * GET /api/quotations/generate-code - Get next auto-generated code
 */
export async function getGeneratedCode(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as GenerateCodeQuery;
  const labType = determineLabType(request.user!.id, query.lab);

  const result = await quotationRepo.generateCode(labType);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('quotation code'));
  }

  return reply.send({ success: true, data: { code: result.getValue() } });
}

/**
 * GET /api/quotations - List with search & pagination
 */
export async function getAllQuotations(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as QuotationQuery;
  const { page, limit } = parsePaginationParams(query);

  const result = await quotationRepo.findAll({
    search: query.search,
    qCode: query.q_code,
    customerId: query.customer_id,
    lab: query.lab,
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
  const transformedData = data.data.map(item => {
    let expiredDate = item.expiredDate;
    if (!expiredDate && item.quoDate) {
      const quoDate = new Date(item.quoDate);
      quoDate.setMonth(quoDate.getMonth() + 1);
      expiredDate = quoDate;
    }

    return {
      id: item.id,
      code: item.code,
      quoStatus: item.quoStatus,
      quoDate: item.quoDate,
      expiredDate,
      samplingRequest: item.samplingRequest,
      samplingDate: item.samplingDate,
      subTotal: item.subTotal,
      total: item.total,
      percentVat: item.percentVat,
      percentPc: item.percentPc,
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
      createdBy: item.createdBy ? {
        id: item.createdBy,
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
}

/**
 * GET /api/quotations/:id
 */
export async function getQuotationById(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as IdParam;

  const result = await quotationRepo.findById(params.id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  return reply.send({ success: true, data: result.getValue() });
}

/**
 * GET /api/quotations/json - For autocomplete/dropdown
 */
export async function getQuotationsJson(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as QuotationJsonQuery;
  const isDataTable = !!query.dataTable;

  const result = await quotationRepo.findForAutocomplete(query.q, query.customer_id, isDataTable);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('quotation'));
  }

  const items = result.getValue();

  const response = {
    total_count: items.length,
    incomplete_results: false,
    [isDataTable ? 'data' : 'items']: items,
  };

  return reply.send(response);
}

/**
 * GET /api/quotations/fetch-json - Standard lab quotations
 */
export async function getFetchJson(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as FetchJsonQuery;
  const { page, limit } = parsePaginationParams(query);

  const filter: QuotationFilter = {
    qCode: query.q_code,
    customerId: query.customer_id,
    status: query.search_status,
    salesId: query.search_sales,
    dateStart: query.date_start ? parseDateFlexible(query.date_start) || undefined : undefined,
    dateEnd: query.date_end ? parseDateFlexible(query.date_end) || undefined : undefined,
    sortSubtotal: query.sort_subtotal ? query.sort_subtotal.toUpperCase() as 'ASC' | 'DESC' : undefined,
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
}

/**
 * GET /api/quotations/fetch-json-env - Environmental lab quotations
 */
export async function getFetchJsonEnv(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as FetchJsonEnvQuery;
  const { page, limit } = parsePaginationParams(query);

  const filter: QuotationFilter = {
    qCode: query.q_code,
    customerId: query.customer_id,
    status: query.search_status,
    dateStart: query.date_start ? parseDateFlexible(query.date_start) || undefined : undefined,
    dateEnd: query.date_end ? parseDateFlexible(query.date_end) || undefined : undefined,
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
}

/**
 * GET /api/quotations/report - CSV report export
 */
export async function getReport(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as ReportQuery;

  const startDate = query.start ? parseDateFlexible(query.start) : undefined;
  const endDate = query.end ? parseDateFlexible(query.end) : undefined;
  const includeTrash = query.trash === 'true' || query.trash === '1';

  const result = await quotationRepo.getReportData(startDate || undefined, endDate || undefined, includeTrash);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('report'));
  }

  const rows = result.getValue();

  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', 'attachment; filename=report-quotation.csv');

  let csv = 'CODE, CUSTOMER NAME, CONTACT PERSON, STATUS, ORDER STATUS, DATE, CREATED BY, SUB TOTAL, TOTAL\r\n';

  for (const row of rows) {
    csv += `"${row.quotationCode}","${row.customerName}","${row.contactName}","${row.status}","${row.orderStatus || ''}","${row.quotationDate}","${row.creator}","${row.subTotal}","${row.total}"\r\n`;
  }

  return reply.send(csv);
}

/**
 * GET /api/quotations/duplicate/:id - Get quotation data for duplication
 */
export async function getDuplicateData(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as IdParam;

  const result = await quotationRepo.getForDuplication(params.id);

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
}

/**
 * POST /api/quotations
 */
export async function createQuotation(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CreateQuotationBody;
  const userId = request.user!.id;

  const quoDate = parseDateFlexible(body.quo_date);
  if (!quoDate) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_DATE);
  }

  const samplingRequest = parseSamplingRequest(body.sampling_request);
  const samplingDate = samplingRequest && body.sampling_date ? parseDateFlexible(body.sampling_date) : null;

  const labType = determineLabType(userId, body.lab);

  const codeResult = await quotationRepo.generateCode(labType);
  if (codeResult.isFailure()) {
    throw new AppError(500, codeResult.error || RESOURCE_ERRORS.FETCH_FAILED('quotation code'));
  }

  const samples = parseSamples(body.samples);
  const products = parseProducts(body.products);

  const hasSamples = samples && samples.length > 0;
  const hasProducts = products && products.length > 0;
  if (!hasSamples && !hasProducts) {
    throw new ValidationError('Sample cannot be empty. At least one sample or product is required.');
  }

  let subTotal = body.sub_total ?? 0;
  let total = subTotal;
  if (total < QUOTATION_CONFIG.MIN_TOTAL) {
    total = QUOTATION_CONFIG.MIN_TOTAL;
  }

  const result = await quotationRepo.create({
    code: codeResult.getValue(),
    quoStatus: body.quo_status || 'Created',
    quoDate,
    samplingRequest,
    samplingDate,
    customerId: body.customer_id,
    contactId: body.contact_id,
    addressId: body.address_id,
    volume: body.volume || null,
    remarks: body.remarks || null,
    minVolumeSample: body.min_volume_sample || '',
    subTotal,
    percentDiscount: body.percent_discount ?? 0,
    percentVat: body.percent_vat ?? QUOTATION_CONFIG.DEFAULT_VAT_PERCENT,
    percentPc: body.percent_pc ?? null,
    priceGroup: body.price_group ?? null,
    priority: body.priority || 'normal',
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
}

/**
 * PUT /api/quotations/:id
 */
export async function updateQuotation(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as IdParam;
  const body = request.body as UpdateQuotationBody;
  const userId = request.user!.id;

  const existingResult = await quotationRepo.findById(params.id);
  if (existingResult.isFailure()) {
    throw new NotFoundError(existingResult.error || RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  const quoDate = body.quo_date ? parseDateFlexible(body.quo_date) : undefined;
  const samplingRequest = body.sampling_request !== undefined ? parseSamplingRequest(body.sampling_request) : undefined;
  const samplingDate = body.sampling_date !== undefined
    ? (samplingRequest ? parseDateFlexible(body.sampling_date ?? '') : null)
    : undefined;

  const samples = body.samples !== undefined ? parseSamples(body.samples) : undefined;
  const products = body.products !== undefined ? parseProducts(body.products) : undefined;

  let total: number | undefined;
  if (body.sub_total !== undefined) {
    total = body.sub_total < QUOTATION_CONFIG.MIN_TOTAL ? QUOTATION_CONFIG.MIN_TOTAL : body.sub_total;
  }

  const result = await quotationRepo.update(params.id, {
    quoStatus: body.quo_status,
    quoDate: quoDate || undefined,
    samplingRequest,
    samplingDate,
    customerId: body.customer_id,
    contactId: body.contact_id,
    addressId: body.address_id,
    volume: body.volume,
    remarks: body.remarks,
    minVolumeSample: body.min_volume_sample,
    subTotal: body.sub_total,
    percentDiscount: body.percent_discount,
    percentVat: body.percent_vat,
    percentPc: body.percent_pc,
    priceGroup: body.price_group,
    priority: body.priority,
    total,
    lab: body.lab,
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
}

/**
 * DELETE /api/quotations/:id
 */
export async function deleteQuotation(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as IdParam;

  const existingResult = await quotationRepo.findById(params.id);
  if (existingResult.isFailure()) {
    throw new NotFoundError(existingResult.error || RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  const result = await quotationRepo.delete(params.id, request.user!.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.DELETE_FAILED('quotation'));
  }

  return reply.send({
    success: true,
    message: SUCCESS_MESSAGES.DELETE_SUCCESS('Quotation'),
  });
}

/**
 * GET /api/quotations/:id/details - Get quotation details
 */
export async function getQuotationDetails(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as IdParam;

  const result = await quotationRepo.getDetails(params.id);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('quotation details'));
  }

  return reply.send({ success: true, data: result.getValue() });
}

/**
 * GET /api/quotations/:id/linked-order - Check if quotation has linked order
 */
export async function checkLinkedOrder(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as IdParam;

  const result = await quotationRepo.hasLinkedOrder(params.id);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('linked order'));
  }

  return reply.send({ success: true, data: result.getValue() });
}

/**
 * GET /api/quotations/:id/linked-preorder - Check if quotation has linked pre-order
 */
export async function checkLinkedPreOrder(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as IdParam;

  const result = await quotationRepo.hasLinkedPreOrder(params.id);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('linked pre-order'));
  }

  return reply.send({ success: true, data: result.getValue() });
}

/**
 * GET /api/quotations/customer-portal - Quotations for customer portal
 */
export async function getCustomerPortalQuotations(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as QuotationQuery;
  const { page, limit } = parsePaginationParams(query);

  const userCustomerId = request.user?.customer_id;
  const userDepartment = request.user?.department;

  if (!userCustomerId) {
    throw new ValidationError('Customer ID is required for portal access');
  }

  const userDepartments = userDepartment ? userDepartment.split(';;').filter(Boolean) : undefined;

  const filter: QuotationFilter = {
    qCode: query.q_code,
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
}

/**
 * GET /api/quotations/:id/preview-pdf - Preview quotation as PDF
 */
export async function previewQuotationPdf(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as IdParam;
  const query = request.query as PdfPreviewQuery;

  const quotationResult = await quotationRepo.findById(params.id);
  if (quotationResult.isFailure()) {
    throw new NotFoundError(quotationResult.error || RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  const quotation = quotationResult.getValue();
  if (!quotation) {
    throw new NotFoundError(RESOURCE_ERRORS.NOT_FOUND('Quotation'));
  }

  const detailsResult = await quotationRepo.getDetails(params.id);
  if (detailsResult.isFailure()) {
    throw new AppError(500, detailsResult.error || RESOURCE_ERRORS.FETCH_FAILED('quotation details'));
  }

  const details = detailsResult.getValue();

  // Get creator display name via repository
  let creatorName: string | null = null;
  if (quotation.createdBy) {
    const creatorResult = await quotationRepo.getUserDisplayName(quotation.createdBy);
    if (creatorResult.isSuccess()) {
      creatorName = creatorResult.getValue();
    }
  }

  // Group details by sample
  const sampleMap = new Map<number, {
    name: string;
    priority: string;
    quantity: number;
    services: Array<{
      service?: {
        id: number;
        name: string;
        price: number;
        parameter?: { id: number; name: string };
        method?: { id: number; name: string };
      };
      package?: {
        id: number;
        name: string;
        totalPrice: number | null;
        services?: Array<{
          id: number;
          name: string;
          price: number;
          parameter?: { id: number; name: string };
          method?: { id: number; name: string };
        }>;
      };
      quantity: number;
      discount: number;
      price: number;
      isProduct?: boolean;
    }>;
  }>();

  const products: Array<{ name: string; price: number; quantity: number; discount: number }> = [];

  for (const detail of details) {
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
        quantity: 1,
        services: [],
      });
    }

    const sample = sampleMap.get(sampleIndex)!;

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

  const expiredDate = new Date(quotation.quoDate);
  expiredDate.setMonth(expiredDate.getMonth() + 1);

  const percentVat = quotation.percentVat ?? 11;
  const percentDiscount = quotation.percentDiscount ?? 0;
  const storedSubTotal = quotation.subTotal ?? 0;

  // Use shared calculation service for consistent totals
  const calculatedTotals = quotationCalculationService.calculateFromStoredTotal({
    storedSubTotal,
    quotationDiscountPercent: percentDiscount,
    priority: quotation.priority,
    vatPercent: percentVat,
  });

  const pdfData: QuotationPdfData = {
    id: quotation.id,
    code: quotation.code,
    quo_date: quotation.quoDate,
    created_at: quotation.createdAt,
    expired_date: expiredDate,
    priority: quotation.priority || 'normal',
    lab: quotation.lab,
    percent_vat: quotation.percentVat,
    percent_discount: quotation.percentDiscount,
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
      first_name: creatorName || '',
      middle_name: null,
      surname: '',
    },
    samples: Array.from(sampleMap.values()),
    products,
    totals: {
      total: storedSubTotal,
      discount: calculatedTotals.quotationDiscountTotal,
      priorityCharge: calculatedTotals.priorityChargeTotal,
      subTotal: calculatedTotals.subTotal,
      vat: calculatedTotals.vatTotal,
      grandTotal: calculatedTotals.grandTotal,
    },
  };

  if (query.format === 'html') {
    const html = await quotationPdfService.generateHtmlPreview(pdfData);
    return reply.type('text/html').send(html);
  }

  const pdfBuffer = await quotationPdfService.generatePdf(pdfData);

  return reply
    .type('application/pdf')
    .header('Content-Disposition', `inline; filename="Quotation-${quotation.code}.pdf"`)
    .send(pdfBuffer);
}