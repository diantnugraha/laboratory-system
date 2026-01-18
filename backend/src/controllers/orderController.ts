import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { OrderRepository } from '../repositories/implementations/OrderRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';
import { exportService, OrderExportData } from '../services/exportService.js';
import { pdfService } from '../services/pdfService.js';
import { safeParseDate, parseRequiredDate, parseOptionalDate } from '../utils/dateHelper.js';
import { ORDER_CONFIG } from '../config/order.js';
import {
  streamOrdersExport,
  formatCSVRow,
  ORDER_EXPORT_HEADERS,
} from '../services/streamingExportService.js';
import { savePaymentDocument, handleUploadError } from '../plugins/fileUpload.js';
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
  FILE_ERRORS,
} from '../constants/errorMessages.js';

// Initialize repository
const orderRepo = new OrderRepository(prisma);

/**
 * Parse and validate pagination parameters with bounds checking
 */
const parsePaginationParams = (query: FastifyRequest['query']): { page: number; limit: number } => {
  const queryObj = query as Record<string, unknown>;
  let page = parseQueryParam(queryObj.page, ORDER_CONFIG.DEFAULT_PAGE);
  let limit = parseQueryParam(queryObj.limit, ORDER_CONFIG.DEFAULT_LIMIT);

  // Validate bounds
  page = Math.max(ORDER_CONFIG.MIN_PAGE, Math.min(page, ORDER_CONFIG.MAX_PAGE));
  limit = Math.max(ORDER_CONFIG.MIN_LIMIT, Math.min(limit, ORDER_CONFIG.MAX_LIMIT));

  return { page, limit };
};

/**
 * GET /api/orders/generate-code - Get next auto-generated code
 */
export const getGeneratedCode = async (_request: FastifyRequest, reply: FastifyReply) => {
  const result = await orderRepo.generateCode();

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('kode order'));
  }

  return reply.send({ success: true, data: { code: result.getValue() } });
};

/**
 * GET /api/orders - List with search & pagination
 */
export const getAllOrders = async (request: FastifyRequest, reply: FastifyReply) => {
  const { page, limit } = parsePaginationParams(request.query);
  const queryObj = request.query as Record<string, unknown>;
  const search = typeof queryObj.search === 'string' ? queryObj.search : undefined;
  const customerId = queryObj.customer_id ? parseId(queryObj.customer_id as string) : undefined;
  const status = typeof queryObj.status === 'string' ? queryObj.status : undefined;
  const priority = typeof queryObj.priority === 'string' ? queryObj.priority : undefined;

  const result = await orderRepo.findAll({
    search,
    customerId: customerId || undefined,
    status,
    priority,
    page,
    limit,
    userRole: request.user?.role_id,
    userCustomerId: request.user?.customer_id ?? undefined,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('order'));
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
 * GET /api/orders/:id
 */
export const getOrderById = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await orderRepo.findById(id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/orders/json - For autocomplete/dropdown
 */
export const getOrdersJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const search = typeof queryObj.q === 'string' ? queryObj.q : undefined;
  const customerId = queryObj.customer_id ? parseId(queryObj.customer_id as string) : undefined;

  const result = await orderRepo.findForAutocomplete(search, customerId || undefined);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('order'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/orders
 */
export const createOrder = async (request: FastifyRequest, reply: FastifyReply) => {
  const {
    customer_id,
    contact_id,
    address_id,
    contract_id,
    pre_order_id,
    quotation_id,
    status,
    priority,
    order_date,
    due_date,
    sub_total,
    discount_percent,
    discount_value,
    vat_percent,
    vat_value,
    total,
    remarks,
    notes_internal,
    lab,
  } = request.body as Record<string, unknown>;

  // Generate code
  const codeResult = await orderRepo.generateCode();
  if (codeResult.isFailure()) {
    throw new AppError(500, codeResult.error || RESOURCE_ERRORS.FETCH_FAILED('kode order'));
  }

  const result = await orderRepo.create({
    code: codeResult.getValue(),
    customerId: customer_id as number,
    contactId: contact_id as number,
    addressId: address_id as number,
    contractId: contract_id as number | undefined,
    preOrderId: pre_order_id as number | undefined,
    quotationId: quotation_id as number | undefined,
    status: (status as string) || 'Created',
    priority: (priority as string) || 'Normal',
    orderDate: parseRequiredDate(order_date, 'order_date'),
    dueDate: safeParseDate(due_date),
    subTotal: sub_total as number,
    discountPercent: discount_percent as number,
    discountValue: discount_value as number,
    vatPercent: vat_percent as number,
    vatValue: vat_value as number,
    total: total as number,
    remarks: remarks as string | undefined,
    notesInternal: notes_internal as string | undefined,
    lab: lab as number,
    createdBy: request.user!.id,
  });

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.CREATE_FAILED('order'));
  }

  return reply.code(201).send({ success: true, data: result.getValue() });
};

/**
 * PUT /api/orders/:id
 */
export const updateOrder = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Check if order exists
  const existingResult = await orderRepo.findById(id);
  if (existingResult.isFailure()) {
    throw new NotFoundError(existingResult.error || RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  const {
    customer_id,
    contact_id,
    address_id,
    contract_id,
    pre_order_id,
    quotation_id,
    status,
    priority,
    order_date,
    due_date,
    complete_date,
    sub_total,
    discount_percent,
    discount_value,
    vat_percent,
    vat_value,
    total,
    remarks,
    notes_internal,
    lab,
  } = request.body as Record<string, unknown>;

  const result = await orderRepo.update(id, {
    customerId: customer_id as number | undefined,
    contactId: contact_id as number | undefined,
    addressId: address_id as number | undefined,
    contractId: contract_id as number | undefined,
    preOrderId: pre_order_id as number | undefined,
    quotationId: quotation_id as number | undefined,
    status: status as string | undefined,
    priority: priority as string | undefined,
    orderDate: parseOptionalDate(order_date) ?? undefined,
    dueDate: parseOptionalDate(due_date),
    completeDate: parseOptionalDate(complete_date),
    subTotal: sub_total as number | undefined,
    discountPercent: discount_percent as number | undefined,
    discountValue: discount_value as number | undefined,
    vatPercent: vat_percent as number | undefined,
    vatValue: vat_value as number | undefined,
    total: total as number | undefined,
    remarks: remarks as string | undefined,
    notesInternal: notes_internal as string | undefined,
    lab: lab as number | undefined,
    updatedBy: request.user!.id,
  });

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('order'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * PATCH /api/orders/:id/status - Update order status
 */
export const updateOrderStatus = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const { status } = request.body as { status: string };

  const result = await orderRepo.updateStatus(id, status, request.user!.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('status order'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * DELETE /api/orders/:id
 */
export const deleteOrder = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await orderRepo.delete(id, request.user!.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.DELETE_FAILED('order'));
  }

  return reply.send({ success: true, message: SUCCESS_MESSAGES.DELETE_SUCCESS('Order') });
};

/**
 * POST /api/orders/:id/review - Review order (approve/reject)
 */
export const reviewOrder = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const { status, reason } = request.body as { status: string; reason?: string };

  const result = await orderRepo.reviewOrder(id, {
    status,
    reviewerId: request.user!.id,
    reason,
  });

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('review order'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/orders/:id/upload-payment - Upload payment document
 */
export const uploadPaymentDocument = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Save file using Fastify multipart
  let fileResult;
  try {
    fileResult = await savePaymentDocument(request, 'payment_document');
  } catch (uploadError) {
    const { status, message } = handleUploadError(uploadError);
    throw new AppError(status, message);
  }

  // Get payment_date from fields if present (multipart form data)
  const data = await request.file();
  const payment_date = data?.fields?.payment_date;
  const paymentDateValue = typeof payment_date === 'object' && payment_date !== null && 'value' in payment_date
    ? (payment_date as { value: string }).value
    : undefined;

  const result = await orderRepo.uploadPayment(id, {
    paymentDocument: fileResult.filename,
    paymentDate: safeParseDate(paymentDateValue) ?? undefined,
    uploadedBy: request.user!.id,
  });

  if (result.isFailure()) {
    throw new BusinessError(result.error || FILE_ERRORS.UPLOAD_FAILED);
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/orders/:id/confirm-payment - Confirm payment by admin
 */
export const confirmPayment = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await orderRepo.confirmPayment(id, request.user!.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('konfirmasi pembayaran'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/orders/:id/revise - Create revision of order
 */
export const createRevision = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const { reason } = request.body as { reason?: string };

  const result = await orderRepo.createRevision(id, request.user!.id, reason);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.CREATE_FAILED('revisi'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/orders/:id/unlock - Unlock order for editing
 */
export const unlockOrder = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await orderRepo.unlockOrder(id, request.user!.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('unlock order'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/orders/stats - Get order statistics
 */
export const getOrderStats = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const type = queryObj.type as 'today' | 'month' | 'year';
  const invoiceDate = queryObj.invoice_date === 'true';

  const result = await orderRepo.getOrderStats(type, invoiceDate);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('statistik order'));
  }

  return reply.send({ success: true, data: { value: result.getValue() } });
};

/**
 * GET /api/orders/waiting-payment - Get orders waiting for payment
 */
export const getWaitingPaymentOrders = async (request: FastifyRequest, reply: FastifyReply) => {
  const { page, limit } = parsePaginationParams(request.query);
  const queryObj = request.query as Record<string, unknown>;
  const search = typeof queryObj.search === 'string' ? queryObj.search : undefined;
  const customerId = queryObj.customer_id ? parseId(queryObj.customer_id as string) : undefined;

  const result = await orderRepo.findWaitingPayment({
    search,
    customerId: customerId || undefined,
    page,
    limit,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('order menunggu pembayaran'));
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
 * GET /api/orders/outstanding-whitelist - Get outstanding whitelist orders
 */
export const getOutstandingWhitelistOrders = async (request: FastifyRequest, reply: FastifyReply) => {
  const { page, limit } = parsePaginationParams(request.query);
  const queryObj = request.query as Record<string, unknown>;
  const search = typeof queryObj.search === 'string' ? queryObj.search : undefined;
  const customerId = queryObj.customer_id ? parseId(queryObj.customer_id as string) : undefined;

  const result = await orderRepo.findOutstandingWhitelist({
    search,
    customerId: customerId || undefined,
    page,
    limit,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('order outstanding whitelist'));
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
 * GET /api/orders/invoices - Get invoice status for multiple orders
 */
export const getOrderInvoiceStatusBatch = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const orderIdsParam = queryObj.order_ids as string;

  if (!orderIdsParam) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('order_ids'));
  }

  const orderIds = orderIdsParam.split(',').map(Number).filter(id => !isNaN(id));
  if (orderIds.length === 0) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const result = await orderRepo.getInvoiceStatusBatch(orderIds);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('status invoice'));
  }

  // Convert Map to object for JSON response
  const data = Object.fromEntries(result.getValue());
  return reply.send({ success: true, data });
};

/**
 * GET /api/orders/export - Export orders to CSV (streaming)
 *
 * Uses streaming export for memory efficiency.
 * Can handle 100K+ records without memory issues.
 */
export const exportOrders = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const search = typeof queryObj.search === 'string' ? queryObj.search : undefined;
  const customerId = queryObj.customer_id ? parseId(queryObj.customer_id as string) : undefined;
  const status = typeof queryObj.status === 'string' ? queryObj.status : undefined;
  const dateFrom = safeParseDate(queryObj.date_from as string) ?? undefined;
  const dateTo = safeParseDate(queryObj.date_to as string) ?? undefined;

  // Check if streaming is requested (default: true for better performance)
  const useStreaming = queryObj.streaming !== 'false';

  if (useStreaming) {
    // Streaming export - memory efficient for large datasets
    const filter = {
      search,
      customerId: customerId || undefined,
      status,
      dateFrom,
      dateTo,
    };

    const filename = `orders_export_${new Date().toISOString().slice(0, 10)}.csv`;

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Transfer-Encoding', 'chunked');

    // Build the CSV content
    let csvContent = ORDER_EXPORT_HEADERS.join(',') + '\n';

    // Stream rows
    for await (const row of streamOrdersExport(prisma, filter)) {
      csvContent += formatCSVRow(row) + '\n';
    }

    return reply.send(csvContent);
  } else {
    // Legacy export using exportService (for backward compatibility)
    const result = await orderRepo.findAll({
      search,
      customerId: customerId || undefined,
      status,
      dateFrom,
      dateTo,
      page: 1,
      limit: ORDER_CONFIG.MAX_EXPORT_LIMIT,
    });

    if (result.isFailure()) {
      throw new AppError(500, result.error || FILE_ERRORS.EXPORT_FAILED);
    }

    const orders = result.getValue().data;

    // Map to export format
    const exportData: OrderExportData[] = orders.map(order => ({
      code: order.code,
      orderDate: order.orderDate.toISOString(),
      customerCode: order.customer.code,
      customerName: order.customer.customer_name,
      contactName: `${order.contact.first_name} ${order.contact.surname}`,
      status: order.status,
      priority: order.priority,
      subTotal: order.subTotal,
      discountValue: order.discountValue,
      vatValue: order.vatValue,
      total: order.total,
      lab: order.lab === 1 ? 'Lab 1' : order.lab === 2 ? 'Lab 2' : 'All',
      remarks: order.remarks || '',
      createdAt: order.createdAt.toISOString(),
    }));

    const csv = exportService.exportOrders(exportData);
    const filename = exportService.generateFileName('orders_export');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(csv);
  }
};

/**
 * GET /api/orders/:id/download - Download order document as PDF
 */
export const downloadOrderDocument = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const queryObj = request.query as Record<string, unknown>;
  const docType = (queryObj.type as string) || 'sppc';

  // Fetch order and samples in parallel for better performance
  const [result, samples] = await Promise.all([
    orderRepo.findById(id),
    prisma.sample.findMany({
      where: { order_id: id, trash: null },
      include: {
        standart: true,
      },
    }),
  ]);

  if (result.isFailure()) {
    throw new NotFoundError(RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  const order = result.getValue();
  if (!order) {
    throw new NotFoundError(RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  // Fetch worksheets (services) for each sample
  const sampleIds = samples.map(s => s.id);
  const worksheets = await prisma.worksheet.findMany({
    where: {
      sample_id: { in: sampleIds },
      trash: null,
    },
    include: {
      service: {
        include: {
          parameter: true,
          method: {
            include: {
              matrix: true,
            },
          },
        },
      },
    },
  });

  // Group worksheets by sample_id for easier access
  const worksheetsBySample = worksheets.reduce((acc, ws) => {
    if (!acc[ws.sample_id]) acc[ws.sample_id] = [];
    acc[ws.sample_id].push(ws);
    return acc;
  }, {} as Record<number, typeof worksheets>);

  let pdfBuffer: Buffer;
  let filename: string;

  // Helper to safely get contact full name
  const contactName = order.contact
    ? `${order.contact.first_name} ${order.contact.surname}`
    : '';

  switch (docType) {
    case 'sppc':
      pdfBuffer = await pdfService.generateSPPC({
        orderCode: order.code,
        orderDate: order.orderDate.toISOString(),
        customerName: order.customer?.customer_name ?? '',
        contactName,
        address: order.address?.address ?? '',
        phone: order.contact?.phone ?? '',
        email: order.contact?.email ?? '',
        samples: samples.map(sample => {
          const sampleWorksheets = worksheetsBySample[sample.id] ?? [];
          // Get matrix from first worksheet's method if available
          const firstMatrix = sampleWorksheets[0]?.service?.method?.matrix?.name ?? '';
          return {
            code: sample.code,
            name: sample.name,
            matrix: firstMatrix,
            parameters: sampleWorksheets
              .filter(ws => ws.service?.parameter && ws.service?.method)
              .map(ws => ({
                name: ws.service.parameter.name,
                method: ws.service.method.name,
                price: sample.price ?? 0,
              })),
          };
        }),
        subTotal: order.subTotal,
        discountPercent: order.discountPercent,
        discountValue: order.discountValue,
        vatPercent: order.vatPercent,
        vatValue: order.vatValue,
        total: order.total,
        remarks: order.remarks ?? undefined,
      });
      filename = `SPPC_${order.code}.pdf`;
      break;

    case 'quotation':
      pdfBuffer = await pdfService.generateQuotation({
        quotationCode: order.code,
        quotationDate: order.orderDate.toISOString(),
        validUntil: new Date(order.orderDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        customerName: order.customer?.customer_name ?? '',
        contactName,
        address: order.address?.address ?? '',
        phone: order.contact?.phone ?? '',
        email: order.contact?.email ?? '',
        services: samples.flatMap((sample, sIdx) => {
          const sampleWorksheets = worksheetsBySample[sample.id] ?? [];
          return sampleWorksheets
            .filter(ws => ws.service?.parameter)
            .map((ws, wsIdx) => ({
              no: sIdx * 100 + wsIdx + 1,
              description: `${sample.name} - ${ws.service.parameter.name}`,
              quantity: 1,
              unit: 'Test',
              unitPrice: sample.price ?? 0,
              total: sample.price ?? 0,
            }));
        }),
        subTotal: order.subTotal,
        discountPercent: order.discountPercent,
        discountValue: order.discountValue,
        vatPercent: order.vatPercent,
        vatValue: order.vatValue,
        total: order.total,
        remarks: order.remarks ?? undefined,
      });
      filename = `Quotation_${order.code}.pdf`;
      break;

    default:
      throw new ValidationError('Invalid document type');
  }

  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  return reply.send(pdfBuffer);
};
