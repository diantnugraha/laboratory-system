import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CustomerRepository } from '../repositories/implementations/CustomerRepository';
import { buildSearchCondition, buildMultiFieldSearchCondition, sanitizeSearchQuery } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const customerRepo = new CustomerRepository(prisma);

/**
 * GET /api/customers - List customers with search, pagination, and filters
 * REFACTORED: Using Repository Pattern
 */
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseQueryParam(req.query.limit, 30), 100);
    const offset = parseQueryParam(req.query.offset, 0);
    const searchQuery = (req.query.search || req.query.q) as string | undefined;
    const lastMonths = (() => {
      const raw = typeof req.query.months === 'string' ? parseInt(req.query.months, 10) : 60;
      return Number.isFinite(raw) ? Math.max(0, raw) : 60;
    })();

    // Get user info for BR-010 customer role restrictions
    const userRole = (req as any).user?.role_id;
    const userCustomerId = (req as any).user?.customer_id;

    // ✅ Call repository instead of direct Prisma
    const result = await customerRepo.findAll({
      search: searchQuery,
      months: lastMonths,
      offset,
      limit,
      userRole,
      userCustomerId,
    });

    // ✅ Handle repository result
    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const data = result.getValue();

    // ✅ Return formatted response
    const response: ApiResponse = {
      success: true,
      data: data.data,
      message: result.metadata?.message || 'Customers fetched successfully',
      pagination: data.pagination,
    };

    res.json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/customers/:id - Get customer detail
 * REFACTORED: Using Repository Pattern
 */
export const getCustomerDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // ✅ Call repository
    const result = await customerRepo.findById(id);

    // ✅ Handle repository result
    if (result.isFailure()) {
      res.status(404).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      data: result.getValue(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/customers/contacts - Get contacts for a specific customer with search and pagination
 */
export const getContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = parseId(req.query.customer_id as string | undefined);
    const searchQuery = sanitizeSearchQuery((req.query.search || req.query.q) as string | undefined);
    const limit = Math.min(parseQueryParam(req.query.limit, 20), 100);
    const offset = parseQueryParam(req.query.offset, 0);

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: 'Customer ID is required'
      });
      return;
    }

    // Check if customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, trash: null },
      select: { id: true }
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Build where condition with spread operators
    const where = {
      customer_id: customerId,
      trash: null,
      ...buildMultiFieldSearchCondition(
        ['first_name', 'middle_name', 'surname', 'email'],
        searchQuery
      )
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: {
          id: 'desc'
        },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          first_name: true,
          middle_name: true,
          surname: true,
          username: true,
          job_title: true,
          department: true,
          email: true,
          phone: true,
          fax: true,
          mobile_phone: true,
          status: true,
          created_at: true,
          address: {
            select: {
              id: true,
              address_type: true,
              address: true,
              city: true,
              state: true,
              country: true
            }
          }
        }
      }),
      prisma.contact.count({
        where
      })
    ]);

    const response: ApiResponse = {
      success: true,
      data: contacts,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get contacts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/customers/regions - Get distinct region values (city, state, or country)
 */
export const getRegions = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = (req.query.type as string) || 'city';
    const searchQuery = sanitizeSearchQuery((req.query.search || req.query.q) as string | undefined);

    if (!['city', 'state', 'country'].includes(type)) {
      res.status(400).json({
        success: false,
        message: 'Type must be city, state, or country'
      });
      return;
    }

    // Build where condition with spread operators
    const baseWhere: any = {
      trash: null,
      [type]: {
        not: null
      }
    };

    const searchCondition = buildSearchCondition(type, searchQuery);
    // Merge search condition with base where, ensuring [type] conditions are combined
    const where = Object.keys(searchCondition).length > 0 && searchCondition[type]
      ? {
          ...baseWhere,
          [type]: {
            ...baseWhere[type],
            ...searchCondition[type]
          }
        }
      : baseWhere;

    // Use groupBy for better performance with distinct values
    // Note: Prisma's groupBy requires aggregation, so we'll use findMany with distinct
    const addresses = await prisma.address.findMany({
      where,
      select: {
        [type]: true
      },
      distinct: [type as 'city' | 'state' | 'country'],
      orderBy: {
        [type]: 'asc'
      }
    });

    // Extract and filter out null/undefined values, then sort
    const regions: string[] = [];
    for (const addr of addresses) {
      const value = (addr as any)[type] as string | null | undefined;
      if (value && typeof value === 'string' && value.trim() !== '') {
        regions.push(value);
      }
    }
    regions.sort((a, b) => a.localeCompare(b));

    res.json({
      success: true,
      data: regions
    });
  } catch (error) {
    console.error('Get regions error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regions',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/customers - Create new customer
 * REFACTORED: Using Repository Pattern
 */
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, customer_name, business, ...otherFields } = req.body;

    // ✅ Validation logic stays in controller
    if (!code || !customer_name || !business) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: code, customer_name, business',
      });
      return;
    }

    // ✅ Check duplicate code using repository
    const existingResult = await customerRepo.findByCode(code);
    if (existingResult.isSuccess() && existingResult.getValue()) {
      res.status(400).json({
        success: false,
        message: 'Customer code already exists',
      });
      return;
    }

    // ✅ Create customer using repository
    const result = await customerRepo.create({
      code,
      customer_name,
      business,
      ...otherFields,
    });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: result.getValue(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * PUT /api/customers/:id - Update customer
 * REFACTORED: Using Repository Pattern
 */
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const updateData = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // ✅ Check if customer exists using repository
    const customerResult = await customerRepo.findById(id);
    if (customerResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
      return;
    }

    // ✅ Check duplicate code if code is being changed
    if (updateData.code) {
      const customer = customerResult.getValue();
      if (updateData.code !== customer.code) {
        const existingResult = await customerRepo.findByCode(updateData.code);
        if (existingResult.isSuccess() && existingResult.getValue()) {
          res.status(400).json({
            success: false,
            message: 'Customer code already exists',
          });
          return;
        }
      }
    }

    // ✅ Update using repository
    const result = await customerRepo.update(id, updateData);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: result.getValue(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/customers/json - Get customers for autocomplete
 * REFACTORED: Using Repository Pattern
 */
export const getCustomersJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.q as string | undefined;

    // ✅ Call repository
    const result = await customerRepo.findForAutocomplete(search);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      data: result.getValue(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/customers/json-top - Top revenue stats (fallback to pre-order counts if revenue data unavailable)
 */
export const getTopRevenue = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = typeof req.query.year === 'string' ? parseInt(req.query.year, 10) : new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    // Fallback metric: number of preOrders per customer (since revenue model not present)
    const grouped = await prisma.preOrder.groupBy({
      by: ['customer_id'],
      _count: { _all: true },
      where: {
        trash: null,
        created_at: { gte: start, lte: end }
      }
    });

    // Map with customer names
    const customerIds = grouped.map(g => g.customer_id);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, customer_name: true }
    });
    const idToName = new Map(customers.map(c => [c.id, c.customer_name]));

    const sorted = grouped
      .map(g => ({ label: idToName.get(g.customer_id) || `Customer #${g.customer_id}`, value: g._count._all }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const total = sorted.reduce((sum, x) => sum + x.value, 0) || 1;
    const labels = sorted.map(s => s.label);
    const datasets = [{
      label: `Top Customers ${year}`,
      data: sorted.map(s => Math.round((s.value / total) * 100)),
    }];

    res.json({
      success: true,
      data: { labels, datasets }
    });
  } catch (error) {
    console.error('getTopRevenue error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to compute top revenue',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/customers/contacts/json - Contact autocomplete
 */
export const getContactsJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = sanitizeSearchQuery(typeof req.query.q === 'string' ? req.query.q : undefined);
    const customerId = parseId(String(req.query.customer_id || ''));
    const isDataTable = req.query.dataTable !== undefined;
    const take = isDataTable ? 1000 : 20;

    if (!customerId) {
      res.status(400).json({ success: false, message: 'customer_id is required' });
      return;
    }

    const where = {
      trash: null as any,
      customer_id: customerId,
      ...(q ? buildMultiFieldSearchCondition(['first_name', 'middle_name', 'surname', 'email'], q) : {})
    };

    const contacts = await prisma.contact.findMany({
      where,
      take,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        first_name: true,
        middle_name: true,
        surname: true,
        email: true
      }
    });

    const items = contacts.map(c => ({
      id: c.id,
      text: [c.first_name, c.middle_name, c.surname].filter(Boolean).join(' '),
      email: c.email
    }));

    const response: any = {
      total_count: items.length,
      incomplete_results: false
    };
    if (isDataTable) response.data = items;
    else response.items = items;

    res.json(response);
  } catch (error) {
    console.error('getContactsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/customers/fetch-json - Paginated list with advanced filters
 */
export const getFetchJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const per_page = parseQueryParam(req.query.per_page, 20);
    const skip = (page - 1) * per_page;

    const customerId = typeof req.query.customer_id === 'string' ? parseId(req.query.customer_id) : undefined;
    const priority = typeof req.query.priority === 'string' ? parseInt(req.query.priority, 10) : undefined; // maps to special_customer
    const payment = typeof req.query.payment === 'string' ? parseInt(req.query.payment, 10) : undefined; // maps to payment_middle
    const sales = typeof req.query.sales === 'string' ? String(req.query.sales) : undefined; // maps to sales_incharge
    const order_by = typeof req.query.order_by === 'string' ? String(req.query.order_by) : 'id:desc';

    const where: any = { trash: null };
    if (customerId) where.id = customerId;
    if (priority !== undefined) where.special_customer = priority ? 1 : 0;
    if (payment !== undefined) where.payment_middle = payment ? 1 : 0;
    if (sales) where.sales_incharge = sales;

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        take: per_page,
        skip,
        orderBy: (() => {
          const [field, dir] = order_by.split(':');
          return { [field || 'id']: (dir === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' };
        })(),
        select: {
          id: true,
          code: true,
          customer_name: true,
          special_customer: true,
          payment_middle: true,
          sales_incharge: true
        }
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        total_count: total,
        items
      },
      pagination: {
        page,
        limit: per_page,
        total,
        totalPages: Math.ceil(total / per_page)
      }
    });
  } catch (error) {
    console.error('getFetchJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/customers/addresses - Manage address (create/update/delete)
 * REFACTORED: Using Repository Pattern
 */
export const manageAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, id, customer_id, ...addressData } = req.body;

    // ✅ Validation logic in controller
    if (!['create', 'update', 'delete'].includes(action)) {
      res.status(400).json({
        success: false,
        message: 'Invalid action. Must be create, update, or delete',
      });
      return;
    }

    // ✅ Handle different actions using repository
    if (action === 'create') {
      if (!customer_id) {
        res.status(400).json({
          success: false,
          message: 'customer_id is required for create action',
        });
        return;
      }

      const result = await customerRepo.createAddress(customer_id, addressData);

      if (result.isFailure()) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Address created successfully',
        data: result.getValue(),
      });
      return;
    }

    if (action === 'update') {
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'id is required for update action',
        });
        return;
      }

      const result = await customerRepo.updateAddress(id, { ...addressData, customer_id });

      if (result.isFailure()) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Address updated successfully',
        data: result.getValue(),
      });
      return;
    }

    if (action === 'delete') {
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'id is required for delete action',
        });
        return;
      }

      const result = await customerRepo.deleteAddress(id);

      if (result.isFailure()) {
        res.status(500).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Address deleted successfully',
      });
      return;
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/customers/contacts - Manage contact (create/update/delete)
 * REFACTORED: Using Repository Pattern
 */
export const manageContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, id, customer_id, ...contactData } = req.body;

    // ✅ Validation logic in controller
    if (!['create', 'update', 'delete'].includes(action)) {
      res.status(400).json({
        success: false,
        message: 'Invalid action. Must be create, update, or delete',
      });
      return;
    }

    // ✅ Handle different actions using repository
    if (action === 'create') {
      if (!customer_id) {
        res.status(400).json({
          success: false,
          message: 'customer_id is required for create action',
        });
        return;
      }

      const result = await customerRepo.createContact(customer_id, contactData);

      if (result.isFailure()) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Contact created successfully',
        data: result.getValue(),
      });
      return;
    }

    if (action === 'update') {
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'id is required for update action',
        });
        return;
      }

      const result = await customerRepo.updateContact(id, { ...contactData, customer_id });

      if (result.isFailure()) {
        res.status(400).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Contact updated successfully',
        data: result.getValue(),
      });
      return;
    }

    if (action === 'delete') {
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'id is required for delete action',
        });
        return;
      }

      const result = await customerRepo.deleteContact(id);

      if (result.isFailure()) {
        res.status(500).json({
          success: false,
          message: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Contact deleted successfully',
      });
      return;
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * DELETE /api/customers/:id - Soft delete customer
 * REFACTORED: Using Repository Pattern
 */
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check user role - only SuperAdmin and Admin can delete
    if (!req.user || (req.user.role_id !== 1 && req.user.role_id !== 2)) {
      res.status(403).json({
        success: false,
        message: 'Only SuperAdmin and Admin can delete customers'
      });
      return;
    }

    // ✅ Delete using repository
    const result = await customerRepo.delete(id);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===== Helper Functions =====
function normalizeLocation(value: string): string {
  if (!value) return '';
  return value
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function generateUsername(first: string, middle?: string | null, surname?: string): string {
  const parts = [first, middle ?? undefined, surname].filter(Boolean).map(p => String(p).toLowerCase());
  return parts.join('-').replace(/--+/g, '-');
}

function getCustomFields(customerName: string): any {
  const name = (customerName || '').toLowerCase();
  if (name.includes('hero')) {
    return { custom_fields: { brand: 'Hero', priority: 'A' } };
  }
  if (name.includes('coca cola')) {
    return { custom_fields: { brand: 'Coca-Cola', priority: 'A' } };
  }
  return {};
}

/**
 * Get active contract for customer (if Contract model exists)
 * Returns null if model doesn't exist or no active contract found
 */
async function getActiveContract(customerId: number): Promise<any | null> {
  try {
    // Check if Contract model exists in Prisma schema
    // If Contract model doesn't exist, this will fail gracefully
    if (!('contract' in prisma)) {
      return null;
    }
    
    const now = new Date();
    // @ts-ignore - Contract model may not exist in type definitions
    const contract = await prisma.contract.findFirst({
      where: {
        customerId: customerId,
        trash: null,
        periodFrom: { lte: now },
        periodTo: { gte: now }
      },
      orderBy: { periodFrom: 'desc' },
      take: 1
    });
    
    return contract || null;
  } catch (error) {
    // Contract model doesn't exist or error occurred
    return null;
  }
}

/**
 * Handle legal_document delimited string with ';;'
 * - If override is provided, use it directly
 * - Else append newFile (if provided) and remove any listed in removeFiles
 */
function handleLegalDocument(
  existing: string,
  newFile?: string,
  removeFiles?: string[],
  override?: string
): string {
  if (override !== undefined) {
    return override;
  }
  const parts = (existing || '')
    .split(';;')
    .map(s => s.trim())
    .filter(Boolean);
  const toRemove = new Set((removeFiles || []).map(s => s.trim()).filter(Boolean));
  const filtered = parts.filter(p => !toRemove.has(p));
  if (newFile && newFile.trim()) {
    filtered.push(newFile.trim());
  }
  return filtered.join(';;');
}

