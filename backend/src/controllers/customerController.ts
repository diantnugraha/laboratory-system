import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { CustomerRepository } from '../repositories/implementations/CustomerRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { sanitizeSearchQuery } from '../utils/searchHelper.js';
import { canDeleteCustomer } from '../config/roles.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  addressSchema,
  updateAddressSchema,
  contactSchema,
  updateContactSchema,
  manageActionSchema,
} from '../validators/customer.js';

// Initialize repository
const customerRepo = new CustomerRepository(prisma);

/**
 * GET /api/customers - List customers with search, pagination, and filters
 */
export const getCustomers = async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as Record<string, any>;
  const limit = Math.min(parseQueryParam(query.limit, 30), 100);
  const offset = parseQueryParam(query.offset, 0);
  const searchQuery = sanitizeSearchQuery((query.search || query.q) as string | undefined);

  // Parse months filter - undefined means fetch all data (no date filter)
  const months = typeof query.months === 'string'
    ? (() => {
        const raw = parseInt(query.months, 10);
        return Number.isFinite(raw) && raw > 0 ? raw : undefined;
      })()
    : undefined;

  // Get user info for BR-010 customer role restrictions
  const userRole = (request as any).user?.role_id;
  const userCustomerId = (request as any).user?.customer_id ?? undefined;

  const result = await customerRepo.findAll({
    search: searchQuery,
    months,
    offset,
    limit,
    userRole,
    userCustomerId,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch customers');
  }

  const data = result.getValue();

  const response: ApiResponse = {
    success: true,
    data: data.data,
    message: result.metadata?.message || 'Customers fetched successfully',
    pagination: data.pagination,
  };

  return reply.send(response);
};

/**
 * GET /api/customers/:id - Get customer detail
 */
export const getCustomerDetail = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as Record<string, any>;
  const id = parseId(params.id);

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  const result = await customerRepo.findById(id);

  if (result.isFailure()) {
    throw new AppError(404, result.error || 'Customer not found');
  }

  return reply.send({
    success: true,
    data: result.getValue(),
  });
};

/**
 * GET /api/customers/contacts - Get contacts for a specific customer with search and pagination
 */
export const getContacts = async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as Record<string, any>;
  const customerId = query.customer_id
    ? parseId(String(query.customer_id))
    : undefined;
  const searchQuery = sanitizeSearchQuery((query.search || query.q) as string | undefined);
  const limit = Math.min(parseQueryParam(query.limit, 20), 100);
  const offset = parseQueryParam(query.offset, 0);

  if (!customerId) {
    throw new AppError(400, 'Customer ID is required');
  }

  const result = await customerRepo.findContacts({
    customerId,
    search: searchQuery,
    offset,
    limit,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch contacts');
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
 * GET /api/customers/regions - Get distinct region values (city, state, or country)
 */
export const getRegions = async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as Record<string, any>;
  const type = (query.type as string) || 'city';
  const searchQuery = sanitizeSearchQuery((query.search || query.q) as string | undefined);

  if (!['city', 'state', 'country'].includes(type)) {
    throw new AppError(400, 'Type must be city, state, or country');
  }

  const result = await customerRepo.findRegions(type as 'city' | 'state' | 'country', searchQuery);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch regions');
  }

  return reply.send({
    success: true,
    data: result.getValue(),
  });
};

/**
 * POST /api/customers - Create new customer
 * Uses Zod validation to whitelist allowed fields (prevents mass assignment)
 */
export const createCustomer = async (request: FastifyRequest, reply: FastifyReply) => {
  // Validate and whitelist input fields using Zod
  const validation = createCustomerSchema.safeParse(request.body);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] || 'Validation failed';
    throw new AppError(400, firstError);
  }

  const customerData = validation.data;

  // Check duplicate code
  const existingResult = await customerRepo.findByCode(customerData.code);
  if (existingResult.isSuccess() && existingResult.getValue()) {
    throw new AppError(400, 'Customer code already exists');
  }

  // Create customer with validated (whitelisted) data only
  const result = await customerRepo.create(customerData);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to create customer');
  }

  return reply.code(201).send({
    success: true,
    message: 'Customer created successfully',
    data: result.getValue(),
  });
};

/**
 * PUT /api/customers/:id - Update customer
 * Uses Zod validation to whitelist allowed fields (prevents mass assignment)
 */
export const updateCustomer = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as Record<string, any>;
  const id = parseId(params.id);

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  // Validate and whitelist input fields using Zod
  const validation = updateCustomerSchema.safeParse(request.body);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] || 'Validation failed';
    throw new AppError(400, firstError);
  }

  const updateData = validation.data;

  // Check if customer exists
  const customerResult = await customerRepo.findById(id);
  if (customerResult.isFailure()) {
    throw new AppError(404, 'Customer not found');
  }

  // Check duplicate code if code is being changed
  if (updateData.code) {
    const customer = customerResult.getValue();
    if (updateData.code !== customer.code) {
      const existingResult = await customerRepo.findByCode(updateData.code);
      if (existingResult.isSuccess() && existingResult.getValue()) {
        throw new AppError(400, 'Customer code already exists');
      }
    }
  }

  // Update with validated (whitelisted) data only
  const result = await customerRepo.update(id, updateData);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to update customer');
  }

  return reply.send({
    success: true,
    message: 'Customer updated successfully',
    data: result.getValue(),
  });
};

/**
 * GET /api/customers/json - Get customers for autocomplete
 */
export const getCustomersJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as Record<string, any>;
  const search = sanitizeSearchQuery(query.q as string | undefined);

  const result = await customerRepo.findForAutocomplete(search);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch customers');
  }

  return reply.send({
    success: true,
    data: result.getValue(),
  });
};

/**
 * GET /api/customers/json-top - Top revenue stats (fallback to pre-order counts if revenue data unavailable)
 */
export const getTopRevenue = async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as Record<string, any>;
  const currentYear = new Date().getFullYear();
  const yearParam = typeof query.year === 'string' ? parseInt(query.year, 10) : currentYear;
  const year = Number.isFinite(yearParam) && yearParam >= 2000 && yearParam <= currentYear + 1
    ? yearParam
    : currentYear;

  const result = await customerRepo.getTopCustomersByOrders(year);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch top revenue');
  }

  return reply.send({
    success: true,
    data: result.getValue(),
  });
};

/**
 * GET /api/customers/contacts/json - Contact autocomplete
 */
export const getContactsJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as Record<string, any>;
  const q = sanitizeSearchQuery(query.q as string | undefined);
  // Fix: proper null check before parseId to avoid type coercion bug
  const customerId = query.customer_id
    ? parseId(String(query.customer_id))
    : undefined;
  const isDataTable = query.dataTable !== undefined;

  if (!customerId) {
    throw new AppError(400, 'customer_id is required');
  }

  const result = await customerRepo.findContactsForAutocomplete(customerId, q, isDataTable);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch contacts');
  }

  const items = result.getValue();

  interface ContactsJsonResponse {
    total_count: number;
    incomplete_results: boolean;
    items?: Array<{ id: number; text: string; email: string | null }>;
    data?: Array<{ id: number; text: string; email: string | null }>;
  }

  const response: ContactsJsonResponse = {
    total_count: items.length,
    incomplete_results: false,
  };
  if (isDataTable) response.data = items;
  else response.items = items;

  return reply.send(response);
};

/**
 * GET /api/customers/fetch-json - Paginated list with advanced filters
 */
export const getFetchJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as Record<string, any>;
  const page = Math.max(1, parseQueryParam(query.page, 1));
  const perPage = Math.min(Math.max(1, parseQueryParam(query.per_page, 20)), 100);
  const customerId = query.customer_id
    ? parseId(String(query.customer_id))
    : undefined;
  const priority = typeof query.priority === 'string' ? parseInt(query.priority, 10) : undefined;
  const payment = typeof query.payment === 'string' ? parseInt(query.payment, 10) : undefined;
  const sales = typeof query.sales === 'string' ? String(query.sales) : undefined;
  const orderBy = typeof query.order_by === 'string' ? String(query.order_by) : 'id:desc';

  const result = await customerRepo.findWithAdvancedFilters({
    customerId,
    priority,
    payment,
    sales,
    page,
    perPage,
    orderBy,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch customers');
  }

  const data = result.getValue();

  return reply.send({
    success: true,
    data: {
      total_count: data.pagination.total,
      items: data.data,
    },
    pagination: data.pagination,
  });
};

/**
 * POST /api/customers/addresses - Manage address (create/update/delete)
 * Uses Zod validation to whitelist allowed fields
 */
export const manageAddress = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as Record<string, any>;
  const { action, id, customer_id, ...addressData } = body;

  // Validate action
  const actionValidation = manageActionSchema.safeParse(action);
  if (!actionValidation.success) {
    throw new AppError(400, 'Invalid action. Must be create, update, or delete');
  }

  if (action === 'create') {
    if (!customer_id) {
      throw new AppError(400, 'customer_id is required for create action');
    }

    // Validate address data
    const validation = addressSchema.safeParse(addressData);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] || 'Validation failed';
      throw new AppError(400, firstError);
    }

    const result = await customerRepo.createAddress(customer_id, {
      ...validation.data,
      created_by: (request as any).user?.id,
    });

    if (result.isFailure()) {
      throw new AppError(400, result.error || 'Failed to create address');
    }

    return reply.code(201).send({
      success: true,
      message: 'Address created successfully',
      data: result.getValue(),
    });
  }

  if (action === 'update') {
    if (!id) {
      throw new AppError(400, 'id is required for update action');
    }

    // Validate address data (partial for update)
    const validation = updateAddressSchema.safeParse(addressData);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] || 'Validation failed';
      throw new AppError(400, firstError);
    }

    const result = await customerRepo.updateAddress(id, {
      ...validation.data,
      customer_id,
      updated_by: (request as any).user?.id,
    });

    if (result.isFailure()) {
      throw new AppError(400, result.error || 'Failed to update address');
    }

    return reply.send({
      success: true,
      message: 'Address updated successfully',
      data: result.getValue(),
    });
  }

  if (action === 'delete') {
    if (!id) {
      throw new AppError(400, 'id is required for delete action');
    }

    const result = await customerRepo.deleteAddress(id);

    if (result.isFailure()) {
      throw new AppError(500, result.error || 'Failed to delete address');
    }

    return reply.send({
      success: true,
      message: 'Address deleted successfully',
    });
  }
};

/**
 * POST /api/customers/contacts - Manage contact (create/update/delete)
 * Uses Zod validation to whitelist allowed fields
 */
export const manageContact = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as Record<string, any>;
  const { action, id, customer_id, ...contactData } = body;

  // Validate action
  const actionValidation = manageActionSchema.safeParse(action);
  if (!actionValidation.success) {
    throw new AppError(400, 'Invalid action. Must be create, update, or delete');
  }

  if (action === 'create') {
    if (!customer_id) {
      throw new AppError(400, 'customer_id is required for create action');
    }

    // Validate contact data
    const validation = contactSchema.safeParse(contactData);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] || 'Validation failed';
      throw new AppError(400, firstError);
    }

    const result = await customerRepo.createContact(customer_id, {
      ...validation.data,
      created_by: (request as any).user?.id,
    });

    if (result.isFailure()) {
      throw new AppError(400, result.error || 'Failed to create contact');
    }

    return reply.code(201).send({
      success: true,
      message: 'Contact created successfully',
      data: result.getValue(),
    });
  }

  if (action === 'update') {
    if (!id) {
      throw new AppError(400, 'id is required for update action');
    }

    // Validate contact data (partial for update)
    const validation = updateContactSchema.safeParse(contactData);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] || 'Validation failed';
      throw new AppError(400, firstError);
    }

    const result = await customerRepo.updateContact(id, {
      ...validation.data,
      customer_id,
      updated_by: (request as any).user?.id,
    });

    if (result.isFailure()) {
      throw new AppError(400, result.error || 'Failed to update contact');
    }

    return reply.send({
      success: true,
      message: 'Contact updated successfully',
      data: result.getValue(),
    });
  }

  if (action === 'delete') {
    if (!id) {
      throw new AppError(400, 'id is required for delete action');
    }

    const result = await customerRepo.deleteContact(id);

    if (result.isFailure()) {
      throw new AppError(500, result.error || 'Failed to delete contact');
    }

    return reply.send({
      success: true,
      message: 'Contact deleted successfully',
    });
  }
};

/**
 * DELETE /api/customers/:id - Soft delete customer
 * Uses role constants instead of magic numbers
 */
export const deleteCustomer = async (request: FastifyRequest, reply: FastifyReply) => {
  const params = request.params as Record<string, any>;
  const id = parseId(params.id);

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  // Check user role using constants instead of magic numbers
  if (!canDeleteCustomer((request as any).user?.role_id)) {
    throw new AppError(403, 'Only SuperAdmin and Admin can delete customers');
  }

  const result = await customerRepo.delete(id);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to delete customer');
  }

  return reply.send({
    success: true,
    message: 'Customer deleted successfully',
  });
};
