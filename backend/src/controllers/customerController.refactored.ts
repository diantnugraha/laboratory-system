/**
 * Customer Controller - REFACTORED VERSION
 * Using Clean Repository Pattern (Contract-Worker-Result)
 *
 * This is an example showing how to refactor the existing customerController
 * to use the Repository Pattern for better separation of concerns.
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CustomerRepository } from '../repositories/implementations/CustomerRepository';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const customerRepo = new CustomerRepository(prisma);

/**
 * GET /api/customers - List customers with search, pagination, and filters
 *
 * BEFORE: Direct Prisma calls in controller
 * AFTER: Using repository pattern
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
 *
 * BEFORE: Direct Prisma calls in controller
 * AFTER: Using repository pattern
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
 * POST /api/customers - Create new customer
 *
 * BEFORE: Validation and Prisma calls mixed in controller
 * AFTER: Validation in controller, data access in repository
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
 *
 * BEFORE: Direct Prisma update in controller
 * AFTER: Using repository pattern
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
 * DELETE /api/customers/:id - Soft delete customer
 *
 * BEFORE: Direct Prisma update in controller
 * AFTER: Using repository pattern
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

/**
 * POST /api/customers/addresses - Manage address (create/update/delete)
 *
 * BEFORE: Complex logic mixed with Prisma calls
 * AFTER: Business logic in controller, data access in repository
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
 *
 * BEFORE: Complex logic mixed with Prisma calls
 * AFTER: Business logic in controller, data access in repository
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
 * GET /api/customers/json - Get customers for autocomplete
 *
 * BEFORE: Direct Prisma calls in controller
 * AFTER: Using repository pattern
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
