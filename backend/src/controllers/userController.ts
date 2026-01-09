import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { UserRepository } from '../repositories/implementations/UserRepository';
import { handleDepartmentArray } from '../utils/userHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';
import { generateSecurePassword } from '../utils/otpGenerator';

// Initialize repository
const userRepo = new UserRepository(prisma);

/**
 * Helper: Send welcome email (placeholder - requires email service)
 * TODO: Implement email service integration
 */
const sendWelcomeEmail = async (email: string, _username: string, temporaryPassword: string, _displayName: string): Promise<void> => {
  // TODO: Implement email service
  // This should send an email with:
  // - Username
  // - Temporary password
  // - Login URL
  // - Instructions to change password on first login
  console.log(`[EMAIL] Welcome email would be sent to ${email} with password: ${temporaryPassword}`);
};

/**
 * GET /api/users - Get list of users with search
 * Requires SuperAdmin (role_id: 1) or Admin (role_id: 2)
 */
export const getPublicUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseQueryParam(req.query.limit, 10), 100);
    const offset = parseQueryParam(req.query.offset, 0);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    // Call repository
    const result = await userRepo.findAll({ search, limit, offset });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error
      });
      return;
    }

    const data = result.getValue();

    const response: ApiResponse = {
      success: true,
      data: data.data,
      pagination: data.pagination
    };

    res.json(response);
  } catch (error) {
    console.error('Get users error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/users/:id - Get user by ID
 * Requires SuperAdmin (role_id: 1) or Admin (role_id: 2)
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Call repository
    const result = await userRepo.findById(id);

    if (result.isFailure()) {
      res.status(404).json({
        success: false,
        message: result.error
      });
      return;
    }

    res.json({
      success: true,
      data: result.getValue()
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/users - Create new user
 * Requires SuperAdmin (role_id: 1) or HRDManager (role_id: 2)
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, display_name, role_id, customer_id, contact_id, department, analyst_type_id } = req.body;
    const userId = (req as any).user?.id;

    // Validate required fields
    if (!username || typeof username !== 'string' || username.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Username is required'
      });
      return;
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    if (!display_name || typeof display_name !== 'string' || display_name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Display name is required'
      });
      return;
    }

    if (!role_id || typeof role_id !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Role ID is required'
      });
      return;
    }

    // Business Rule: customer_id required if role_id=16 (Customer) - BR-003
    if (role_id === 16 && !customer_id) {
      res.status(400).json({
        success: false,
        message: 'Customer ID is required for Customer role'
      });
      return;
    }

    // Check role exists via repository
    const roleValid = await userRepo.validateRoleExists(role_id);
    if (roleValid.isFailure() || !roleValid.getValue()) {
      res.status(404).json({
        success: false,
        message: 'Role not found'
      });
      return;
    }

    // Business Rule: Check username uniqueness separately - BR-001
    const usernameResult = await userRepo.findByUsername(username.trim());
    if (usernameResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: usernameResult.error
      });
      return;
    }
    if (usernameResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
      return;
    }

    // Business Rule: Check email uniqueness separately - BR-002
    const emailResult = await userRepo.findByEmail(email.trim());
    if (emailResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: emailResult.error
      });
      return;
    }
    if (emailResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
      return;
    }

    // Check customer exists if provided via repository
    if (customer_id) {
      const customerValid = await userRepo.validateCustomerExists(customer_id);
      if (customerValid.isFailure() || !customerValid.getValue()) {
        res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
        return;
      }
    }

    // Generate secure password
    const generatedPassword = generateSecurePassword(12);

    // Hash password via repository
    const hashedPassword = await userRepo.hashPassword(generatedPassword);

    // Handle department array
    const departmentStr = handleDepartmentArray(department);

    // Create user via repository (handles transaction internally)
    const result = await userRepo.create({
      username: username.trim(),
      email: email.trim(),
      display_name: display_name.trim(),
      role_id,
      customer_id: customer_id || null,
      contact_id: contact_id || null,
      department: departmentStr,
      password: hashedPassword,
      created_by: userId || 1,
      analyst_type_id: analyst_type_id || undefined
    });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error
      });
      return;
    }

    const createdUser = result.getValue();

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(createdUser.email, createdUser.username, generatedPassword, createdUser.display_name).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        ...createdUser,
        password: generatedPassword // Return generated password (only in response, not stored)
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/users/:id - Update user
 * Requires SuperAdmin OR self (own profile)
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const { username, email, display_name, role_id, customer_id, contact_id, department, analyst_type_id, delete: deleteFlag, password } = req.body;
    const userId = (req as any).user?.id;
    const isAdmin = (req as any).user?.role_id === 1; // SuperAdmin

    // Check if user exists via repository (need full user data for authorization & role check)
    const existingResult = await prisma.users.findFirst({
      where: { id }
    });

    if (!existingResult || existingResult.trash !== null) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const existingUser = existingResult;

    // Check authorization: Admin or self
    if (!isAdmin && existingUser.id !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
      return;
    }

    // Handle soft delete (BR-004) via repository
    if (deleteFlag === true || deleteFlag === '1' || deleteFlag === 1) {
      const deleteResult = await userRepo.delete(id, userId || null);
      if (deleteResult.isFailure()) {
        res.status(500).json({
          success: false,
          message: deleteResult.error
        });
        return;
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};

    if (username !== undefined) {
      if (!username || typeof username !== 'string' || username.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Username cannot be empty'
        });
        return;
      }
      updateData.username = username.trim();
    }

    if (email !== undefined) {
      if (!email || typeof email !== 'string' || email.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Email cannot be empty'
        });
        return;
      }
      updateData.email = email.trim();
    }

    if (display_name !== undefined) {
      if (!display_name || typeof display_name !== 'string' || display_name.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Display name cannot be empty'
        });
        return;
      }
      updateData.display_name = display_name.trim();
    }

    if (role_id !== undefined) {
      if (typeof role_id !== 'number') {
        res.status(400).json({
          success: false,
          message: 'Role ID must be a number'
        });
        return;
      }
      updateData.role_id = role_id;
    }

    if (customer_id !== undefined) {
      updateData.customer_id = customer_id ? Number(customer_id) : null;
    }

    if (contact_id !== undefined) {
      updateData.contact_id = contact_id ? Number(contact_id) : null;
    }

    if (department !== undefined) {
      updateData.department = handleDepartmentArray(department);
    }

    // Handle password update (if provided) via repository
    if (password && typeof password === 'string' && password.trim() !== '') {
      updateData.password = await userRepo.hashPassword(password.trim());
    }

    // Validate role exists if updating via repository
    if (updateData.role_id) {
      const roleValid = await userRepo.validateRoleExists(updateData.role_id);
      if (roleValid.isFailure() || !roleValid.getValue()) {
        res.status(404).json({
          success: false,
          message: 'Role not found'
        });
        return;
      }

      // Business Rule: customer_id required if role_id=16
      if (updateData.role_id === 16 && !updateData.customer_id && !existingUser.customer_id) {
        res.status(400).json({
          success: false,
          message: 'Customer ID is required for Customer role'
        });
        return;
      }
    }

    // Validate customer exists if updating via repository
    if (updateData.customer_id) {
      const customerValid = await userRepo.validateCustomerExists(updateData.customer_id);
      if (customerValid.isFailure() || !customerValid.getValue()) {
        res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
        return;
      }
    }

    // Business Rule: Check username uniqueness (exclude self) - BR-001
    if (updateData.username) {
      const usernameResult = await userRepo.findByUsername(updateData.username, id);
      if (usernameResult.isFailure()) {
        res.status(500).json({
          success: false,
          message: usernameResult.error
        });
        return;
      }
      if (usernameResult.getValue() !== null) {
        res.status(409).json({
          success: false,
          message: 'Username already exists'
        });
        return;
      }
    }

    // Business Rule: Check email uniqueness (exclude self) - BR-002
    if (updateData.email) {
      const emailResult = await userRepo.findByEmail(updateData.email, id);
      if (emailResult.isFailure()) {
        res.status(500).json({
          success: false,
          message: emailResult.error
        });
        return;
      }
      if (emailResult.getValue() !== null) {
        res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
        return;
      }
    }

    updateData.updated_by = userId || null;
    updateData.analyst_type_id = analyst_type_id || undefined;

    // Update user via repository (handles AnalystRules management in transaction)
    const result = await userRepo.update(id, updateData, existingUser.role_id);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error
      });
      return;
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('Update user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/users/:id - Soft delete user
 * Requires SuperAdmin (role_id: 1) only
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const userId = (req as any).user?.id;

    // Prevent self-deletion
    if (id === userId) {
      res.status(403).json({
        success: false,
        message: 'Cannot delete your own account'
      });
      return;
    }

    // Check if user exists via repository
    const existingResult = await userRepo.findById(id);
    if (existingResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Delete via repository
    const result = await userRepo.delete(id, userId || null);
    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error
      });
      return;
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/users/json - JSON API for autocomplete/select2
 * Requires any authenticated user
 */
export const getUsersJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchTerm = typeof req.query.q === 'string' ? req.query.q : undefined;
    const idIn = typeof req.query.id_in === 'string' ? req.query.id_in : undefined;
    const exceptRole = typeof req.query.except_role === 'string' ? parseId(req.query.except_role) : undefined;
    const isDataTable = req.query.dataTable !== undefined;

    // Parse filterIds (comma-separated)
    let filterIds: number[] | undefined;
    if (idIn) {
      filterIds = idIn.split(',').map(id => parseId(id.trim())).filter((id): id is number => id !== null);
    }

    // Parse excludeRoles (comma-separated: "16,28")
    const excludeRolesParam = typeof req.query.exclude_roles === 'string' ? req.query.exclude_roles : undefined;
    let excludeRoles: number[] | undefined;
    if (excludeRolesParam) {
      excludeRoles = excludeRolesParam.split(',').map(r => parseId(r.trim())).filter((r): r is number => r !== null);
    }

    // Parse includeRoles (comma-separated: "16,28")
    const includeRolesParam = typeof req.query.include_roles === 'string' ? req.query.include_roles : undefined;
    let includeRoles: number[] | undefined;
    if (includeRolesParam) {
      includeRoles = includeRolesParam.split(',').map(r => parseId(r.trim())).filter((r): r is number => r !== null);
    }

    // Determine limit based on mode
    const limit = isDataTable ? 1000 : 20;

    // Call repository for autocomplete
    const result = await userRepo.findForAutocomplete({
      search: searchTerm,
      excludeRole: exceptRole ?? undefined,  // Backward compatibility
      excludeRoles,  // For Internal tab
      includeRoles,  // For External tab
      filterIds,
      limit
    });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error
      });
      return;
    }

    // Get response from repository
    const data = result.getValue();

    // Adjust response format based on dataTable parameter
    const response = {
      total_count: data.total_count,
      incomplete_results: data.incomplete_results,
      ...(isDataTable ? { data: data.items } : { items: data.items })
    };

    res.json(response);
  } catch (error) {
    console.error('getUsersJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users JSON',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/users/fetchJson - Advanced JSON API with multiple filters
 * Requires any authenticated user
 */
export const getUsersFetchJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchTerm = typeof req.query.q === 'string' ? req.query.q : undefined;
    const name = typeof req.query.name === 'string' ? req.query.name : undefined;
    const rolesParam = typeof req.query.roles === 'string' ? req.query.roles : undefined;
    const customerId = typeof req.query.customer_id === 'string' ? parseId(req.query.customer_id) : undefined;
    const orderBy = typeof req.query.order_by === 'string' ? req.query.order_by : undefined;

    // Parse roles (comma-separated)
    let roleIds: number[] | undefined;
    if (rolesParam) {
      roleIds = rolesParam.split(',').map(r => parseId(r.trim())).filter((r): r is number => r !== null);
    }

    // Search by display_name (q or name)
    const search = searchTerm || name;

    // Call repository for DataTable
    const result = await userRepo.findForDataTable({
      search,
      roles: roleIds,
      customer_id: customerId ?? undefined,
      orderBy
    });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error
      });
      return;
    }

    res.json(result.getValue());
  } catch (error) {
    console.error('getUsersFetchJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users fetchJson',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/users/resendWelcome/:id - Resend welcome email
 * Requires SuperAdmin (role_id: 1) or HRDManager (role_id: 2)
 */
export const resendWelcomeEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if user exists via repository
    const userResult = await userRepo.findById(id);
    if (userResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const user = userResult.getValue();

    // Generate new temporary password
    const generatedPassword = generateSecurePassword(12);

    // Update user password via repository
    const passwordResult = await userRepo.updatePasswordAndGet(id, generatedPassword);
    if (passwordResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: passwordResult.error
      });
      return;
    }

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(user.email, user.username, generatedPassword, user.display_name).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.json({
      success: true,
      message: 'Welcome email sent successfully',
      data: {
        password: generatedPassword // Return generated password (only in response)
      }
    });
  } catch (error) {
    console.error('Resend welcome email error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to resend welcome email',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
