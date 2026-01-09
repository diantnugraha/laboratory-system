import { PrismaClient } from '@prisma/client';
import {
  IPackageRepository,
  PackageFilter,
  CreatePackageDTO,
  UpdatePackageDTO,
} from '../contracts/IPackageRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildMultiFieldSearchCondition, checkDuplicateCaseInsensitive } from '../../utils/searchHelper';

/**
 * Package Repository Implementation (The Worker)
 * Concrete implementation of package data access operations
 */
export class PackageRepository implements IPackageRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: PackageFilter): Promise<RepositoryResult<PaginatedData<any> | any>> {
    try {
      const { search, page = 1, limit = 20, select = false } = filter;

      const where: any = {
        trash: null,
        ...buildMultiFieldSearchCondition(['name', 'code'], search),
      };

      // Select mode: simplified data for dropdown/select
      if (select) {
        const packages = await (this.prisma as any).package.findMany({
          where,
          select: {
            id: true,
            code: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        });

        return RepositoryResult.ok(packages);
      }

      // Standard mode: full data with pagination
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        (this.prisma as any).package.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                code: true,
                customer_name: true,
              },
            },
          },
        }),
        (this.prisma as any).package.count({ where }),
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
      return RepositoryResult.fail(`Failed to fetch packages: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const packageData = await (this.prisma as any).package.findFirst({
        where: { id, trash: null },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
            },
          },
        },
      });

      if (!packageData) {
        return RepositoryResult.fail('Package not found');
      }

      return RepositoryResult.ok(packageData);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch package: ${error.message}`);
    }
  }

  async findByCode(code: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const existing = await checkDuplicateCaseInsensitive(
        (this.prisma as any).package,
        'code',
        code,
        excludeId
      );

      return RepositoryResult.ok(existing);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check package code: ${error.message}`);
    }
  }

  async findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const existing = await checkDuplicateCaseInsensitive(
        (this.prisma as any).package,
        'name',
        name,
        excludeId
      );

      return RepositoryResult.ok(existing);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check package name: ${error.message}`);
    }
  }

  async findForJson(filter: PackageFilter): Promise<RepositoryResult<any[]>> {
    try {
      const { search, groupOnly = false } = filter;

      const where: any = {
        trash: null,
        ...buildMultiFieldSearchCondition(['name', 'code'], search),
      };

      if (groupOnly) {
        where.group = 1;
      }

      const packages = await (this.prisma as any).package.findMany({
        where,
        take: filter.limit,
        orderBy: { name: 'asc' },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(packages);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch packages for JSON: ${error.message}`);
    }
  }

  async create(data: CreatePackageDTO): Promise<RepositoryResult<any>> {
    try {
      const packageData = await this.prisma.$transaction(async (tx: any) => {
        return await (tx as any).package.create({
          data: {
            code: data.code,
            name: data.name,
            description: data.description ?? null,
            totalPrice: data.totalPrice,
            promotionFrom: data.promotionFrom ?? null,
            promotionTo: data.promotionTo ?? null,
            percentDiscount: data.percentDiscount ?? 0,
            listService: data.listService,
            customerId: data.customerId ?? null,
            group: data.group,
            createdBy: data.createdBy ?? null,
            trash: null,
          },
          include: {
            customer: {
              select: {
                id: true,
                code: true,
                customer_name: true,
              },
            },
          },
        });
      });

      return RepositoryResult.ok(packageData);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create package: ${error.message}`);
    }
  }

  async update(id: number, data: UpdatePackageDTO): Promise<RepositoryResult<any>> {
    try {
      const updateData: any = {};

      if (data.code !== undefined) updateData.code = data.code;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.totalPrice !== undefined) updateData.totalPrice = data.totalPrice;
      if (data.promotionFrom !== undefined) updateData.promotionFrom = data.promotionFrom;
      if (data.promotionTo !== undefined) updateData.promotionTo = data.promotionTo;
      if (data.percentDiscount !== undefined) updateData.percentDiscount = data.percentDiscount;
      if (data.listService !== undefined) updateData.listService = data.listService;
      if (data.customerId !== undefined) updateData.customerId = data.customerId;
      if (data.group !== undefined) updateData.group = data.group;
      if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

      const packageData = await (this.prisma as any).package.update({
        where: { id },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(packageData);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update package: ${error.message}`);
    }
  }

  async delete(id: number): Promise<RepositoryResult<boolean>> {
    try {
      await (this.prisma as any).package.update({
        where: { id },
        data: { trash: 1 },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete package: ${error.message}`);
    }
  }
}
