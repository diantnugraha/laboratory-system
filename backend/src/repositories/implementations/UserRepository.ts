import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  IUserRepository,
  UserFilter,
  CreateUserDTO,
  UpdateUserDTO,
} from '../contracts/IUserRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildSearchCondition } from '../../utils/searchHelper';

// Agency role ID
const AGENCY_ROLE_ID = 28;

/**
 * User Repository Implementation (The Worker)
 * Concrete implementation of user data access operations
 * Includes complex transaction logic for AnalystRules management
 */
export class UserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Parse list_customer or list_contact field
   * Supports both JSON array format and comma-separated format
   */
  parseListField(listValue: string | null): number[] {
    if (!listValue || listValue.trim() === '') return [];

    // Try JSON parse first
    try {
      const parsed = JSON.parse(listValue);
      if (Array.isArray(parsed)) {
        return parsed
          .map(id => typeof id === 'number' ? id : parseInt(id, 10))
          .filter(id => !isNaN(id));
      }
    } catch {
      // Not JSON, try comma-separated
    }

    // Fallback to comma-separated
    return listValue
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id));
  }

  /**
   * Serialize customer/contact IDs to JSON string for storage
   */
  serializeListField(ids: number[]): string | null {
    if (!ids || ids.length === 0) return null;
    return JSON.stringify(ids);
  }

  async findAll(filter: UserFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { search, limit = 10, offset = 0, excludeRoles, includeRoles } = filter;

      const where: any = {
        trash: null,
        ...buildSearchCondition('display_name', search),
      };

      // Filter by role type (internal/external)
      if (includeRoles && includeRoles.length > 0) {
        where.role_id = { in: includeRoles };
      } else if (excludeRoles && excludeRoles.length > 0) {
        where.role_id = { notIn: excludeRoles };
      }

      const [data, total] = await Promise.all([
        this.prisma.users.findMany({
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
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                customer_name: true,
              },
            },
          },
          orderBy: { id: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.users.count({ where }),
      ]);

      return RepositoryResult.ok({
        data,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch users: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const user = await this.prisma.users.findFirst({
        where: {
          id,
          trash: null,
        },
        select: {
          id: true,
          username: true,
          email: true,
          display_name: true,
          role_id: true,
          customer_id: true,
          contact_id: true,
          list_customer: true,
          list_contact: true,
          profile_picture: true,
          department: true,
          created_at: true,
          updated_at: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
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
              email: true,
            },
          },
        },
      });

      if (!user) {
        return RepositoryResult.fail('User not found');
      }

      // For Agency role, parse list_customer and list_contact and fetch customer/contact details
      if (user.role_id === AGENCY_ROLE_ID) {
        const customerIds = this.parseListField(user.list_customer);
        const contactIds = this.parseListField(user.list_contact);

        let customers: any[] = [];
        if (customerIds.length > 0) {
          customers = await this.prisma.customer.findMany({
            where: {
              id: { in: customerIds },
              trash: null,
            },
            select: {
              id: true,
              customer_name: true,
            },
          });
        }

        let contacts: any[] = [];
        if (contactIds.length > 0) {
          contacts = await this.prisma.contact.findMany({
            where: {
              id: { in: contactIds },
              trash: null,
            },
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              customer_id: true,
              customer: {
                select: {
                  id: true,
                  customer_name: true,
                },
              },
            },
          });
        }

        return RepositoryResult.ok({
          ...user,
          customer_ids: customerIds,
          contact_ids: contactIds,
          customers,
          contacts,
        });
      }

      return RepositoryResult.ok(user);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch user: ${error.message}`);
    }
  }

  async findByUsername(username: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const where: any = {
        trash: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      // Fetch all users and filter case-insensitively (MySQL doesn't support mode: 'insensitive')
      const users = await this.prisma.users.findMany({
        where,
        select: { id: true, username: true },
      });

      // Find case-insensitive match
      const existing = users.find(
        (user: any) => user.username?.toLowerCase() === username.toLowerCase()
      );

      return RepositoryResult.ok(existing || null);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check username: ${error.message}`);
    }
  }

  async findByEmail(email: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const where: any = {
        trash: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      // Fetch all users and filter case-insensitively (MySQL doesn't support mode: 'insensitive')
      const users = await this.prisma.users.findMany({
        where,
        select: { id: true, email: true },
      });

      // Find case-insensitive match
      const existing = users.find(
        (user: any) => user.email?.toLowerCase() === email.toLowerCase()
      );

      return RepositoryResult.ok(existing || null);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check email: ${error.message}`);
    }
  }

  async findForAutocomplete(filter: UserFilter): Promise<RepositoryResult<any>> {
    try {
      const { search, excludeRole, excludeRoles, includeRoles, filterIds, limit = 20 } = filter;

      const where: any = {
        trash: null,
        ...buildSearchCondition('display_name', search),
      };

      // Role filtering with priority: includeRoles > excludeRoles > excludeRole > default
      if (includeRoles && includeRoles.length > 0) {
        // Include only specific roles (for External tab)
        where.role_id = { in: includeRoles };
      } else if (excludeRoles && excludeRoles.length > 0) {
        // Exclude multiple roles (for Internal tab)
        where.role_id = { notIn: excludeRoles };
      } else if (excludeRole !== undefined) {
        // Backward compatibility: single exclude
        where.role_id = { not: excludeRole };
      } else {
        // Default: Exclude Customer (16) and Agency (28)
        where.role_id = { notIn: [16, 28] };
      }

      // Filter by specific IDs
      if (filterIds && filterIds.length > 0) {
        where.id = { in: filterIds };
      }

      const users = await this.prisma.users.findMany({
        where,
        select: {
          id: true,
          username: true,
          display_name: true,
          last_login: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              customer_name: true,
            },
          },
        },
        take: limit,
        orderBy: { display_name: 'asc' },
      });

      // Transform to expected format
      const items = users.map(user => ({
        id: user.id,
        name: user.display_name,
        login: user.last_login ? user.last_login.toISOString() : null,
        role: {
          id: user.role.id,
          name: user.role.name,
        },
        company: user.customer?.customer_name || 'Internal',
      }));

      // JSON API Response Format
      const response = {
        total_count: items.length,
        incomplete_results: false,
        items,
      };

      return RepositoryResult.ok(response);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch users for autocomplete: ${error.message}`);
    }
  }

  async findForDataTable(filter: UserFilter): Promise<RepositoryResult<any>> {
    try {
      const { search, roles, customer_id, orderBy } = filter;

      const where: any = {
        trash: null,
        ...buildSearchCondition('username', search),
      };

      // Filter by roles
      if (roles && roles.length > 0) {
        where.role_id = { in: roles };
      }

      // Filter by customer
      if (customer_id !== undefined) {
        where.customer_id = customer_id;
      }

      // Determine ordering
      let orderByClause: any = { id: 'asc' };
      if (orderBy === 'username') {
        orderByClause = { username: 'asc' };
      } else if (orderBy === 'email') {
        orderByClause = { email: 'asc' };
      }

      const items = await this.prisma.users.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          display_name: true,
          role_id: true,
          customer_id: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              customer_name: true,
            },
          },
        },
        take: 1000,
        orderBy: orderByClause,
      });

      // JSON API Response Format
      const response = {
        total_count: items.length,
        incomplete_results: false,
        data: items,
      };

      return RepositoryResult.ok(response);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch users for DataTable: ${error.message}`);
    }
  }

  async validateRoleExists(roleId: number): Promise<RepositoryResult<boolean>> {
    try {
      const role = await this.prisma.roles.findFirst({
        where: { id: roleId },
      });

      return RepositoryResult.ok(!!role);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate role: ${error.message}`);
    }
  }

  async validateCustomerExists(customerId: number): Promise<RepositoryResult<boolean>> {
    try {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, trash: null },
      });

      return RepositoryResult.ok(!!customer);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate customer: ${error.message}`);
    }
  }

  async validateAnalystTypeExists(analystTypeId: number): Promise<RepositoryResult<boolean>> {
    try {
      const analystType = await this.prisma.analystType.findFirst({
        where: { id: analystTypeId, trash: null },
      });

      return RepositoryResult.ok(!!analystType);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate analyst type: ${error.message}`);
    }
  }

  async create(data: CreateUserDTO): Promise<RepositoryResult<any>> {
    try {
      // Transaction: Create user + optionally create AnalystRules
      const result = await this.prisma.$transaction(async (tx) => {
        // Prepare create data
        const createData: any = {
          username: data.username,
          email: data.email,
          display_name: data.display_name,
          role_id: data.role_id,
          customer_id: data.customer_id || null,
          contact_id: data.contact_id || null,
          department: data.department || null,
          password: data.password,
          created_by: data.created_by,
        };

        // For Agency role (28), handle list_customer and list_contact
        if (data.role_id === AGENCY_ROLE_ID) {
          if (data.customer_ids && data.customer_ids.length > 0) {
            createData.list_customer = this.serializeListField(data.customer_ids);
          }
          if (data.contact_ids && data.contact_ids.length > 0) {
            createData.list_contact = this.serializeListField(data.contact_ids);
          }
        }

        // Create user
        const user = await tx.users.create({
          data: createData,
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                customer_name: true,
              },
            },
          },
        });

        // BR-005: Create AnalystRules if role_id=8 (Analyst) and analyst_type_id provided
        if (data.role_id === 8 && data.analyst_type_id) {
          // Validate analyst_type exists
          const analystType = await tx.analystType.findFirst({
            where: { id: data.analyst_type_id, trash: null },
          });

          if (!analystType) {
            throw new Error('Analyst type not found');
          }

          await tx.analystRules.create({
            data: {
              user_id: user.id,
              analyst_type_id: data.analyst_type_id,
            },
          });
        }

        return user;
      });

      return RepositoryResult.ok(result);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create user: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateUserDTO, existingRoleId: number): Promise<RepositoryResult<any>> {
    try {
      // Transaction: Update user + manage AnalystRules
      const result = await this.prisma.$transaction(async (tx) => {
        // Prepare update data
        const updateData: any = {};

        if (data.username !== undefined) updateData.username = data.username;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.display_name !== undefined) updateData.display_name = data.display_name;
        if (data.role_id !== undefined) updateData.role_id = data.role_id;
        if (data.customer_id !== undefined) updateData.customer_id = data.customer_id;
        if (data.contact_id !== undefined) updateData.contact_id = data.contact_id;
        if (data.department !== undefined) updateData.department = data.department;
        if (data.password !== undefined) updateData.password = data.password;
        if (data.updated_by !== undefined) updateData.updated_by = data.updated_by;

        // For Agency role (28), handle list_customer and list_contact
        const newRoleId = data.role_id !== undefined ? data.role_id : existingRoleId;
        if (newRoleId === AGENCY_ROLE_ID) {
          if (data.customer_ids !== undefined) {
            updateData.list_customer = this.serializeListField(data.customer_ids);
          }
          if (data.contact_ids !== undefined) {
            updateData.list_contact = this.serializeListField(data.contact_ids);
          }
        }

        // Update user
        const user = await tx.users.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            username: true,
            email: true,
            display_name: true,
            role_id: true,
            customer_id: true,
            contact_id: true,
            list_customer: true,
            list_contact: true,
            department: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                customer_name: true,
              },
            },
          },
        });

        // BR-005: Handle AnalystRules
        const oldRoleId = existingRoleId;

        // If role changed to Analyst (8) and analyst_type_id provided
        if (newRoleId === 8 && data.analyst_type_id) {
          // Validate analyst_type exists
          const analystType = await tx.analystType.findFirst({
            where: { id: data.analyst_type_id, trash: null },
          });

          if (!analystType) {
            throw new Error('Analyst type not found');
          }

          // Check if AnalystRule already exists
          const existingRule = await tx.analystRules.findFirst({
            where: {
              user_id: id,
              analyst_type_id: data.analyst_type_id,
              trash: null,
            },
          });

          if (!existingRule) {
            await tx.analystRules.create({
              data: {
                user_id: id,
                analyst_type_id: data.analyst_type_id,
              },
            });
          }
        }

        // If role changed from Analyst (8) to other role
        if (oldRoleId === 8 && newRoleId !== 8) {
          await tx.analystRules.updateMany({
            where: {
              user_id: id,
              trash: null,
            },
            data: {
              trash: new Date(),
            },
          });
        }

        return user;
      });

      return RepositoryResult.ok(result);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update user: ${error.message}`);
    }
  }

  async delete(id: number, deletedBy?: number | null): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.users.update({
        where: { id },
        data: {
          trash: 1,
          updated_by: deletedBy || null,
        },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete user: ${error.message}`);
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  async updatePasswordAndGet(userId: number, password: string): Promise<RepositoryResult<string>> {
    try {
      const hashedPassword = await this.hashPassword(password);

      await this.prisma.users.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return RepositoryResult.ok(hashedPassword);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update password: ${error.message}`);
    }
  }
}
