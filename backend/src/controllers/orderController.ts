import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { OrderRepository } from '../repositories/implementations/OrderRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';
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

  const order = result.getValue() as any;

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
 * GET /api/orders/single-json/:id - Get lightweight single order for dropdown selection
 */
export const getSingleOrderJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Use a lightweight query for dropdown selection
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

  const order = result.getValue();

  // Send email notification to customer contact
  if (order.contact?.email) {
    const contactName = `${order.contact.first_name} ${order.contact.surname}`;
    emailService.sendOrderReviewedNotification(
      order.contact.email,
      contactName,
      order.code,
      order.customer?.customer_name ?? '',
      status as 'Reviewed' | 'To Be Verified' | 'Cancelled',
      reason
    ).catch(err => {
      // Log but don't fail the request if email fails
      console.error('Failed to send review notification email:', err);
    });
  }

  return reply.send({ success: true, data: order });
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

  const order = result.getValue();

  // Send notification to admin users about payment upload
  // Get admin emails (roles 1=SuperAdmin, 2=Admin)
  const admins = await prisma.users.findMany({
    where: {
      role_id: { in: [1, 2] },
      trash: null,
      email: { not: null },
    },
    select: { email: true },
  });

  const adminEmails = admins.map(a => a.email).filter((e): e is string => !!e);

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
      console.error('Failed to send payment upload notification email:', err);
    });
  }

  return reply.send({ success: true, data: order });
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
 * POST /api/orders/:id/resend-email - Resend order notification email
 */
export const resendOrderEmail = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as { id: string };
  const id = parseId(params.id);

  if (!id) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  const { email_type } = request.body as { email_type?: 'review' | 'status' | 'payment' };

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
      case 'review':
        // Resend review notification (status depends on current order status)
        const reviewStatus = order.status === 'Reviewed' ? 'Reviewed' : 'To Be Verified';
        await emailService.sendOrderReviewedNotification(
          order.contact.email,
          contactName,
          order.code,
          customerName,
          reviewStatus as 'Reviewed' | 'To Be Verified' | 'Cancelled'
        );
        break;

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
          'Payment Confirmation',
          'Under Process'
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
  } catch (error: any) {
    throw new AppError(500, `Failed to resend email: ${error.message}`);
  }
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
        samples: samples.map(sample => {
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
        samples: samples.map(sample => {
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
        samples: samples.map(sample => ({
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

/**
 * GET /api/orders/export/cts - Export CTS (Customer Testing Service) orders to CSV
 */
export const exportCTS = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const customerId = queryObj.customer_id ? parseId(queryObj.customer_id as string) : undefined;
  const status = typeof queryObj.status === 'string' ? queryObj.status : undefined;
  const dateFrom = safeParseDate(queryObj.date_from as string) ?? undefined;
  const dateTo = safeParseDate(queryObj.date_to as string) ?? undefined;

  const result = await orderRepo.findForCTSExport({
    customerId: customerId || undefined,
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
export const exportNonCTS = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const customerId = queryObj.customer_id ? parseId(queryObj.customer_id as string) : undefined;
  const status = typeof queryObj.status === 'string' ? queryObj.status : undefined;
  const dateFrom = safeParseDate(queryObj.date_from as string) ?? undefined;
  const dateTo = safeParseDate(queryObj.date_to as string) ?? undefined;

  const result = await orderRepo.findForNonCTSExport({
    customerId: customerId || undefined,
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
export const exportCalibration = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const customerId = queryObj.customer_id ? parseId(queryObj.customer_id as string) : undefined;
  const status = typeof queryObj.status === 'string' ? queryObj.status : undefined;
  const dateFrom = safeParseDate(queryObj.date_from as string) ?? undefined;
  const dateTo = safeParseDate(queryObj.date_to as string) ?? undefined;

  const result = await orderRepo.findForCalibrationExport({
    customerId: customerId || undefined,
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

/**
 * GET /api/orders/export/active-customers - Export active customers report to CSV
 */
export const exportActiveCustomers = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const dateFrom = safeParseDate(queryObj.date_from as string) ?? undefined;
  const dateTo = safeParseDate(queryObj.date_to as string) ?? undefined;

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

/**
 * GET /api/orders/export/report - Generate order report by date range
 */
export const exportOrderReport = async (request: FastifyRequest, reply: FastifyReply) => {
  const queryObj = request.query as Record<string, unknown>;
  const dateFrom = safeParseDate(queryObj.date_from as string);
  const dateTo = safeParseDate(queryObj.date_to as string);

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
