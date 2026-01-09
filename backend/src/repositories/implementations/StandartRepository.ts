import { PrismaClient } from '@prisma/client';
import {
  IStandartRepository,
  StandartFilter,
  CreateStandartDTO,
  UpdateStandartDTO,
  FetchJsonFilter,
} from '../contracts/IStandartRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildMultiFieldSearchCondition, checkDuplicateCaseInsensitive } from '../../utils/searchHelper';

/**
 * Standart Repository Implementation (The Worker)
 * Concrete implementation of standart data access operations with nested standartDetails
 */
export class StandartRepository implements IStandartRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: StandartFilter): Promise<RepositoryResult<PaginatedData<any> | any>> {
    try {
      const { search, page = 1, limit = 20, select = false } = filter;

      const where: any = {
        trash: null,
        ...buildMultiFieldSearchCondition(['name', 'code'], search),
      };

      // Select mode: simplified data for dropdown/select
      if (select) {
        const standards = await this.prisma.standart.findMany({
          where,
          select: {
            id: true,
            code: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        });

        return RepositoryResult.ok(standards);
      }

      // Standard mode: full data with pagination and nested relations
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.prisma.standart.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                customer_name: true,
                code: true,
              },
            },
            standartDetails: {
              include: {
                service: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.standart.count({ where }),
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
      return RepositoryResult.fail(`Failed to fetch standards: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const standard = await this.prisma.standart.findFirst({
        where: { id, trash: null },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              customer_name: true,
              code: true,
            },
          },
          standartDetails: {
            include: {
              service: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!standard) {
        return RepositoryResult.fail('Standard not found');
      }

      return RepositoryResult.ok(standard);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch standard: ${error.message}`);
    }
  }

  async findByCode(code: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const existing = await checkDuplicateCaseInsensitive(
        this.prisma.standart,
        'code',
        code,
        excludeId
      );

      return RepositoryResult.ok(existing);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check standard code: ${error.message}`);
    }
  }

  async findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const existing = await checkDuplicateCaseInsensitive(
        this.prisma.standart,
        'name',
        name,
        excludeId
      );

      return RepositoryResult.ok(existing);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check standard name: ${error.message}`);
    }
  }

  async findForJson(filter: StandartFilter, dataTable?: boolean): Promise<RepositoryResult<any>> {
    try {
      const { search, customer_id } = filter;

      const where: any = {
        trash: null,
      };

      // Search filter (name or code)
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { code: { contains: search } },
        ];
      }

      // Customer role filtering: filter by customer_id if provided
      if (customer_id) {
        where.customer_id = customer_id;
      }

      const standards = await this.prisma.standart.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      const response: any = {
        total_count: standards.length,
        incomplete_results: false,
      };

      // Use 'data' key if dataTable flag is set, otherwise use 'items'
      if (dataTable) {
        response.data = standards;
      } else {
        response.items = standards;
      }

      return RepositoryResult.ok(response);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch standards for JSON: ${error.message}`);
    }
  }

  async findForFetchJson(filter: FetchJsonFilter): Promise<RepositoryResult<any>> {
    try {
      const { search, perPage = 20, page = 1, orderBy } = filter;
      const skip = (page - 1) * perPage;

      const where: any = {
        trash: null,
        ...buildMultiFieldSearchCondition(['name', 'code'], search),
      };

      // Handle order_by if provided
      let orderByClause: any = { id: 'desc' };
      if (orderBy && orderBy.trim()) {
        const orderParts = orderBy.trim().split(' ');
        if (orderParts.length === 2) {
          const field = orderParts[0];
          const direction = orderParts[1].toLowerCase() === 'asc' ? 'asc' : 'desc';
          orderByClause = { [field]: direction };
        }
      }

      const [standards, total] = await Promise.all([
        this.prisma.standart.findMany({
          where,
          skip,
          take: perPage,
          orderBy: orderByClause,
          select: {
            id: true,
            code: true,
            name: true,
            customer: {
              select: {
                id: true,
              },
            },
          },
        }),
        this.prisma.standart.count({ where }),
      ]);

      return RepositoryResult.ok({
        total_count: total,
        items: standards,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch standards for fetch JSON: ${error.message}`);
    }
  }

  async validateCategoryExists(categoryId: number): Promise<RepositoryResult<boolean>> {
    try {
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId },
      });

      return RepositoryResult.ok(!!category);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate category: ${error.message}`);
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

  async validateServiceExists(serviceId: number): Promise<RepositoryResult<boolean>> {
    try {
      const service = await this.prisma.service.findFirst({
        where: { id: serviceId, trash: null },
      });

      return RepositoryResult.ok(!!service);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate service: ${error.message}`);
    }
  }

  async create(data: CreateStandartDTO): Promise<RepositoryResult<any>> {
    try {
      // Create standard with nested standartDetails using transaction for atomicity
      const standard = await this.prisma.$transaction(async (tx) => {
        return await tx.standart.create({
          data: {
            code: data.code,
            name: data.name,
            category_id: data.category_id ?? null,
            customer_id: data.customer_id ?? null,
            created_by: data.created_by ?? 1,
            trash: null,
            standartDetails: {
              create: data.standartDetails.map((detail) => ({
                service_id: detail.service_id,
                min: detail.min,
                max: detail.max,
                unit: detail.unit,
              })),
            },
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                customer_name: true,
                code: true,
              },
            },
            standartDetails: {
              include: {
                service: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        });
      });

      return RepositoryResult.ok(standard);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create standard: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateStandartDTO): Promise<RepositoryResult<any>> {
    try {
      // Use transaction to update standard and standartDetails
      const result = await this.prisma.$transaction(async (tx) => {
        // Build update data
        const updateData: any = {};

        if (data.code !== undefined) updateData.code = data.code;
        if (data.name !== undefined) updateData.name = data.name;
        if (data.category_id !== undefined) updateData.category_id = data.category_id;
        if (data.customer_id !== undefined) updateData.customer_id = data.customer_id;
        if (data.updated_by !== undefined) updateData.updated_by = data.updated_by;

        // Update standard
        await tx.standart.update({
          where: { id },
          data: updateData,
        });

        // Handle standartDetails if provided
        if (data.standartDetails && data.standartDetails.length > 0) {
          // Delete existing standartDetails
          await tx.standartDetail.deleteMany({
            where: { standart_id: id },
          });

          // Create new standartDetails
          await tx.standartDetail.createMany({
            data: data.standartDetails.map((detail) => ({
              standart_id: id,
              service_id: detail.service_id,
              min: detail.min,
              max: detail.max,
              unit: detail.unit,
            })),
          });
        }

        // Return updated standard with relations
        return await tx.standart.findFirst({
          where: { id },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                customer_name: true,
                code: true,
              },
            },
            standartDetails: {
              include: {
                service: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        });
      });

      return RepositoryResult.ok(result);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update standard: ${error.message}`);
    }
  }

  async delete(id: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.standart.update({
        where: { id },
        data: { trash: 1 },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete standard: ${error.message}`);
    }
  }
}
