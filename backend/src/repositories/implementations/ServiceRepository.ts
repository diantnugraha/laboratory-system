import { PrismaClient } from '@prisma/client';
import {
  IServiceRepository,
  ServiceFilter,
  CreateServiceDTO,
  UpdateServiceDTO,
} from '../contracts/IServiceRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildMultiFieldSearchCondition } from '../../utils/searchHelper';

/**
 * Service Repository Implementation (The Worker)
 * Concrete implementation of service data access operations
 *
 * Note: Complex business logic (contract pricing, analyst counting, statistics)
 * is handled in the controller due to dependencies on models that may not exist
 */
export class ServiceRepository implements IServiceRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: ServiceFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { search, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      // Multi-field search on name and code
      const where: any = {
        trash: null,
        ...(search && buildMultiFieldSearchCondition(['name', 'code'], search)),
      };

      const [data, total] = await Promise.all([
        this.prisma.service.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'asc' },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            parameter: {
              select: {
                id: true,
                name: true,
              },
            },
            method: {
              select: {
                id: true,
                name: true,
                matrix: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.service.count({ where }),
      ]);

      return RepositoryResult.ok({
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch services: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const service = await this.prisma.service.findFirst({
        where: { id, trash: null },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          parameter: {
            select: {
              id: true,
              name: true,
            },
          },
          method: {
            select: {
              id: true,
              name: true,
              matrix: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          subcontractor: {
            select: {
              id: true,
              lab_name: true,
            },
          },
          analystType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!service) {
        return RepositoryResult.fail('Service not found');
      }

      return RepositoryResult.ok(service);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch service: ${error.message}`);
    }
  }

  async findByCode(code: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const where: any = {
        code: { equals: code, mode: 'insensitive' },
        trash: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const service = await this.prisma.service.findFirst({ where });

      return RepositoryResult.ok(service);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check service code: ${error.message}`);
    }
  }

  async findForJson(
    labType: 'cts' | 'env' | 'all',
    product: boolean,
    nonparameter: boolean,
    excludeInactive: boolean,
    search?: string,
    limit: number = 150
  ): Promise<RepositoryResult<any[]>> {
    try {
      const where: any = {
        trash: null,
      };

      // Lab type filter
      if (labType === 'cts') {
        where.user = { in: [1, 3] }; // CTS Lab only (1) or Both (3)
      } else if (labType === 'env') {
        where.user = { in: [2, 3] }; // Non-CTS Lab only (2) or Both (3)
      }

      // Status filter - exclude Inactive
      if (excludeInactive) {
        where.status = { not: 'Inactive' };
      }

      // Parameter filter
      if (product) {
        where.parameter_id = { equals: 0 }; // Product services
      } else if (!nonparameter) {
        where.parameter_id = { not: 0 }; // Exclude products
      }

      // Search filter
      if (search) {
        Object.assign(where, buildMultiFieldSearchCondition(['name', 'code'], search));
      }

      const services = await this.prisma.service.findMany({
        where,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          category: {
            select: { id: true, name: true },
          },
          parameter: {
            select: { id: true, name: true },
          },
          method: {
            select: {
              id: true,
              name: true,
              matrix: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      return RepositoryResult.ok(services);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch services for JSON: ${error.message}`);
    }
  }

  async findForFetch(filter: ServiceFilter, orderBy: any): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { status, user, method, name, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = {
        trash: null,
      };

      // Status filter
      if (status) {
        where.status = status;
      } else {
        where.status = { not: null };
      }

      // Lab type filter
      if (user !== undefined) {
        where.user = user;
      }

      // Method filter (LIKE)
      if (method) {
        where.method = {
          name: { contains: method },
        };
      }

      // Name filter (LIKE)
      if (name) {
        where.name = { contains: name };
      }

      const [data, total] = await Promise.all([
        this.prisma.service.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            method: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.service.count({ where }),
      ]);

      return RepositoryResult.ok({
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch services for fetch: ${error.message}`);
    }
  }

  async findAllForReport(startDate?: string, endDate?: string): Promise<RepositoryResult<any[]>> {
    try {
      const where: any = {
        trash: null,
      };

      // Apply date filtering if provided
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          where.created_at.gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.created_at.lte = end;
        }
      }

      const services = await this.prisma.service.findMany({
        where,
        orderBy: { id: 'asc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          method: {
            select: {
              id: true,
              name: true,
              matrix: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return RepositoryResult.ok(services);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch services for report: ${error.message}`);
    }
  }

  async validateCategoryExists(categoryId: number): Promise<RepositoryResult<boolean>> {
    try {
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId, trash: null },
      });

      return RepositoryResult.ok(!!category);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate category: ${error.message}`);
    }
  }

  async validateParameterExists(parameterId: number): Promise<RepositoryResult<boolean>> {
    try {
      const parameter = await this.prisma.parameter.findFirst({
        where: { id: parameterId, trash: null },
      });

      return RepositoryResult.ok(!!parameter);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate parameter: ${error.message}`);
    }
  }

  async validateMethodExists(methodId: number): Promise<RepositoryResult<boolean>> {
    try {
      const method = await this.prisma.method.findFirst({
        where: { id: methodId, trash: null },
      });

      return RepositoryResult.ok(!!method);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate method: ${error.message}`);
    }
  }

  async validateSubcontractorExists(subcontractorId: number): Promise<RepositoryResult<boolean>> {
    try {
      const subcontractor = await this.prisma.subcontractor.findFirst({
        where: { id: subcontractorId, trash: null },
      });

      return RepositoryResult.ok(!!subcontractor);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate subcontractor: ${error.message}`);
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

  async create(data: CreateServiceDTO, createdBy: number): Promise<RepositoryResult<any>> {
    try {
      const service = await this.prisma.service.create({
        data: {
          code: data.code,
          name: data.name,
          category_id: data.category_id,
          parameter_id: data.parameter_id,
          method_id: data.method_id,
          subcontractor_id: data.subcontractor_id || null,
          analyst_type_id: data.analyst_type_id || null,
          accreditation: data.accreditation || null,
          accreditation_valid_date: data.accreditation_valid_date || null,
          unit: data.unit || null,
          published_date: data.published_date || null,
          lod: data.lod || null,
          loq: data.loq || null,
          proficiency_test: data.proficiency_test || null,
          description: data.description || null,
          price: Math.round(data.price),
          user: data.user || 1,
          use_pc: data.use_pc || 0,
          status: data.status || null,
          trash: null,
          created_by: createdBy,
          updated_by: null,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          parameter: {
            select: {
              id: true,
              name: true,
            },
          },
          method: {
            select: {
              id: true,
              name: true,
              matrix: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          subcontractor: {
            select: {
              id: true,
              lab_name: true,
            },
          },
          analystType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(service);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create service: ${error.message}`);
    }
  }

  async update(
    id: number,
    data: UpdateServiceDTO,
    updatedBy: number,
    trackPriceHistory: boolean
  ): Promise<RepositoryResult<any>> {
    try {
      // Use transaction for price history tracking
      const service = await this.prisma.$transaction(async (tx) => {
        // Get existing service for price comparison
        const existing = await tx.service.findFirst({
          where: { id },
        });

        // Create price history record if price changed and tracking enabled
        if (trackPriceHistory && existing && data.price !== undefined && data.price !== existing.price) {
          try {
            // @ts-ignore - ServiceHistory may not exist in Prisma schema
            await tx.serviceHistory.create({
              data: {
                service_id: id,
                price: existing.price, // Store old price
                created_by: updatedBy,
              },
            });
          } catch (error: any) {
            // Model doesn't exist or other error - log but continue
            if (!error?.message?.includes('Unknown arg') && !error?.message?.includes('model')) {
              // Only log if it's not a "model doesn't exist" error
              console.warn('ServiceHistory model not available');
            }
          }
        }

        // Prepare update data
        const updateData: any = {
          updated_by: updatedBy,
        };

        if (data.code !== undefined) updateData.code = data.code;
        if (data.name !== undefined) updateData.name = data.name;
        if (data.category_id !== undefined) updateData.category_id = data.category_id;
        if (data.parameter_id !== undefined) updateData.parameter_id = data.parameter_id;
        if (data.method_id !== undefined) updateData.method_id = data.method_id;
        if (data.subcontractor_id !== undefined) updateData.subcontractor_id = data.subcontractor_id || null;
        if (data.analyst_type_id !== undefined) updateData.analyst_type_id = data.analyst_type_id || null;
        if (data.accreditation !== undefined) updateData.accreditation = data.accreditation || null;
        if (data.accreditation_valid_date !== undefined) updateData.accreditation_valid_date = data.accreditation_valid_date || null;
        if (data.unit !== undefined) updateData.unit = data.unit || null;
        if (data.published_date !== undefined) updateData.published_date = data.published_date || null;
        if (data.lod !== undefined) updateData.lod = data.lod || null;
        if (data.loq !== undefined) updateData.loq = data.loq || null;
        if (data.proficiency_test !== undefined) updateData.proficiency_test = data.proficiency_test || null;
        if (data.description !== undefined) updateData.description = data.description || null;
        if (data.price !== undefined) updateData.price = Math.round(data.price);
        if (data.user !== undefined) updateData.user = data.user;
        if (data.use_pc !== undefined) updateData.use_pc = data.use_pc;
        if (data.status !== undefined) updateData.status = data.status || null;

        // Update service
        return tx.service.update({
          where: { id },
          data: updateData,
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            parameter: {
              select: {
                id: true,
                name: true,
              },
            },
            method: {
              select: {
                id: true,
                name: true,
                matrix: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            subcontractor: {
              select: {
                id: true,
                lab_name: true,
              },
            },
            analystType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      });

      return RepositoryResult.ok(service);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update service: ${error.message}`);
    }
  }

  async delete(id: number, updatedBy: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.service.update({
        where: { id },
        data: {
          trash: 1,
          updated_by: updatedBy,
        },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete service: ${error.message}`);
    }
  }
}
