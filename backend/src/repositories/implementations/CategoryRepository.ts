import { PrismaClient } from '@prisma/client';
import {
  ICategoryRepository,
  CategoryFilter,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '../contracts/ICategoryRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildSearchCondition } from '../../utils/searchHelper';

/**
 * Category Repository Implementation (The Worker)
 * Concrete implementation of category data access operations
 */
export class CategoryRepository implements ICategoryRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: CategoryFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { search, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where = {
        trash: null,
        ...buildSearchCondition('name', search),
      };

      const [data, total] = await Promise.all([
        this.prisma.category.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
        }),
        this.prisma.category.count({ where }),
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
      return RepositoryResult.fail(`Failed to fetch categories: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const category = await this.prisma.category.findFirst({
        where: { id, trash: null },
      });

      if (!category) {
        return RepositoryResult.fail('Category not found');
      }

      return RepositoryResult.ok(category);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch category: ${error.message}`);
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

      const category = await this.prisma.category.findFirst({ where });

      return RepositoryResult.ok(category);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check category name: ${error.message}`);
    }
  }

  async create(data: CreateCategoryDTO): Promise<RepositoryResult<any>> {
    try {
      const category = await this.prisma.category.create({
        data: {
          name: data.name,
          trash: null,
        },
      });

      return RepositoryResult.ok(category);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create category: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateCategoryDTO): Promise<RepositoryResult<any>> {
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: {
          name: data.name,
        },
      });

      return RepositoryResult.ok(category);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update category: ${error.message}`);
    }
  }

  async delete(id: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.category.update({
        where: { id },
        data: { trash: 1 },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete category: ${error.message}`);
    }
  }
}
