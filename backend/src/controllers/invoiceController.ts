import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { InvoiceRepository } from '../repositories/implementations/InvoiceRepository.js';
import { parseId, parseQueryParam } from '../types/index.js';

// Initialize repository
const invoiceRepo = new InvoiceRepository(prisma);

/**
 * GET /api/invoices/generate-code - Get next auto-generated code
 */
export const getGeneratedCode = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const result = await invoiceRepo.generateCode();

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({ success: true, data: { code: result.data } });
  } catch (error) {
    console.error('generateCode error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to generate code',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/invoices - List with search & pagination
 */
export const getAllInvoices = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const query = request.query as Record<string, unknown>;
    const page = parseQueryParam(query.page as string | undefined, 1);
    const limit = parseQueryParam(query.limit as string | undefined, 20);
    const search = typeof query.search === 'string' ? query.search : undefined;
    const customerId = query.customer_id ? parseId(query.customer_id as string) : undefined;
    const status = typeof query.status === 'string' ? query.status : undefined;
    const dateFrom = typeof query.date_from === 'string' ? new Date(query.date_from) : undefined;
    const dateTo = typeof query.date_to === 'string' ? new Date(query.date_to) : undefined;

    const result = await invoiceRepo.findAll({
      search,
      customerId: customerId || undefined,
      status,
      dateFrom,
      dateTo,
      page,
      limit,
    });

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({
      success: true,
      data: result.data?.data,
      pagination: result.data?.pagination,
    });
  } catch (error) {
    console.error('getAllInvoices error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch invoices',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/invoices/:id - Get single invoice with relations
 */
export const getInvoiceById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as { id: string };
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({ success: false, message: 'Invalid invoice ID' });
    }

    const result = await invoiceRepo.findById(id);

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    if (!result.data) {
      return reply.code(404).send({ success: false, message: 'Invoice not found' });
    }

    return reply.send({ success: true, data: result.data });
  } catch (error) {
    console.error('getInvoiceById error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch invoice',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/invoices - Create new invoice
 */
export const createInvoice = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const body = request.body as Record<string, unknown>;
    const userId = request.user?.id;

    if (!userId) {
      return reply.code(401).send({ success: false, message: 'User not authenticated' });
    }

    // Generate code if not provided
    let code = body.code as string | undefined;
    if (!code) {
      const codeResult = await invoiceRepo.generateCode();
      if (!codeResult.success) {
        return reply.code(500).send({ success: false, message: 'Failed to generate invoice code' });
      }
      code = codeResult.data;
    }

    const result = await invoiceRepo.create({
      code,
      fakturNo: body.faktur_no as string | undefined,
      orderId: body.order_id as number | undefined,
      remarks: body.remarks as string | undefined,
      description: body.description as string | undefined,
      invoiceDate: body.invoice_date ? new Date(body.invoice_date as string) : undefined,
      invoiceSendDate: body.invoice_send_date ? new Date(body.invoice_send_date as string) : undefined,
      purchaseOrderNo: body.purchase_order_no as string | undefined,
      customerId: body.customer_id as number | undefined,
      contactId: body.contact_id as number | undefined,
      addressId: body.address_id as number | undefined,
      grandTotal: body.grand_total as number | undefined,
      subTotal: body.sub_total as number | undefined,
      status: body.status as string | undefined,
      createdBy: userId,
      orderIds: body.order_ids as number[] | undefined,
    });

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.code(201).send({ success: true, data: result.data });
  } catch (error) {
    console.error('createInvoice error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to create invoice',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * PUT /api/invoices/:id - Update invoice
 */
export const updateInvoice = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as { id: string };
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({ success: false, message: 'Invalid invoice ID' });
    }

    const userId = request.user?.id;
    if (!userId) {
      return reply.code(401).send({ success: false, message: 'User not authenticated' });
    }

    // Check if invoice exists
    const existing = await invoiceRepo.findById(id);
    if (!existing.success || !existing.data) {
      return reply.code(404).send({ success: false, message: 'Invoice not found' });
    }

    const body = request.body as Record<string, unknown>;
    const result = await invoiceRepo.update(id, {
      code: body.code as string | undefined,
      fakturNo: body.faktur_no as string | undefined,
      remarks: body.remarks as string | undefined,
      description: body.description as string | undefined,
      invoiceDate: body.invoice_date ? new Date(body.invoice_date as string) : undefined,
      invoiceSendDate: body.invoice_send_date ? new Date(body.invoice_send_date as string) : undefined,
      purchaseOrderNo: body.purchase_order_no as string | undefined,
      attachedDocument: body.attached_document as string | undefined,
      awbNo: body.awb_no as string | undefined,
      paymentStatus: body.payment_status as string | undefined,
      paymentDate: body.payment_date ? new Date(body.payment_date as string) : undefined,
      receiptDocument: body.receipt_document as string | undefined,
      grandTotal: body.grand_total as number | undefined,
      subTotal: body.sub_total as number | undefined,
      status: body.status as string | undefined,
      updatedBy: userId,
    });

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({ success: true, data: result.data });
  } catch (error) {
    console.error('updateInvoice error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to update invoice',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * DELETE /api/invoices/:id - Soft delete invoice
 */
export const deleteInvoice = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as { id: string };
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({ success: false, message: 'Invalid invoice ID' });
    }

    const userId = request.user?.id;
    if (!userId) {
      return reply.code(401).send({ success: false, message: 'User not authenticated' });
    }

    // Check if invoice exists
    const existing = await invoiceRepo.findById(id);
    if (!existing.success || !existing.data) {
      return reply.code(404).send({ success: false, message: 'Invoice not found' });
    }

    const result = await invoiceRepo.delete(id, userId);

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('deleteInvoice error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to delete invoice',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * PATCH /api/invoices/:id/status - Update invoice status
 */
export const updateInvoiceStatus = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as { id: string };
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({ success: false, message: 'Invalid invoice ID' });
    }

    const userId = request.user?.id;
    if (!userId) {
      return reply.code(401).send({ success: false, message: 'User not authenticated' });
    }

    const body = request.body as { status: string };
    const { status } = body;

    const result = await invoiceRepo.updateStatus(id, status, userId);

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({ success: true, data: result.data });
  } catch (error) {
    console.error('updateInvoiceStatus error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to update invoice status',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/invoices/:id/send - Mark invoice as sent
 */
export const markInvoiceAsSent = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as { id: string };
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({ success: false, message: 'Invalid invoice ID' });
    }

    const userId = request.user?.id;
    if (!userId) {
      return reply.code(401).send({ success: false, message: 'User not authenticated' });
    }

    const body = request.body as { send_date?: string };
    const { send_date } = body;
    const sendDate = send_date ? new Date(send_date) : new Date();

    const result = await invoiceRepo.markAsSent(id, sendDate, userId);

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({ success: true, data: result.data, message: 'Invoice marked as sent' });
  } catch (error) {
    console.error('markInvoiceAsSent error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to mark invoice as sent',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/invoices/:id/paid - Mark invoice as paid
 */
export const markInvoiceAsPaid = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as { id: string };
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({ success: false, message: 'Invalid invoice ID' });
    }

    const userId = request.user?.id;
    if (!userId) {
      return reply.code(401).send({ success: false, message: 'User not authenticated' });
    }

    const body = request.body as { payment_date?: string; payment_document?: string };
    const { payment_date, payment_document } = body;
    const paymentDate = payment_date ? new Date(payment_date) : new Date();

    const result = await invoiceRepo.markAsPaid(id, paymentDate, payment_document || null, userId);

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({ success: true, data: result.data, message: 'Invoice marked as paid' });
  } catch (error) {
    console.error('markInvoiceAsPaid error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to mark invoice as paid',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/invoices/:id/orders - Add orders to invoice
 */
export const addOrdersToInvoice = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as { id: string };
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({ success: false, message: 'Invalid invoice ID' });
    }

    const body = request.body as { order_ids?: number[] };
    const { order_ids } = body;
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return reply.code(400).send({ success: false, message: 'Order IDs required' });
    }

    const result = await invoiceRepo.addOrders(id, order_ids);

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({ success: true, message: 'Orders added to invoice' });
  } catch (error) {
    console.error('addOrdersToInvoice error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to add orders to invoice',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * DELETE /api/invoices/:id/orders - Remove orders from invoice
 */
export const removeOrdersFromInvoice = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as { id: string };
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({ success: false, message: 'Invalid invoice ID' });
    }

    const body = request.body as { order_ids?: number[] };
    const { order_ids } = body;
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return reply.code(400).send({ success: false, message: 'Order IDs required' });
    }

    const result = await invoiceRepo.removeOrders(id, order_ids);

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({ success: true, message: 'Orders removed from invoice' });
  } catch (error) {
    console.error('removeOrdersFromInvoice error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to remove orders from invoice',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/invoices/:id/orders - Get orders for invoice
 */
export const getInvoiceOrders = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as { id: string };
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({ success: false, message: 'Invalid invoice ID' });
    }

    const result = await invoiceRepo.getInvoiceOrders(id);

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({ success: true, data: result.data });
  } catch (error) {
    console.error('getInvoiceOrders error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to get invoice orders',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/invoices/outstanding - Get outstanding invoices
 */
export const getOutstandingInvoices = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const query = request.query as Record<string, unknown>;
    const page = parseQueryParam(query.page as string | undefined, 1);
    const limit = parseQueryParam(query.limit as string | undefined, 20);
    const customerId = query.customer_id ? parseId(query.customer_id as string) : undefined;

    const result = await invoiceRepo.findOutstanding({
      customerId: customerId || undefined,
      page,
      limit,
    });

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({
      success: true,
      data: result.data?.data,
      pagination: result.data?.pagination,
    });
  } catch (error) {
    console.error('getOutstandingInvoices error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch outstanding invoices',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/invoices/stats - Get invoice statistics
 */
export const getInvoiceStats = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const query = request.query as { type?: 'today' | 'month' | 'year' };
    const type = query.type || 'month';

    const result = await invoiceRepo.getInvoiceStats(type);

    if (!result.success) {
      return reply.code(500).send({ success: false, message: result.error });
    }

    return reply.send({ success: true, data: result.data });
  } catch (error) {
    console.error('getInvoiceStats error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to get invoice stats',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};
