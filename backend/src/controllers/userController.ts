import type { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { UserRepository } from '../repositories/implementations/UserRepository.js';
import { handleDepartmentArray } from '../utils/userHelper.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';
import { generateSecurePassword } from '../utils/otpGenerator.js';
import { emailService } from '../services/emailService.js';

// Initialize repository
const userRepo = new UserRepository(prisma);

/**
 * Helper: Generate setup password token and send welcome email
 */
const generateSetupTokenAndSendEmail = async (userId: number, email: string, displayName: string): Promise<boolean> => {
  try {
    const setupToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Update user with setup token
    await prisma.users.update({
      where: { id: userId },
      data: {
        setup_password_token: setupToken,
        setup_token_expires_at: tokenExpiry,
      },
    });

    // Send welcome email
    const emailSent = await emailService.sendWelcomeEmail(email, displayName, setupToken);
    return emailSent;
  } catch (error) {
    console.error('Failed to generate setup token or send email:', error);
    return false;
  }
};

/**
 * GET /api/users - Get list of users with search and role filtering
 * Requires SuperAdmin (role_id: 1) or Admin (role_id: 2)
 *
 * Query params:
 * - limit: number (default 30)
 * - offset: number (default 0)
 * - search: string (search by display_name)
 * - exclude_roles: string (comma-separated role IDs to exclude, e.g. "16,28")
 * - include_roles: string (comma-separated role IDs to include, e.g. "16,28")
 */
export const getPublicUsers = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const query = request.query as Record<string, any>;
    const limit = parseQueryParam(query.limit, 30);
    const offset = parseQueryParam(query.offset, 0);
    const search = typeof query.search === 'string' ? query.search : undefined;

    // Parse exclude_roles (comma-separated: "16,28")
    const excludeRolesParam = typeof query.exclude_roles === 'string' ? query.exclude_roles : undefined;
    let excludeRoles: number[] | undefined;
    if (excludeRolesParam) {
      excludeRoles = excludeRolesParam.split(',').map((r: string) => parseId(r.trim())).filter((r: number | null): r is number => r !== null);
    }

    // Parse include_roles (comma-separated: "16,28")
    const includeRolesParam = typeof query.include_roles === 'string' ? query.include_roles : undefined;
    let includeRoles: number[] | undefined;
    if (includeRolesParam) {
      includeRoles = includeRolesParam.split(',').map((r: string) => parseId(r.trim())).filter((r: number | null): r is number => r !== null);
    }

    // Call repository with filters
    const result = await userRepo.findAll({ search, limit, offset, excludeRoles, includeRoles });

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error
      });
    }

    const data = result.getValue();

    const response: ApiResponse = {
      success: true,
      data: data.data,
      pagination: data.pagination
    };

    return reply.send(response);
  } catch (error) {
    console.error('Get users error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
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
export const getUserById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as Record<string, any>;
    const id = parseId(params.id);

    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Call repository
    const result = await userRepo.findById(id);

    if (result.isFailure()) {
      // Log error internal, tapi kembalikan pesan standar ke user
      console.error('Find user by ID error:', result.error);
      return reply.code(404).send({
        success: false,
        message: 'User not found'
      });
    }

    return reply.send({
      success: true,
      data: result.getValue()
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
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
// Agency role ID
const AGENCY_ROLE_ID = 28;

export const createUser = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const body = request.body as Record<string, any>;
    const { username, email, display_name, role_id, customer_id, contact_id, department, analyst_type_id, customer_ids, contact_ids } = body;
    const userId = (request as any).user?.id;

    // Validate required fields
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Username is required'
      });
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Email is required'
      });
    }

    if (!display_name || typeof display_name !== 'string' || display_name.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Display name is required'
      });
    }

    if (!role_id || typeof role_id !== 'number') {
      return reply.code(400).send({
        success: false,
        message: 'Role ID is required'
      });
    }

    // Business Rule: customer_id required if role_id=16 (Customer) - BR-003
    if (role_id === 16 && !customer_id) {
      return reply.code(400).send({
        success: false,
        message: 'Customer ID is required for Customer role'
      });
    }

    // Business Rule: customer_ids required if role_id=28 (Agency) - BR-006
    if (role_id === AGENCY_ROLE_ID && (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0)) {
      return reply.code(400).send({
        success: false,
        message: 'At least one customer is required for Agency role'
      });
    }

    // Check role exists via repository
    const roleValid = await userRepo.validateRoleExists(role_id);
    if (roleValid.isFailure() || !roleValid.getValue()) {
      return reply.code(404).send({
        success: false,
        message: 'Role not found'
      });
    }

    // Business Rule: Check username uniqueness separately - BR-001
    const usernameResult = await userRepo.findByUsername(username.trim());
    if (usernameResult.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: usernameResult.error
      });
    }
    if (usernameResult.getValue() !== null) {
      return reply.code(409).send({
        success: false,
        message: 'Username already exists'
      });
    }

    // Business Rule: Check email uniqueness separately - BR-002
    const emailResult = await userRepo.findByEmail(email.trim());
    if (emailResult.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: emailResult.error
      });
    }
    if (emailResult.getValue() !== null) {
      return reply.code(409).send({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check customer exists if provided via repository
    if (customer_id) {
      const customerValid = await userRepo.validateCustomerExists(customer_id);
      if (customerValid.isFailure() || !customerValid.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Customer not found'
        });
      }
    }

    // Generate secure password
    const generatedPassword = generateSecurePassword(12);

    // Hash password via repository
    const hashedPassword = await userRepo.hashPassword(generatedPassword);

    // Handle department array
    const departmentStr = handleDepartmentArray(department);

    // Prepare create data
    const createData: any = {
      username: username.trim(),
      email: email.trim(),
      display_name: display_name.trim(),
      role_id,
      customer_id: customer_id || null,
      contact_id: contact_id || null,
      department: departmentStr,
      password: hashedPassword,
      created_by: userId || 1,
      analyst_type_id: analyst_type_id || undefined,
    };

    // For Agency role, add customer_ids and auto-fetch contact_ids
    if (role_id === AGENCY_ROLE_ID) {
      createData.customer_ids = customer_ids.map((id: any) => Number(id));

      // Auto-fetch all active contacts for the selected customers
      const customerIdNumbers = customer_ids.map((id: any) => Number(id));
      const contacts = await prisma.contact.findMany({
        where: {
          customer_id: { in: customerIdNumbers },
          trash: null, // Only active contacts (trash is null means not deleted)
        },
        select: { id: true },
      });

      // Combine provided contact_ids with auto-fetched contact_ids
      let allContactIds: number[] = contacts.map(c => c.id);
      if (contact_ids && Array.isArray(contact_ids)) {
        const providedContactIds = contact_ids.map((id: any) => Number(id));
        // Merge and deduplicate
        allContactIds = [...new Set([...allContactIds, ...providedContactIds])];
      }

      if (allContactIds.length > 0) {
        createData.contact_ids = allContactIds;
      }
    }

    // Create user via repository (handles transaction internally)
    const result = await userRepo.create(createData);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error
      });
    }

    const createdUser = result.getValue();

    // Generate setup token and send welcome email (async, don't wait)
    generateSetupTokenAndSendEmail(createdUser.id, createdUser.email, createdUser.display_name).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    return reply.code(201).send({
      success: true,
      message: 'User created successfully. Welcome email has been sent.',
      data: createdUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
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
export const updateUser = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as Record<string, any>;
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    const body = request.body as Record<string, any>;
    const { username, email, display_name, role_id, customer_id, contact_id, department, analyst_type_id, delete: deleteFlag, password, customer_ids, contact_ids } = body;
    const userId = (request as any).user?.id;
    const isAdmin = (request as any).user?.role_id === 1; // SuperAdmin

    // Check if user exists via repository (need full user data for authorization & role check)
    const existingResult = await prisma.users.findFirst({
      where: { id }
    });

    if (!existingResult || existingResult.trash !== null) {
      return reply.code(404).send({
        success: false,
        message: 'User not found'
      });
    }

    const existingUser = existingResult;

    // Check authorization: Admin or self
    if (!isAdmin && existingUser.id !== userId) {
      return reply.code(403).send({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    // Handle soft delete (BR-004) via repository
    if (deleteFlag === true || deleteFlag === '1' || deleteFlag === 1) {
      const deleteResult = await userRepo.delete(id, userId || null);
      if (deleteResult.isFailure()) {
        return reply.code(500).send({
          success: false,
          message: deleteResult.error
        });
      }

      return reply.send({
        success: true,
        message: 'User deleted successfully'
      });
    }

    // Prepare update data
    const updateData: any = {};

    if (username !== undefined) {
      if (!username || typeof username !== 'string' || username.trim() === '') {
        return reply.code(400).send({
          success: false,
          message: 'Username cannot be empty'
        });
      }
      updateData.username = username.trim();
    }

    if (email !== undefined) {
      if (!email || typeof email !== 'string' || email.trim() === '') {
        return reply.code(400).send({
          success: false,
          message: 'Email cannot be empty'
        });
      }
      updateData.email = email.trim();
    }

    if (display_name !== undefined) {
      if (!display_name || typeof display_name !== 'string' || display_name.trim() === '') {
        return reply.code(400).send({
          success: false,
          message: 'Display name cannot be empty'
        });
      }
      updateData.display_name = display_name.trim();
    }

    if (role_id !== undefined) {
      if (typeof role_id !== 'number') {
        return reply.code(400).send({
          success: false,
          message: 'Role ID must be a number'
        });
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
        return reply.code(404).send({
          success: false,
          message: 'Role not found'
        });
      }

      // Business Rule: customer_id required if role_id=16
      if (updateData.role_id === 16 && !updateData.customer_id && !existingUser.customer_id) {
        return reply.code(400).send({
          success: false,
          message: 'Customer ID is required for Customer role'
        });
      }

      // Business Rule: customer_ids required if role_id=28 (Agency)
      if (updateData.role_id === AGENCY_ROLE_ID) {
        // Check if customer_ids provided in update or existing user has list_customer
        if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
          return reply.code(400).send({
            success: false,
            message: 'At least one customer is required for Agency role'
          });
        }
      }
    }

    // Handle customer_ids and contact_ids for Agency role
    const effectiveRoleId = updateData.role_id || existingUser.role_id;

    if (effectiveRoleId === AGENCY_ROLE_ID) {
      // Handle customer_ids
      if (customer_ids !== undefined && Array.isArray(customer_ids)) {
        updateData.customer_ids = customer_ids.map((id: any) => Number(id));
      }

      // Handle contact_ids - use provided contact_ids directly if available
      if (contact_ids !== undefined && Array.isArray(contact_ids)) {
        // User explicitly selected contacts, use those directly
        updateData.contact_ids = contact_ids.map((id: any) => Number(id));
      } else if (customer_ids !== undefined && Array.isArray(customer_ids)) {
        // No contact_ids provided but customer_ids changed, auto-fetch contacts
        const customerIdNumbers = customer_ids.map((id: any) => Number(id));
        const contacts = await prisma.contact.findMany({
          where: {
            customer_id: { in: customerIdNumbers },
            trash: null,
          },
          select: { id: true },
        });
        updateData.contact_ids = contacts.map(c => c.id);
      }
    }

    // Validate customer exists if updating via repository
    if (updateData.customer_id) {
      const customerValid = await userRepo.validateCustomerExists(updateData.customer_id);
      if (customerValid.isFailure() || !customerValid.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Customer not found'
        });
      }
    }

    // Business Rule: Check username uniqueness (exclude self) - BR-001
    if (updateData.username) {
      const usernameResult = await userRepo.findByUsername(updateData.username, id);
      if (usernameResult.isFailure()) {
        return reply.code(500).send({
          success: false,
          message: usernameResult.error
        });
      }
      if (usernameResult.getValue() !== null) {
        return reply.code(409).send({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    // Business Rule: Check email uniqueness (exclude self) - BR-002
    if (updateData.email) {
      const emailResult = await userRepo.findByEmail(updateData.email, id);
      if (emailResult.isFailure()) {
        return reply.code(500).send({
          success: false,
          message: emailResult.error
        });
      }
      if (emailResult.getValue() !== null) {
        return reply.code(409).send({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    updateData.updated_by = userId || null;
    updateData.analyst_type_id = analyst_type_id || undefined;

    // Update user via repository (handles AnalystRules management in transaction)
    const result = await userRepo.update(id, updateData, existingUser.role_id);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error
      });
    }

    return reply.send({
      success: true,
      message: 'User updated successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('Update user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
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
export const deleteUser = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as Record<string, any>;
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    const userId = (request as any).user?.id;

    // Prevent self-deletion
    if (id === userId) {
      return reply.code(403).send({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Check if user exists via repository
    const existingResult = await userRepo.findById(id);
    if (existingResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'User not found'
      });
    }

    // Delete via repository
    const result = await userRepo.delete(id, userId || null);
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error
      });
    }

    return reply.send({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
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
export const getUsersJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const query = request.query as Record<string, any>;
    const searchTerm = typeof query.q === 'string' ? query.q : undefined;
    const idIn = typeof query.id_in === 'string' ? query.id_in : undefined;
    const exceptRole = typeof query.except_role === 'string' ? parseId(query.except_role) : undefined;
    const isDataTable = query.dataTable !== undefined;

    // Parse filterIds (comma-separated)
    let filterIds: number[] | undefined;
    if (idIn) {
      filterIds = idIn.split(',').map((id: string) => parseId(id.trim())).filter((id: number | null): id is number => id !== null);
    }

    // Parse excludeRoles (comma-separated: "16,28")
    const excludeRolesParam = typeof query.exclude_roles === 'string' ? query.exclude_roles : undefined;
    let excludeRoles: number[] | undefined;
    if (excludeRolesParam) {
      excludeRoles = excludeRolesParam.split(',').map((r: string) => parseId(r.trim())).filter((r: number | null): r is number => r !== null);
    }

    // Parse includeRoles (comma-separated: "16,28")
    const includeRolesParam = typeof query.include_roles === 'string' ? query.include_roles : undefined;
    let includeRoles: number[] | undefined;
    if (includeRolesParam) {
      includeRoles = includeRolesParam.split(',').map((r: string) => parseId(r.trim())).filter((r: number | null): r is number => r !== null);
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
      return reply.code(500).send({
        success: false,
        message: result.error
      });
    }

    // Get response from repository
    const data = result.getValue();

    // Adjust response format based on dataTable parameter
    const response = {
      total_count: data.total_count,
      incomplete_results: data.incomplete_results,
      ...(isDataTable ? { data: data.items } : { items: data.items })
    };

    return reply.send(response);
  } catch (error) {
    console.error('getUsersJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
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
export const getUsersFetchJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const query = request.query as Record<string, any>;
    const searchTerm = typeof query.q === 'string' ? query.q : undefined;
    const name = typeof query.name === 'string' ? query.name : undefined;
    const rolesParam = typeof query.roles === 'string' ? query.roles : undefined;
    const customerId = typeof query.customer_id === 'string' ? parseId(query.customer_id) : undefined;
    const orderBy = typeof query.order_by === 'string' ? query.order_by : undefined;

    // Parse roles (comma-separated)
    let roleIds: number[] | undefined;
    if (rolesParam) {
      roleIds = rolesParam.split(',').map((r: string) => parseId(r.trim())).filter((r: number | null): r is number => r !== null);
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
      return reply.code(500).send({
        success: false,
        message: result.error
      });
    }

    return reply.send(result.getValue());
  } catch (error) {
    console.error('getUsersFetchJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch users fetchJson',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * Helper: Generate username from first name
 * Format: firstname-randomstring (e.g., iqbal-as494c)
 */
const generateUsername = (firstName: string): string => {
  const cleanName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomString = Math.random().toString(36).substring(2, 8);
  return `${cleanName}-${randomString}`;
};

// Customer role ID
const CUSTOMER_ROLE_ID = 16;

/**
 * POST /api/users/from-contact - Create user from contact
 * Creates a new user with Customer role using contact data
 * Requires SuperAdmin (role_id: 1) or HRDManager (role_id: 2)
 */
export const createUserFromContact = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const body = request.body as Record<string, any>;
    const { contact_id } = body;
    const userId = (request as any).user?.id;

    if (!contact_id) {
      return reply.code(400).send({
        success: false,
        message: 'Contact ID is required'
      });
    }

    // 1. Get contact data
    const contact = await prisma.contact.findFirst({
      where: {
        id: Number(contact_id),
        trash: null
      },
      include: {
        customer: true
      }
    });

    if (!contact) {
      return reply.code(404).send({
        success: false,
        message: 'Contact not found'
      });
    }

    if (!contact.email) {
      return reply.code(400).send({
        success: false,
        message: 'Contact does not have an email address'
      });
    }

    if (!contact.customer_id) {
      return reply.code(400).send({
        success: false,
        message: 'Contact is not linked to a customer'
      });
    }

    // 2. Check if user already exists for this contact
    const existingUserByContact = await prisma.users.findFirst({
      where: {
        contact_id: contact.id,
        trash: null
      }
    });

    if (existingUserByContact) {
      return reply.code(400).send({
        success: false,
        message: 'User already exists for this contact'
      });
    }

    // 3. Check if email already used
    const emailResult = await userRepo.findByEmail(contact.email);
    if (emailResult.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: emailResult.error
      });
    }
    if (emailResult.getValue() !== null) {
      return reply.code(409).send({
        success: false,
        message: 'Email already registered to another user'
      });
    }

    // 4. Generate username
    const username = generateUsername(contact.first_name);

    // 5. Check username uniqueness
    const usernameResult = await userRepo.findByUsername(username);
    if (usernameResult.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: usernameResult.error
      });
    }
    // If username exists, regenerate with different random suffix
    let finalUsername = username;
    if (usernameResult.getValue() !== null) {
      finalUsername = generateUsername(contact.first_name);
    }

    // 6. Generate display name
    const displayName = `${contact.first_name} ${contact.surname || ''}`.trim();

    // 7. Generate random placeholder password
    const generatedPassword = uuidv4();
    const hashedPassword = await userRepo.hashPassword(generatedPassword);

    // 8. Create user via repository
    const createData: any = {
      username: finalUsername,
      email: contact.email,
      display_name: displayName,
      role_id: CUSTOMER_ROLE_ID,
      customer_id: contact.customer_id,
      contact_id: contact.id,
      password: hashedPassword,
      created_by: userId || 1,
    };

    const result = await userRepo.create(createData);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error
      });
    }

    const createdUser = result.getValue();

    // 9. Generate setup token and send welcome email
    generateSetupTokenAndSendEmail(createdUser.id, createdUser.email, createdUser.display_name).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    return reply.code(201).send({
      success: true,
      message: 'User created successfully. Welcome email has been sent.',
      data: {
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        display_name: createdUser.display_name,
      }
    });
  } catch (error) {
    console.error('Create user from contact error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to create user from contact',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/users/resendWelcome/:id - Resend welcome email with new setup token
 * Requires SuperAdmin (role_id: 1) or HRDManager (role_id: 2)
 */
export const resendWelcomeEmail = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as Record<string, any>;
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check if user exists via repository
    const userResult = await userRepo.findById(id);
    if (userResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.getValue();

    // Generate new setup token and send email
    const emailSent = await generateSetupTokenAndSendEmail(user.id, user.email, user.display_name);

    if (!emailSent) {
      return reply.code(500).send({
        success: false,
        message: 'Failed to send welcome email. Please try again.'
      });
    }

    return reply.send({
      success: true,
      message: 'Welcome email sent successfully'
    });
  } catch (error) {
    console.error('Resend welcome email error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to resend welcome email',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
