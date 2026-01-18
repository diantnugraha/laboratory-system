import { PrismaClient } from '@prisma/client';
import {
  ILabRepository,
  LabFilter,
  CreateLabDTO,
  UpdateLabDTO,
  LabDependencyCheckResult,
} from '../contracts/ILabRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildSearchCondition } from '../../utils/searchHelper';

/**
 * Lab Repository Implementation (The Worker)
 * Concrete implementation of lab data access operations
 */
export class LabRepository implements ILabRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: LabFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { search, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where = {
        trash: null,
        ...buildSearchCondition('name', search),
      };

      const [data, total] = await Promise.all([
        this.prisma.lab.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'asc' },
        }),
        this.prisma.lab.count({ where }),
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
      return RepositoryResult.fail(`Failed to fetch labs: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const lab = await this.prisma.lab.findFirst({
        where: { id, trash: null },
      });

      if (!lab) {
        return RepositoryResult.fail('Lab not found');
      }

      return RepositoryResult.ok(lab);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch lab: ${error.message}`);
    }
  }

  async findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const where: any = {
        name: { equals: name, mode: 'insensitive' },
        trash: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const lab = await this.prisma.lab.findFirst({ where });

      return RepositoryResult.ok(lab);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check lab name: ${error.message}`);
    }
  }

  async findForAutocomplete(search?: string, dataTable: boolean = false): Promise<RepositoryResult<any>> {
    try {
      // Fix unlimited page size issue - use max 1000 for dataTable mode
      const limit = dataTable ? 1000 : 20;

      const where = {
        trash: null,
        ...buildSearchCondition('name', search),
      };

      const [items, total] = await Promise.all([
        this.prisma.lab.findMany({
          where,
          select: {
            id: true,
            name: true,
          },
          take: limit,
          orderBy: { name: 'asc' },
        }),
        this.prisma.lab.count({ where }),
      ]);

      // JSON API Response Format
      const response: any = {
        total_count: total,
        incomplete_results: false,
      };

      // Use 'data' for dataTable mode, 'items' for standard format
      if (dataTable) {
        response.data = items;
      } else {
        response.items = items;
      }

      return RepositoryResult.ok(response);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch labs for autocomplete: ${error.message}`);
    }
  }

  async create(data: CreateLabDTO): Promise<RepositoryResult<any>> {
    try {
      const lab = await this.prisma.lab.create({
        data: {
          name: data.name,
          trash: null,
        },
      });

      return RepositoryResult.ok(lab);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create lab: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateLabDTO): Promise<RepositoryResult<any>> {
    try {
      const lab = await this.prisma.lab.update({
        where: { id },
        data: {
          name: data.name,
        },
      });

      return RepositoryResult.ok(lab);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update lab: ${error.message}`);
    }
  }

  async delete(id: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.lab.update({
        where: { id },
        data: { trash: 1 },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete lab: ${error.message}`);
    }
  }

  async checkDependencies(id: number): Promise<RepositoryResult<LabDependencyCheckResult>> {
    try {
      // First check if lab exists
      const lab = await this.prisma.lab.findFirst({
        where: { id, trash: null },
      });

      if (!lab) {
        return RepositoryResult.fail('Lab not found');
      }

      // Count dependencies separately (Unit doesn't have trash field)
      const [parameterCount, unitCount] = await Promise.all([
        this.prisma.parameter.count({
          where: { lab_id: id, trash: null },
        }),
        this.prisma.unit.count({
          where: { lab_id: id },
        }),
      ]);

      return RepositoryResult.ok({
        parameterCount,
        unitCount,
        hasDependencies: parameterCount > 0 || unitCount > 0,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check dependencies: ${error.message}`);
    }
  }
}
