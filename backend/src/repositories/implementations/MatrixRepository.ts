import { PrismaClient } from '@prisma/client';
import {
  IMatrixRepository,
  MatrixFilter,
  CreateMatrixDTO,
  UpdateMatrixDTO,
} from '../contracts/IMatrixRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildSearchCondition } from '../../utils/searchHelper';

/**
 * Matrix Repository Implementation (The Worker)
 * Concrete implementation of matrix data access operations
 */
export class MatrixRepository implements IMatrixRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: MatrixFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { search, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where = {
        trash: null,
        ...buildSearchCondition('name', search),
      };

      const [data, total] = await Promise.all([
        this.prisma.matrix.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
        }),
        this.prisma.matrix.count({ where }),
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
      return RepositoryResult.fail(`Failed to fetch matrices: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const matrix = await this.prisma.matrix.findFirst({
        where: { id, trash: null },
      });

      if (!matrix) {
        return RepositoryResult.fail('Matrix not found');
      }

      return RepositoryResult.ok(matrix);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch matrix: ${error.message}`);
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

      const matrix = await this.prisma.matrix.findFirst({ where });

      return RepositoryResult.ok(matrix);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check matrix name: ${error.message}`);
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
        this.prisma.matrix.findMany({
          where,
          select: {
            id: true,
            name: true,
          },
          take: limit,
          orderBy: { id: 'desc' },
        }),
        this.prisma.matrix.count({ where }),
      ]);

      // BR-005: JSON API Response Format
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
      return RepositoryResult.fail(`Failed to fetch matrices for autocomplete: ${error.message}`);
    }
  }

  async create(data: CreateMatrixDTO): Promise<RepositoryResult<any>> {
    try {
      const matrix = await this.prisma.matrix.create({
        data: {
          name: data.name,
          trash: null,
        },
      });

      return RepositoryResult.ok(matrix);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create matrix: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateMatrixDTO): Promise<RepositoryResult<any>> {
    try {
      const updateData: any = {};
      if (data.name !== undefined) {
        updateData.name = data.name;
      }

      const matrix = await this.prisma.matrix.update({
        where: { id },
        data: updateData,
      });

      return RepositoryResult.ok(matrix);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update matrix: ${error.message}`);
    }
  }

  async delete(id: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.matrix.update({
        where: { id },
        data: { trash: 1 },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete matrix: ${error.message}`);
    }
  }
}
