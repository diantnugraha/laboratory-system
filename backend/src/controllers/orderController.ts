import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { OrderRepository } from '../repositories/implementations/OrderRepository.js';
import { OrderStatus, OrderPriority, OrderWithRelations } from '../repositories/contracts/IOrderRepository.js';
import { ApiResponse } from '../types/index.js';
import {
  exportService,
  OrderExportData,
  CTSExportData,
  NonCTSExportData,
  CalibrationExportData,
  ActiveCustomerExportData,
  ReportExportData,
} from '../services/exportService.js';
import { pdfService } from '../services/pdfService.js';
import { emailService } from '../services/emailService.js';
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
import type { IdParam } from '../validators/common.js';
import type {
  OrderQuery,
  CreateOrderBody,
  UpdateOrderBody,
  UpdateOrderStatusBody,
  ReviewOrderBody,
  CreateRevisionBody,
  OrderStatsQuery,
} from '../validators/order.js';

// Initialize repository
const orderRepo = new OrderRepository(prisma);

/**
 * Clamp pagination values to configured bounds
 */
const clampPagination = (page: number, limit: number): { page: number; limit: number } => ({
  page: Math.max(ORDER_CONFIG.MIN_PAGE, Math.min(page, ORDER_CONFIG.MAX_PAGE)),
  limit: Math.max(ORDER_CONFIG.MIN_LIMIT, Math.min(limit, ORDER_CONFIG.MAX_LIMIT)),
});

/**
 * Build enhanced role-based filter parameters from user context
 * Used for department-based and agency-based filtering
 */
const buildRoleBasedFilters = (user: FastifyRequest['user']) => {
  if (!user) {
    return {};
  }

  // Cast to extended user type that may have additional properties
  const extendedUser = user as typeof user & {
    departments?: string[];
    list_customer?: number[];
    list_contact?: number[];
  };

  // Parse user departments if available (from contact.department or user.departments)
  let userDepartments: string[] | undefined;
  if (extendedUser.departments && Array.isArray(extendedUser.departments)) {
    userDepartments = extendedUser.departments;
  } else if (user.department && typeof user.department === 'string') {
    userDepartments = [user.department];
  }

  // Parse agency customer/contact lists if available
  let agencyCustomerIds: number[] | undefined;
  let agencyContactIds: number[] | undefined;
  if (extendedUser.list_customer && Array.isArray(extendedUser.list_customer)) {
    agencyCustomerIds = extendedUser.list_customer;
  }
  if (extendedUser.list_contact && Array.isArray(extendedUser.list_contact)) {
    agencyContactIds = extendedUser.list_contact;
  }

  return {
    userRole: user.role_id,
    userCustomerId: user.customer_id ?? undefined,
    userContactId: user.contact_id ?? undefined,
    userDepartments,
    agencyCustomerIds,
    agencyContactIds,
  };
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
export const getAllOrders = async (
  request: FastifyRequest<{ Querystring: OrderQuery }>,
  reply: FastifyReply
) => {
  const { search, customer_id, status, priority, page = ORDER_CONFIG.DEFAULT_PAGE, limit = ORDER_CONFIG.DEFAULT_LIMIT } = request.query;
  const { page: clampedPage, limit: clampedLimit } = clampPagination(page, limit);

  const result = await orderRepo.findAll({
    search,
    customerId: customer_id,
    status,
    priority,
    page: clampedPage,
    limit: clampedLimit,
    ...buildRoleBasedFilters(request.user),
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
export const getOrderById = async (
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

  const result = await orderRepo.findById(id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  const order = result.getValue();
  if (!order) {
    throw new NotFoundError(RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  // Transform samples and worksheets to match frontend expected format
  const transformedData = {
    ...order,
    orderStatus: order.order_status,
    orderPriority: order.order_priority,
    orderDate: order.order_date,
    receivedDate: order.received_date,
    reviewedAt: order.reviewed_at,
    submitedBy: order.submited_by,
    customerId: order.customer_id,
    contactId: order.contact_id,
    addressId: order.address_id,
    quotationId: order.quotation_id,
    preOrderId: order.pre_order_id,
    invoiceId: order.invoice_id,
    priceGroup: order.price_group,
    subTotal: order.sub_total,
    percentDiscount: order.percent_discount,
    percentVat: order.percent_vat,
    paymentDocument: order.payment_document,
    paymentDate: order.payment_date,
    paymentConfirmationDate: order.payment_confirmation_date,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    createdBy: order.created_by,
    updatedBy: order.updated_by,
    coveringLetter: order.covering_letter,
    testingParameters: order.testing_parameters,
    address: order.address ? {
      id: order.address.id,
      address: order.address.address,
      city: order.address.city,
      province: order.address.state,
      postal_code: null,
    } : null,
    samples: order.samples?.map((sample: any) => ({
      id: sample.id,
      code: sample.code,
      name: sample.name,
      description: sample.description,
      volume: sample.volume,
      sampleStorage: sample.sample_storage,
      quantity: sample.quantity,
      priority: sample.priority,
      standardId: sample.standart_id,
      standardName: sample.standart?.name || null,
      receivedDate: sample.received_date,
      dueDate: sample.due_date,
      price: sample.price,
      discount: sample.discount,
      sampleStatus: sample.sample_status || 'Process',
      coaReleasedDate: sample.coa_released_date,
      worksheets: sample.worksheet?.map((ws: any) => ({
        id: ws.id,
        code: ws.code || null,
        status: ws.status || null,
        serviceId: ws.service_id,
        serviceName: ws.service?.parameter?.name || '',
        serviceCode: ws.code,
        parameter: ws.service?.parameter?.name || '',
        method: ws.service?.method?.name || '',
        price: ws.price ? Number(ws.price) : (sample.price || 0),
        discount: ws.discount || 0,
        total: ws.price ? Number(ws.price) * (1 - (ws.discount || 0) / 100) : (sample.price || 0) * (1 - (ws.discount || 0) / 100),
        packageId: ws.package_id,
        packageName: ws.package?.name || null,
      })) || [],
    })) || [],
  };

  return reply.send({ success: true, data: transformedData });
};

/** Query type for JSON autocomplete endpoint */
interface OrderJsonQuery {
  q?: string;
  customer_id?: number;
}

/**
 * GET /api/orders/json - For autocomplete/dropdown
 */
export const getOrdersJson = async (
  request: FastifyRequest<{ Querystring: OrderJsonQuery }>,
  reply: FastifyReply
) => {
  const { q: search, customer_id: customerId } = request.query;

  const result = await orderRepo.findForAutocomplete(search, customerId);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('order'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/orders/single-json/:id - Get lightweight single order for dropdown selection
 */
export const getSingleOrderJson = async (
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

  // TODO: Move to repository method findLightweight(id)
  const order = await prisma.order.findFirst({
    where: { id, trash: null },
    select: {
      id: true,
      code: true,
      order_status: true,
      order_priority: true,
      order_date: true,
      total: true,
      customer: {
        select: {
          id: true,
          customer_name: true,
        },
      },
      contact: {
        select: {
          id: true,
          first_name: true,
          surname: true,
        },
      },
    },
  });

  if (!order) {
    throw new NotFoundError(RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  return reply.send({ success: true, data: order });
};

/**
 * POST /api/orders
 */
export const createOrder = async (
  request: FastifyRequest<{ Body: CreateOrderBody }>,
  reply: FastifyReply
) => {
  const body = request.body;

  // TODO: Move contact/address validation to repository
  // Validate that contact belongs to the customer
  const contact = await prisma.contact.findFirst({
    where: {
      id: body.contact_id,
      customer_id: body.customer_id,
      trash: null,
    },
  });

  if (!contact) {
    throw new ValidationError('Contact does not belong to the selected customer');
  }

  // Validate that address belongs to the customer (if provided)
  if (body.address_id) {
    const address = await prisma.address.findFirst({
      where: {
        id: body.address_id,
        customer_id: body.customer_id,
        trash: null,
      },
    });

    if (!address) {
      throw new ValidationError('Address does not belong to the selected customer');
    }
  }

  // Generate code
  const codeResult = await orderRepo.generateCode();
  if (codeResult.isFailure()) {
    throw new AppError(500, codeResult.error || RESOURCE_ERRORS.FETCH_FAILED('kode order'));
  }

  // Transform samples to DTO format
  const samplesData = body.samples.map((sample) => ({
    name: sample.name,
    description: sample.description ?? null,
    quantity: sample.quantity ?? 1,
    volume: sample.volume ?? null,
    sampleStorage: sample.sample_storage ?? null,
    packagingType: sample.packaging_type ?? null,
    standardId: sample.standard_id ?? null,
    dueDate: sample.due_date ? safeParseDate(sample.due_date) : null,
    priority: sample.priority ?? OrderPriority.NORMAL,
    leadTime: sample.lead_time ?? 'Normal',
    price: sample.price ?? null,
    discount: sample.discount ?? null,
    services: sample.services.map((svc) => ({
      serviceId: svc.service_id,
      packageId: svc.package_id ?? null,
      discount: svc.discount ?? 0,
      price: svc.price ?? 0,
    })),
  }));

  const result = await orderRepo.create({
    code: codeResult.getValue(),
    customerId: body.customer_id,
    contactId: body.contact_id,
    addressId: body.address_id ?? null,
    contractId: body.contract_id ?? undefined,
    preOrderId: body.pre_order_id ?? undefined,
    quotationId: body.quotation_id ?? undefined,
    status: body.status ?? OrderStatus.CREATED,
    priority: body.priority ?? OrderPriority.NORMAL,
    orderDate: parseRequiredDate(body.order_date, 'order_date'),
    dueDate: safeParseDate(body.due_date),
    subTotal: body.sub_total,
    discountPercent: body.discount_percent,
    discountValue: body.discount_value,
    vatPercent: body.vat_percent,
    vatValue: body.vat_value,
    total: body.total,
    remarks: body.remarks ?? undefined,
    notesInternal: body.notes_internal ?? undefined,
    lab: body.lab,
    createdBy: request.user!.id,
    samples: samplesData,
  });

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.CREATE_FAILED('order'));
  }

  return reply.code(201).send({ success: true, data: result.getValue() });
};

/**
 * PUT /api/orders/:id
 */
export const updateOrder = async (
  request: FastifyRequest<{ Params: IdParam; Body: UpdateOrderBody }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  const body = request.body;

  // Check if order exists
  const existingResult = await orderRepo.findById(id);
  if (existingResult.isFailure()) {
    throw new NotFoundError(existingResult.error || RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  const result = await orderRepo.update(id, {
    customerId: body.customer_id,
    contactId: body.contact_id,
    addressId: body.address_id,
    contractId: body.contract_id ?? undefined,
    preOrderId: body.pre_order_id ?? undefined,
    quotationId: body.quotation_id ?? undefined,
    status: body.status,
    priority: body.priority,
    orderDate: parseOptionalDate(body.order_date) ?? undefined,
    dueDate: parseOptionalDate(body.due_date),
    completeDate: parseOptionalDate(body.complete_date),
    subTotal: body.sub_total,
    discountPercent: body.discount_percent,
    discountValue: body.discount_value,
    vatPercent: body.vat_percent,
    vatValue: body.vat_value,
    total: body.total,
    remarks: body.remarks ?? undefined,
    notesInternal: body.notes_internal ?? undefined,
    lab: body.lab,
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
export const updateOrderStatus = async (
  request: FastifyRequest<{ Params: IdParam; Body: UpdateOrderStatusBody }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  const { status } = request.body;

  const result = await orderRepo.updateStatus(id, status, request.user!.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('status order'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * DELETE /api/orders/:id
 */
export const deleteOrder = async (
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

  const result = await orderRepo.delete(id, request.user!.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.DELETE_FAILED('order'));
  }

  return reply.send({ success: true, message: SUCCESS_MESSAGES.DELETE_SUCCESS('Order') });
};

/**
 * POST /api/orders/:id/review - Review order (approve/reject)
 */
export const reviewOrder = async (
  request: FastifyRequest<{ Params: IdParam; Body: ReviewOrderBody }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  const { status, reason } = request.body;

  const result = await orderRepo.reviewOrder(id, {
    status,
    reviewerId: request.user!.id,
    reason,
  });

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('review order'));
  }

  const order = result.getValue();

  // Send email notification to customer contact
  if (order.contact?.email) {
    const contactName = `${order.contact.first_name} ${order.contact.surname}`;
    emailService.sendOrderReviewedNotification(
      order.contact.email,
      contactName,
      order.code,
      order.customer?.customer_name ?? '',
      status,
      reason
    ).catch(err => {
      // Log but don't fail the request if email fails
      request.log.error({ err, orderId: id }, 'Failed to send review notification email');
    });
  }

  return reply.send({ success: true, data: order });
};

/**
 * POST /api/orders/:id/upload-payment - Upload payment document
 */
export const uploadPaymentDocument = async (
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

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

  const order = result.getValue();

  // TODO: Move admin email lookup to repository
  // Send notification to admin users about payment upload (roles 1=SuperAdmin, 2=Admin)
  const admins = await prisma.users.findMany({
    where: {
      role_id: { in: [1, 2] },
      trash: { equals: null },
    },
    select: { email: true },
  });

  const adminEmails = admins
    .map(a => a.email)
    .filter((e): e is string => e !== null && e !== '');

  if (adminEmails.length > 0) {
    const contactName = order.contact
      ? `${order.contact.first_name} ${order.contact.surname}`
      : '';

    emailService.sendPaymentUploadNotification(
      adminEmails,
      order.code,
      order.customer?.customer_name ?? '',
      contactName,
      paymentDateValue
    ).catch(err => {
      request.log.error({ err, orderId: id }, 'Failed to send payment upload notification email');
    });
  }

  return reply.send({ success: true, data: order });
};

/**
 * POST /api/orders/:id/confirm-payment - Confirm payment by admin
 */
export const confirmPayment = async (
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

  const result = await orderRepo.confirmPayment(id, request.user!.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('konfirmasi pembayaran'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/** Body type for resend email endpoint */
interface ResendEmailBody {
  email_type?: 'review' | 'status' | 'payment';
}

/**
 * POST /api/orders/:id/resend-email - Resend order notification email
 */
export const resendOrderEmail = async (
  request: FastifyRequest<{ Params: IdParam; Body: ResendEmailBody }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  const { email_type } = request.body;

  const result = await orderRepo.findById(id);

  if (result.isFailure()) {
    throw new NotFoundError(result.error || RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  const order = result.getValue();
  if (!order) {
    throw new NotFoundError(RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  // Check if contact has email
  if (!order.contact?.email) {
    throw new BusinessError('Contact does not have an email address');
  }

  const contactName = `${order.contact.first_name} ${order.contact.surname}`;
  const customerName = order.customer?.customer_name ?? '';

  try {
    switch (email_type) {
      case 'review': {
        // Resend review notification (status depends on current order status)
        const reviewStatus = order.status === OrderStatus.REVIEWED
          ? OrderStatus.REVIEWED
          : OrderStatus.TO_BE_VERIFIED;
        await emailService.sendOrderReviewedNotification(
          order.contact.email,
          contactName,
          order.code,
          customerName,
          reviewStatus as 'Reviewed' | 'To Be Verified' | 'Cancelled'
        );
        break;
      }

      case 'status':
        // Resend current status notification
        await emailService.sendStatusChangeNotification(
          order.contact.email,
          contactName,
          order.code,
          customerName,
          order.status,
          order.status
        );
        break;

      case 'payment':
        // Resend payment confirmation (requires payment to be confirmed)
        if (!order.paymentConfirmationDate) {
          throw new BusinessError('Payment has not been confirmed for this order');
        }
        await emailService.sendStatusChangeNotification(
          order.contact.email,
          contactName,
          order.code,
          customerName,
          OrderStatus.PAYMENT_CONFIRMATION,
          OrderStatus.UNDER_PROCESS
        );
        break;

      default:
        // Default: resend based on current status
        await emailService.sendStatusChangeNotification(
          order.contact.email,
          contactName,
          order.code,
          customerName,
          order.status,
          order.status
        );
    }

    return reply.send({
      success: true,
      message: `Email notification resent to ${order.contact.email}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new AppError(500, `Failed to resend email: ${errorMessage}`);
  }
};

/**
 * POST /api/orders/:id/revise - Create revision of order
 */
export const createRevision = async (
  request: FastifyRequest<{ Params: IdParam; Body: CreateRevisionBody }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  const { reason } = request.body;

  const result = await orderRepo.createRevision(id, request.user!.id, reason);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.CREATE_FAILED('revisi'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/orders/:id/unlock - Unlock order for editing
 */
export const unlockOrder = async (
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) => {
  const { id } = request.params;

  const result = await orderRepo.unlockOrder(id, request.user!.id);

  if (result.isFailure()) {
    throw new BusinessError(result.error || RESOURCE_ERRORS.UPDATE_FAILED('unlock order'));
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * GET /api/orders/stats - Get order statistics
 */
export const getOrderStats = async (
  request: FastifyRequest<{ Querystring: OrderStatsQuery }>,
  reply: FastifyReply
) => {
  const { type, invoice_date: invoiceDate } = request.query;

  const result = await orderRepo.getOrderStats(type, invoiceDate);

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('statistik order'));
  }

  return reply.send({ success: true, data: { value: result.getValue() } });
};

/**
 * GET /api/orders/waiting-payment - Get orders waiting for payment
 */
export const getWaitingPaymentOrders = async (
  request: FastifyRequest<{ Querystring: OrderQuery }>,
  reply: FastifyReply
) => {
  const { search, customer_id, page = ORDER_CONFIG.DEFAULT_PAGE, limit = ORDER_CONFIG.DEFAULT_LIMIT } = request.query;
  const { page: clampedPage, limit: clampedLimit } = clampPagination(page, limit);

  const result = await orderRepo.findWaitingPayment({
    search,
    customerId: customer_id,
    page: clampedPage,
    limit: clampedLimit,
    ...buildRoleBasedFilters(request.user),
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
export const getOutstandingWhitelistOrders = async (
  request: FastifyRequest<{ Querystring: OrderQuery }>,
  reply: FastifyReply
) => {
  const { search, customer_id, page = ORDER_CONFIG.DEFAULT_PAGE, limit = ORDER_CONFIG.DEFAULT_LIMIT } = request.query;
  const { page: clampedPage, limit: clampedLimit } = clampPagination(page, limit);

  const result = await orderRepo.findOutstandingWhitelist({
    search,
    customerId: customer_id,
    page: clampedPage,
    limit: clampedLimit,
    ...buildRoleBasedFilters(request.user),
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

/** Query type for invoice status batch endpoint */
interface InvoiceBatchQuery {
  order_ids: string;
}

/**
 * GET /api/orders/invoices - Get invoice status for multiple orders
 */
export const getOrderInvoiceStatusBatch = async (
  request: FastifyRequest<{ Querystring: InvoiceBatchQuery }>,
  reply: FastifyReply
) => {
  const { order_ids: orderIdsParam } = request.query;

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

/** Query type for export endpoints */
interface ExportQuery {
  search?: string;
  customer_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  streaming?: string;
}

/**
 * GET /api/orders/export - Export orders to CSV (streaming)
 *
 * Uses streaming export for memory efficiency.
 * Can handle 100K+ records without memory issues.
 */
export const exportOrders = async (
  request: FastifyRequest<{ Querystring: ExportQuery }>,
  reply: FastifyReply
) => {
  const { search, customer_id: customerId, status, date_from, date_to, streaming } = request.query;
  const dateFrom = safeParseDate(date_from) ?? undefined;
  const dateTo = safeParseDate(date_to) ?? undefined;

  // Check if streaming is requested (default: true for better performance)
  const useStreaming = streaming !== 'false';

  if (useStreaming) {
    // Streaming export - memory efficient for large datasets
    const filter = {
      search,
      customerId,
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
      customerId,
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
    const exportData: OrderExportData[] = orders.map((order: OrderWithRelations) => ({
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

/** Query type for download endpoint */
interface DownloadQuery {
  type?: 'sppc' | 'quotation' | 'request_form' | 'coa_request' | 'coa_release';
}

/**
 * GET /api/orders/:id/download - Download order document as PDF
 */
export const downloadOrderDocument = async (
  request: FastifyRequest<{ Params: IdParam; Querystring: DownloadQuery }>,
  reply: FastifyReply
) => {
  const { id } = request.params;
  const docType = request.query.type ?? 'sppc';

  // TODO: Move sample and worksheet fetching to repository
  // Fetch order and samples in parallel for better performance
  const [result, samples] = await Promise.all([
    orderRepo.findById(id),
    prisma.sample.findMany({
      where: { order_id: id, trash: { equals: null } },
      include: {
        standart: true,
      },
    }),
  ]);

  // Type alias for sample with standard relation (used in map callbacks)
  type SampleWithStandard = (typeof samples)[number];

  if (result.isFailure()) {
    throw new NotFoundError(RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  const order = result.getValue();
  if (!order) {
    throw new NotFoundError(RESOURCE_ERRORS.ORDER_NOT_FOUND);
  }

  // Fetch worksheets (services) for each sample
  const sampleIds = samples.map((s: SampleWithStandard) => s.id);
  const worksheets = await prisma.worksheet.findMany({
    where: {
      sample_id: { in: sampleIds },
      trash: { equals: null },
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
        samples: samples.map((sample: SampleWithStandard) => {
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
        services: samples.flatMap((sample: SampleWithStandard, sIdx: number) => {
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

    case 'request_form':
      pdfBuffer = await pdfService.generateRequestForm({
        requestCode: `RF-${order.code}`,
        requestDate: order.orderDate.toISOString(),
        orderCode: order.code,
        customerName: order.customer?.customer_name ?? '',
        contactName,
        address: order.address?.address ?? '',
        phone: order.contact?.phone ?? '',
        email: order.contact?.email ?? '',
        samples: samples.map((sample: SampleWithStandard) => {
          const sampleWorksheets = worksheetsBySample[sample.id] ?? [];
          const firstMatrix = sampleWorksheets[0]?.service?.method?.matrix?.name ?? '';
          return {
            code: sample.code,
            name: sample.name,
            matrix: firstMatrix,
            quantity: 1,
            condition: 'Normal',
            parameters: sampleWorksheets
              .filter(ws => ws.service?.parameter && ws.service?.method)
              .map(ws => ({
                name: ws.service.parameter.name,
                method: ws.service.method.name,
              })),
          };
        }),
        priority: order.priority ?? undefined,
        remarks: order.remarks ?? undefined,
      });
      filename = `RequestForm_${order.code}.pdf`;
      break;

    case 'coa_request':
      pdfBuffer = await pdfService.generateCOARequest({
        requestCode: `COAR-${order.code}`,
        requestDate: new Date().toISOString(),
        orderCode: order.code,
        customerName: order.customer?.customer_name ?? '',
        contactName,
        address: order.address?.address ?? '',
        phone: order.contact?.phone ?? '',
        email: order.contact?.email ?? '',
        samples: samples.map((sample: SampleWithStandard) => {
          const sampleWorksheets = worksheetsBySample[sample.id] ?? [];
          const firstMatrix = sampleWorksheets[0]?.service?.method?.matrix?.name ?? '';
          return {
            code: sample.code,
            name: sample.name,
            matrix: firstMatrix,
            status: sample.status ?? 'Pending',
            completionDate: sample.complete_date?.toISOString(),
          };
        }),
        requestedFormat: 'Original (Hard Copy)',
        deliveryMethod: 'Pick Up',
        remarks: order.remarks ?? undefined,
      });
      filename = `COARequest_${order.code}.pdf`;
      break;

    case 'coa_release':
      pdfBuffer = await pdfService.generateCOARelease({
        releaseCode: `COARL-${order.code}`,
        releaseDate: new Date().toISOString(),
        orderCode: order.code,
        customerName: order.customer?.customer_name ?? '',
        contactName,
        address: order.address?.address ?? '',
        samples: samples.map((sample: SampleWithStandard) => ({
          code: sample.code,
          name: sample.name,
          coaCode: `COA-${sample.code}`,
          status: 'Released',
          releasedDate: new Date().toISOString(),
        })),
        deliveryMethod: 'Pick Up',
        remarks: order.remarks ?? undefined,
      });
      filename = `COARelease_${order.code}.pdf`;
      break;

    default:
      throw new ValidationError('Invalid document type. Valid types: sppc, quotation, request_form, coa_request, coa_release');
  }

  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  return reply.send(pdfBuffer);
};

/** Query type for CTS/NCTS/Calibration export endpoints */
interface SpecialExportQuery {
  customer_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * GET /api/orders/export/cts - Export CTS (Customer Testing Service) orders to CSV
 */
export const exportCTS = async (
  request: FastifyRequest<{ Querystring: SpecialExportQuery }>,
  reply: FastifyReply
) => {
  const { customer_id: customerId, status, date_from, date_to } = request.query;
  const dateFrom = safeParseDate(date_from) ?? undefined;
  const dateTo = safeParseDate(date_to) ?? undefined;

  const result = await orderRepo.findForCTSExport({
    customerId,
    status,
    dateFrom,
    dateTo,
    limit: ORDER_CONFIG.MAX_EXPORT_LIMIT,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to export CTS data');
  }

  const data = result.getValue() as CTSExportData[];
  const csv = exportService.exportCTS(data);
  const filename = exportService.generateFileName('cts_export');

  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  return reply.send(csv);
};

/**
 * GET /api/orders/export/ncts - Export Non-CTS (subcontracted) orders to CSV
 */
export const exportNonCTS = async (
  request: FastifyRequest<{ Querystring: SpecialExportQuery }>,
  reply: FastifyReply
) => {
  const { customer_id: customerId, status, date_from, date_to } = request.query;
  const dateFrom = safeParseDate(date_from) ?? undefined;
  const dateTo = safeParseDate(date_to) ?? undefined;

  const result = await orderRepo.findForNonCTSExport({
    customerId,
    status,
    dateFrom,
    dateTo,
    limit: ORDER_CONFIG.MAX_EXPORT_LIMIT,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to export Non-CTS data');
  }

  const data = result.getValue() as NonCTSExportData[];
  const csv = exportService.exportNonCTS(data);
  const filename = exportService.generateFileName('ncts_export');

  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  return reply.send(csv);
};

/**
 * GET /api/orders/export/calibration - Export calibration orders to CSV
 */
export const exportCalibration = async (
  request: FastifyRequest<{ Querystring: SpecialExportQuery }>,
  reply: FastifyReply
) => {
  const { customer_id: customerId, status, date_from, date_to } = request.query;
  const dateFrom = safeParseDate(date_from) ?? undefined;
  const dateTo = safeParseDate(date_to) ?? undefined;

  const result = await orderRepo.findForCalibrationExport({
    customerId,
    status,
    dateFrom,
    dateTo,
    limit: ORDER_CONFIG.MAX_EXPORT_LIMIT,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to export calibration data');
  }

  const data = result.getValue() as CalibrationExportData[];
  const csv = exportService.exportCalibration(data);
  const filename = exportService.generateFileName('calibration_export');

  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  return reply.send(csv);
};

/** Query type for date range export endpoints */
interface DateRangeQuery {
  date_from?: string;
  date_to?: string;
}

/**
 * GET /api/orders/export/active-customers - Export active customers report to CSV
 */
export const exportActiveCustomers = async (
  request: FastifyRequest<{ Querystring: DateRangeQuery }>,
  reply: FastifyReply
) => {
  const { date_from, date_to } = request.query;
  const dateFrom = safeParseDate(date_from) ?? undefined;
  const dateTo = safeParseDate(date_to) ?? undefined;

  const result = await orderRepo.findActiveCustomers(dateFrom, dateTo);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to export active customers');
  }

  const data = result.getValue() as ActiveCustomerExportData[];
  const csv = exportService.exportActiveCustomers(data);
  const filename = exportService.generateFileName('active_customers');

  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  return reply.send(csv);
};

/** Query type for required date range export */
interface RequiredDateRangeQuery {
  date_from: string;
  date_to: string;
}

/**
 * GET /api/orders/export/report - Generate order report by date range
 */
export const exportOrderReport = async (
  request: FastifyRequest<{ Querystring: RequiredDateRangeQuery }>,
  reply: FastifyReply
) => {
  const { date_from, date_to } = request.query;
  const dateFrom = safeParseDate(date_from);
  const dateTo = safeParseDate(date_to);

  if (!dateFrom || !dateTo) {
    throw new ValidationError('date_from and date_to are required');
  }

  const result = await orderRepo.generateOrderReport(dateFrom, dateTo);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to generate order report');
  }

  const data = result.getValue() as ReportExportData[];
  const csv = exportService.exportReport(data);
  const filename = exportService.generateFileName('order_report');

  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  return reply.send(csv);
};
