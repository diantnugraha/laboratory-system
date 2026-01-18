import { PrismaClient } from '@prisma/client';
import {
  IAnalystTypeRepository,
  AnalystTypeFilter,
  CreateAnalystTypeDTO,
  UpdateAnalystTypeDTO,
  DependencyCheckResult,
  ReverseMigrationResult,
} from '../contracts/IAnalystTypeRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildSearchCondition, checkDuplicateCaseInsensitive } from '../../utils/searchHelper';

/**
 * Analyst Type Repository Implementation (The Worker)
 * Concrete implementation of analyst type data access operations
 */
export class AnalystTypeRepository implements IAnalystTypeRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: AnalystTypeFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { search, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = {
        trash: null,
        ...buildSearchCondition('name', search),
      };

      const [data, total] = await Promise.all([
        this.prisma.analystType.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: {
            _count: {
              select: {
                analystRules: {
                  where: {
                    trash: null,
                    user: { trash: null }
                  }
                }
              }
            }
          }
        }),
        this.prisma.analystType.count({ where }),
      ]);

      // Transform data to include analystCount (exclude _count field)
      const transformedData = data.map(item => {
        const { _count, ...rest } = item;
        return {
          ...rest,
          analystCount: _count.analystRules,
        };
      });

      return RepositoryResult.ok({
        data: transformedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch analyst types: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const analystType = await this.prisma.analystType.findFirst({
        where: { id, trash: null },
        include: {
          _count: {
            select: {
              analystRules: {
                where: {
                  trash: null,
                  user: { trash: null }
                }
              },
              services: {
                where: { trash: null }
              }
            }
          }
        }
      });

      if (!analystType) {
        return RepositoryResult.fail('Analyst type not found');
      }

      // Transform data to include counts (exclude _count field)
      const { _count, ...rest } = analystType;
      const transformedData = {
        ...rest,
        analystCount: _count.analystRules,
        serviceCount: _count.services,
      };

      return RepositoryResult.ok(transformedData);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch analyst type: ${error.message}`);
    }
  }

  async findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const existing = await checkDuplicateCaseInsensitive(
        this.prisma.analystType,
        'name',
        name,
        excludeId
      );

      return RepositoryResult.ok(existing);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check analyst type name: ${error.message}`);
    }
  }

  async findForAutocomplete(search?: string, dataTable?: boolean): Promise<RepositoryResult<any>> {
    try {
      // DataTable mode uses higher limit
      const limit = dataTable ? 1000 : 20;

      const where: any = {
        trash: null,
        ...buildSearchCondition('name', search),
      };

      const [items, total] = await Promise.all([
        this.prisma.analystType.findMany({
          where,
          select: {
            id: true,
            name: true,
          },
          take: limit,
          orderBy: { id: 'asc' },
        }),
        this.prisma.analystType.count({ where }),
      ]);

      // JSON API Response Format
      const response: any = {
        total_count: total,
        incomplete_results: total > limit,
      };

      // Use 'data' for dataTable mode, 'items' for standard format
      if (dataTable) {
        response.data = items;
      } else {
        response.items = items;
      }

      return RepositoryResult.ok(response);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch analyst types for autocomplete: ${error.message}`);
    }
  }

  async checkDependencies(id: number): Promise<RepositoryResult<DependencyCheckResult>> {
    try {
      const analystType = await this.prisma.analystType.findFirst({
        where: { id, trash: null },
        include: {
          _count: {
            select: {
              analystRules: {
                where: {
                  trash: null,
                  user: { trash: null }
                }
              },
              services: {
                where: { trash: null }
              }
            }
          }
        }
      });

      if (!analystType) {
        return RepositoryResult.fail('Analyst type not found');
      }

      const analystCount = analystType._count.analystRules;
      const serviceCount = analystType._count.services;

      return RepositoryResult.ok({
        analystCount,
        serviceCount,
        hasDependencies: analystCount > 0 || serviceCount > 0,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check dependencies: ${error.message}`);
    }
  }

  async create(data: CreateAnalystTypeDTO): Promise<RepositoryResult<any>> {
    try {
      const analystType = await this.prisma.analystType.create({
        data: {
          name: data.name,
          list_service: data.list_service ?? null,
          created_by: data.created_by ?? 1,
          trash: null,
        },
      });

      return RepositoryResult.ok(analystType);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create analyst type: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateAnalystTypeDTO): Promise<RepositoryResult<any>> {
    try {
      const updateData: any = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.list_service !== undefined) updateData.list_service = data.list_service;
      if (data.updated_by !== undefined) updateData.updated_by = data.updated_by;

      const analystType = await this.prisma.analystType.update({
        where: { id },
        data: updateData,
      });

      return RepositoryResult.ok(analystType);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update analyst type: ${error.message}`);
    }
  }

  async delete(id: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.analystType.update({
        where: { id },
        data: { trash: 1 },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete analyst type: ${error.message}`);
    }
  }

  async performReverseMigration(): Promise<RepositoryResult<ReverseMigrationResult>> {
    try {
      // Get all analyst types with list_service populated
      const analystTypes = await this.prisma.analystType.findMany({
        where: {
          trash: null,
          list_service: { not: null }
        },
        select: {
          id: true,
          name: true,
          list_service: true
        }
      });

      let totalProcessed = 0;
      const results: string[] = [];

      for (const analystType of analystTypes) {
        if (!analystType.list_service) continue;

        // Parse comma-separated service IDs (format: ",1,2,3,")
        const serviceIds = analystType.list_service
          .split(',')
          .map(id => id.trim())
          .filter(id => id && !isNaN(parseInt(id, 10)))
          .map(id => parseInt(id, 10));

        for (const serviceId of serviceIds) {
          try {
            // Check if service exists and is not already assigned
            const service = await this.prisma.service.findFirst({
              where: {
                id: serviceId,
                trash: null,
                analyst_type_id: null
              }
            });

            if (service) {
              await this.prisma.service.update({
                where: { id: serviceId },
                data: { analyst_type_id: analystType.id }
              });
              results.push(`${serviceId} : ${analystType.id}`);
              totalProcessed++;
            }
          } catch (error) {
            console.error(`Error updating service ${serviceId}:`, error);
            // Continue with other services
          }
        }
      }

      return RepositoryResult.ok({
        results,
        totalProcessed
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to perform reverse migration: ${error.message}`);
    }
  }
}
