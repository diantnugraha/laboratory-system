import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildSearchCondition, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';
import bcrypt from 'bcryptjs';
import { generateSecurePassword } from '../utils/otpGenerator';

/**
 * Helper: Handle department array (join with ";;" delimiter)
 */
const handleDepartmentArray = (departments: string[] | string | undefined): string | null => {
  if (!departments) return null;
  if (Array.isArray(departments)) {
    return departments.filter(d => d && String(d).trim()).join(';;');
  }
  return String(departments).trim() || null;
};

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

    const where = {
      trash: null,
      ...buildSearchCondition('display_name', search),
    };

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          display_name: true,
          role_id: true,
          customer_id: true,
          contact_id: true,
          profile_picture: true,
          department: true,
          created_at: true,
          updated_at: true,
          role: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          id: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.users.count({ where })
    ]);

    const response: ApiResponse = {
      success: true,
      data: users,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
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

    const user = await prisma.users.findFirst({
      where: {
        id,
        trash: null
      },
      select: {
        id: true,
        username: true,
        email: true,
        display_name: true,
        role_id: true,
        customer_id: true,
        contact_id: true,
        profile_picture: true,
        department: true,
        created_at: true,
        updated_at: true,
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: user
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

    // Check role exists
    const role = await prisma.roles.findFirst({
      where: { id: role_id }
    });
    if (!role) {
      res.status(404).json({
        success: false,
        message: 'Role not found'
      });
      return;
    }

    // Business Rule: Check username uniqueness separately - BR-001
    const duplicateUsername = await checkDuplicateCaseInsensitive(
      prisma.users,
      'username',
      username.trim()
    );
    if (duplicateUsername) {
      res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
      return;
    }

    // Business Rule: Check email uniqueness separately - BR-002
    const duplicateEmail = await checkDuplicateCaseInsensitive(
      prisma.users,
      'email',
      email.trim()
    );
    if (duplicateEmail) {
      res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
      return;
    }

    // Check customer exists if provided
    if (customer_id) {
      const customer = await prisma.customer.findFirst({
        where: { id: customer_id, trash: null }
      });
      if (!customer) {
        res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
        return;
      }
    }

    // Generate secure password
    const generatedPassword = generateSecurePassword(12);
    
    // Hash password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    // Handle department array
    const departmentStr = handleDepartmentArray(department);

    // Create user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.users.create({
        data: {
          username: username.trim(),
          email: email.trim(),
          display_name: display_name.trim(),
          role_id,
          customer_id: customer_id || null,
          contact_id: contact_id || null,
          department: departmentStr,
          password: hashedPassword,
          created_by: userId || 1 // Default to 1 if no user in request
        },
        include: {
          role: {
            select: {
              id: true,
              name: true
            }
          },
          customer: {
            select: {
              id: true,
              customer_name: true
            }
          }
        }
      });

      // Business Rule: Create AnalystRules if role_id=8 (Analyst) - BR-005
      if (role_id === 8 && analyst_type_id) {
        // Check analyst_type exists
        const analystType = await tx.analystType.findFirst({
          where: { id: analyst_type_id, trash: null }
        });
        if (!analystType) {
          throw new Error('Analyst type not found');
        }

        await tx.analystRules.create({
          data: {
            user_id: user.id,
            analyst_type_id
          }
        });
      }

      return user;
    });

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(result.email, result.username, generatedPassword, result.display_name).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        ...result,
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

    // Check if user exists
    const existingUser = await prisma.users.findFirst({
      where: { id }
    });

    if (!existingUser || existingUser.trash !== null) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check authorization: Admin or self
    if (!isAdmin && existingUser.id !== userId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
      return;
    }

    // Handle soft delete (BR-004)
    if (deleteFlag === true || deleteFlag === '1' || deleteFlag === 1) {
      await prisma.users.update({
        where: { id },
        data: {
          trash: 1,
          updated_by: userId || null
        }
      });

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

    // Handle password update (if provided)
    if (password && typeof password === 'string' && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password.trim(), salt);
    }

    // Validate role exists if updating
    if (updateData.role_id) {
      const role = await prisma.roles.findFirst({
        where: { id: updateData.role_id }
      });
      if (!role) {
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

    // Validate customer exists if updating
    if (updateData.customer_id) {
      const customer = await prisma.customer.findFirst({
        where: { id: updateData.customer_id, trash: null }
      });
      if (!customer) {
        res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
        return;
      }
    }

    // Business Rule: Check username uniqueness (exclude self) - BR-001
    if (updateData.username) {
      const duplicateUsername = await checkDuplicateCaseInsensitive(
        prisma.users,
        'username',
        updateData.username,
        id
      );
      if (duplicateUsername) {
        res.status(409).json({
          success: false,
          message: 'Username already exists'
        });
        return;
      }
    }

    // Business Rule: Check email uniqueness (exclude self) - BR-002
    if (updateData.email) {
      const duplicateEmail = await checkDuplicateCaseInsensitive(
        prisma.users,
        'email',
        updateData.email,
        id
      );
      if (duplicateEmail) {
        res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
        return;
      }
    }

    updateData.updated_by = userId || null;

    // Update user and handle AnalystRules in transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.users.update({
      where: { id },
      data: updateData,
        include: {
        role: {
          select: {
            id: true,
            name: true
          }
          },
          customer: {
            select: {
              id: true,
              customer_name: true
            }
          }
        }
      });

      // Business Rule: Handle AnalystRules - BR-005
      const newRoleId = updateData.role_id !== undefined ? updateData.role_id : existingUser.role_id;
      const oldRoleId = existingUser.role_id;

      // If role changed to Analyst (8) and analyst_type_id provided
      if (newRoleId === 8 && analyst_type_id) {
        // Check analyst_type exists
        const analystType = await tx.analystType.findFirst({
          where: { id: analyst_type_id, trash: null }
        });
        if (!analystType) {
          throw new Error('Analyst type not found');
        }

        // Check if AnalystRule already exists
        const existingRule = await tx.analystRules.findFirst({
          where: {
            user_id: id,
            analyst_type_id,
            trash: null
          }
        });

        if (!existingRule) {
          await tx.analystRules.create({
            data: {
              user_id: id,
              analyst_type_id
            }
          });
        }
      }

      // If role changed from Analyst (8) to other role
      if (oldRoleId === 8 && newRoleId !== 8) {
        await tx.analystRules.updateMany({
          where: {
            user_id: id,
            trash: null
          },
          data: {
            trash: new Date()
          }
        });
      }

      return user;
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
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

    const existing = await prisma.users.findFirst({
      where: { id, trash: null }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    await prisma.users.update({
      where: { id },
      data: {
        trash: 1,
        updated_by: userId || null
      }
    });

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

    const where: any = {
      trash: null
    };

    // Search by display_name
    if (searchTerm) {
      where.display_name = {
        contains: searchTerm.trim()
      };
    }

    // Filter by IDs
    if (idIn) {
      const ids = idIn.split(',').map(id => parseId(id.trim())).filter(id => id !== null);
      if (ids.length > 0) {
        where.id = { in: ids };
      }
    }

    // Exclude role
    if (exceptRole) {
      where.role_id = { not: exceptRole };
    } else {
      // Exclude Customer role (16) by default
      where.role_id = { not: 16 };
    }

    const users = await prisma.users.findMany({
      where,
      take: isDataTable ? 1000 : 20,
      orderBy: { display_name: 'asc' },
      include: {
        role: {
          select: {
            id: true,
            name: true
          }
        },
        customer: {
          select: {
            id: true,
            customer_name: true
          }
        }
      }
    });

    const items = users.map(user => ({
      id: user.id,
      name: user.display_name,
      login: user.last_login ? user.last_login.toISOString() : null,
      role: {
        id: user.role.id,
        name: user.role.name
      },
      company: user.customer?.customer_name || 'Internal'
    }));

    const response = {
      total_count: items.length,
      incomplete_results: false,
      ...(isDataTable ? { data: items } : { items })
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
    const roles = typeof req.query.roles === 'string' ? req.query.roles : undefined;
    const customerId = typeof req.query.customer_id === 'string' ? parseId(req.query.customer_id) : undefined;
    const perPage = parseQueryParam(req.query.per_page, 20);
    const page = parseQueryParam(req.query.page, 1);
    const orderBy = typeof req.query.order_by === 'string' ? req.query.order_by : 'display_name';
    const skip = (page - 1) * perPage;

    const where: any = {
      trash: null
    };

    // Search by display_name (q or name)
    const searchName = searchTerm || name;
    if (searchName) {
      where.display_name = {
        contains: searchName.trim()
      };
    }

    // Filter by roles (comma-separated)
    if (roles) {
      const roleIds = roles.split(',').map(r => parseId(r.trim())).filter(r => r !== null);
      if (roleIds.length > 0) {
        where.role_id = { in: roleIds };
      }
    }

    // Filter by customer_id
    if (customerId) {
      where.customer_id = customerId;
    }

    // Validate order_by field
    const validOrderFields = ['id', 'display_name', 'username', 'email', 'created_at', 'updated_at'];
    const orderField = validOrderFields.includes(orderBy) ? orderBy : 'display_name';
    const orderDir = req.query.order_dir === 'desc' ? 'desc' : 'asc';

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { [orderField]: orderDir },
        include: {
          role: {
            select: {
              id: true,
              name: true
            }
          },
          customer: {
            select: {
              id: true,
              customer_name: true
            }
          }
        }
      }),
      prisma.users.count({ where })
    ]);

    const items = users.map(user => ({
      id: user.id,
      name: user.display_name,
      login: user.last_login ? user.last_login.toISOString() : null,
      role: {
        id: user.role.id,
        name: user.role.name
      },
      company: user.customer?.customer_name || 'Internal'
    }));

    res.json({
      total_count: total,
      items
    });
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

    const user = await prisma.users.findFirst({
      where: { id, trash: null }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Generate new temporary password
    const generatedPassword = generateSecurePassword(12);
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    // Update user password
    await prisma.users.update({
      where: { id },
      data: {
        password: hashedPassword
        // Note: must_change_password field doesn't exist in schema yet
        // If added, set it to true here
      }
    });

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
