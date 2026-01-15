import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { OrderRepository } from '../repositories/implementations/OrderRepository';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const orderRepo = new OrderRepository(prisma);

/**
 * GET /api/orders/generate-code - Get next auto-generated code
 */
export const getGeneratedCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await orderRepo.generateCode();

    if (result.isFailure()) {
      res.status(500).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: { code: result.getValue() } });
  } catch (error) {
    console.error('generateCode error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to generate code',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/orders - List with search & pagination
 */
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const customerId = req.query.customer_id ? parseId(req.query.customer_id as string) : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const priority = typeof req.query.priority === 'string' ? req.query.priority : undefined;

    const result = await orderRepo.findAll({
      search,
      customerId: customerId || undefined,
      status,
      priority,
      page,
      limit,
      userRole: req.user?.role_id,
      userCustomerId: req.user?.customer_id ?? undefined,
    });

    if (result.isFailure()) {
      res.status(500).json({ success: false, message: result.error });
      return;
    }

    const data = result.getValue();
    const response: ApiResponse = {
      success: true,
      data: data.data,
      pagination: data.pagination,
    };

    res.json(response);
  } catch (error) {
    console.error('getAll orders error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/orders/:id
 */
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const result = await orderRepo.findById(id);

    if (result.isFailure()) {
      res.status(404).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getById order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/orders/json - For autocomplete/dropdown
 */
export const getOrdersJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const customerId = req.query.customer_id ? parseId(req.query.customer_id as string) : undefined;

    const result = await orderRepo.findForAutocomplete(search, customerId || undefined);

    if (result.isFailure()) {
      res.status(500).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getOrdersJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/orders
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
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
    } = req.body;

    // Generate code
    const codeResult = await orderRepo.generateCode();
    if (codeResult.isFailure()) {
      res.status(500).json({ success: false, message: codeResult.error });
      return;
    }

    const result = await orderRepo.create({
      code: codeResult.getValue(),
      customerId: customer_id,
      contactId: contact_id,
      addressId: address_id,
      contractId: contract_id,
      preOrderId: pre_order_id,
      quotationId: quotation_id,
      status: status || 'Created',
      priority: priority || 'Normal',
      orderDate: new Date(order_date),
      dueDate: due_date ? new Date(due_date) : null,
      subTotal: sub_total,
      discountPercent: discount_percent,
      discountValue: discount_value,
      vatPercent: vat_percent,
      vatValue: vat_value,
      total,
      remarks,
      notesInternal: notes_internal,
      lab,
      createdBy: req.user!.id,
    });

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('create order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * PUT /api/orders/:id
 */
export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    // Check if order exists
    const existingResult = await orderRepo.findById(id);
    if (existingResult.isFailure()) {
      res.status(404).json({ success: false, message: existingResult.error });
      return;
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
    } = req.body;

    const result = await orderRepo.update(id, {
      customerId: customer_id,
      contactId: contact_id,
      addressId: address_id,
      contractId: contract_id,
      preOrderId: pre_order_id,
      quotationId: quotation_id,
      status,
      priority,
      orderDate: order_date ? new Date(order_date) : undefined,
      dueDate: due_date !== undefined ? (due_date ? new Date(due_date) : null) : undefined,
      completeDate: complete_date !== undefined ? (complete_date ? new Date(complete_date) : null) : undefined,
      subTotal: sub_total,
      discountPercent: discount_percent,
      discountValue: discount_value,
      vatPercent: vat_percent,
      vatValue: vat_value,
      total,
      remarks,
      notesInternal: notes_internal,
      lab,
      updatedBy: req.user!.id,
    });

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('update order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update order',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * PATCH /api/orders/:id/status - Update order status
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { status } = req.body;

    const result = await orderRepo.updateStatus(id, status, req.user!.id);

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * DELETE /api/orders/:id
 */
export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const result = await orderRepo.delete(id, req.user!.id);

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('delete order error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete order',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};
