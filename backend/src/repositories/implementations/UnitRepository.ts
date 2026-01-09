import { PrismaClient } from '@prisma/client';
import {
  IUnitRepository,
  UnitFilter,
  CreateUnitDTO,
  UpdateUnitDTO,
} from '../contracts/IUnitRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildSearchCondition } from '../../utils/searchHelper';

/**
 * Unit Repository Implementation (The Worker)
 * Concrete implementation of unit data access operations
 *
 * IMPORTANT: Unit model does NOT have trash field - all operations exclude soft delete logic
 */
export class UnitRepository implements IUnitRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: UnitFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { search, page = 1, limit = 20, lab_id } = filter;
      const skip = (page - 1) * limit;

      // ⚠️ NO trash filter - Unit table doesn't have trash field
      const where: any = {
        ...buildSearchCondition('name', search),
      };

      if (lab_id !== undefined) {
        where.lab_id = lab_id;
      }

      const [data, total] = await Promise.all([
        this.prisma.unit.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: {
            lab: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.unit.count({ where }),
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
      return RepositoryResult.fail(`Failed to fetch units: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      // ⚠️ NO trash filter - Unit table doesn't have trash field
      const unit = await this.prisma.unit.findFirst({
        where: { id },
        include: {
          lab: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!unit) {
        return RepositoryResult.fail('Unit not found');
      }

      return RepositoryResult.ok(unit);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch unit: ${error.message}`);
    }
  }

  async findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      // ⚠️ NO trash filter - Unit table doesn't have trash field
      const where: any = {
        name: { equals: name, mode: 'insensitive' },
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const unit = await this.prisma.unit.findFirst({ where });

      return RepositoryResult.ok(unit);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check unit name: ${error.message}`);
    }
  }

  async findForAutocomplete(
    search?: string,
    labId?: number,
    dataTable: boolean = false
  ): Promise<RepositoryResult<any>> {
    try {
      // Page size: 20 (standard) or 1000 (dataTable mode)
      const pageSize = dataTable ? 1000 : 20;

      // Filter out bizarre domain check from original spec
      const q =
        search && !['lab.tuv-nord.co.id', 'dev.tuv-nord.co.id'].includes(search)
          ? search
          : undefined;

      // ⚠️ NO trash filter - Unit table doesn't have trash field
      const where: any = {
        ...(q && buildSearchCondition('name', q)),
        ...(labId && { lab_id: labId }),
      };

      const units = await this.prisma.unit.findMany({
        where,
        take: pageSize,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
        },
      });

      // FIX BUG: Return actual ID, not name (original PHP bug)
      const items = units.map((unit) => ({
        id: unit.id, // Fixed: was returning name in original PHP
        name: unit.name,
      }));

      const response: any = {
        total_count: items.length,
        incomplete_results: false,
      };

      if (dataTable) {
        response.data = items;
      } else {
        response.items = items;
      }

      return RepositoryResult.ok(response);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch units for autocomplete: ${error.message}`);
    }
  }

  async findAllForReport(): Promise<RepositoryResult<any[]>> {
    try {
      // ⚠️ NO trash filter - Unit table doesn't have trash field
      const units = await this.prisma.unit.findMany({
        orderBy: { id: 'asc' },
        select: {
          name: true,
          description: true,
        },
      });

      return RepositoryResult.ok(units);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch units for report: ${error.message}`);
    }
  }

  async validateLabExists(labId: number): Promise<RepositoryResult<boolean>> {
    try {
      const lab = await this.prisma.lab.findFirst({
        where: { id: labId, trash: null },
      });

      return RepositoryResult.ok(!!lab);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate lab: ${error.message}`);
    }
  }

  async create(data: CreateUnitDTO): Promise<RepositoryResult<any>> {
    try {
      const unit = await this.prisma.unit.create({
        data: {
          name: data.name,
          description: data.description,
          lab_id: data.lab_id !== undefined ? data.lab_id : null,
        },
        include: {
          lab: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(unit);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create unit: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateUnitDTO): Promise<RepositoryResult<any>> {
    try {
      const updateData: any = {};
      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      if (data.lab_id !== undefined) {
        updateData.lab_id = data.lab_id;
      }

      const unit = await this.prisma.unit.update({
        where: { id },
        data: updateData,
        include: {
          lab: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(unit);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update unit: ${error.message}`);
    }
  }

  async delete(id: number): Promise<RepositoryResult<boolean>> {
    try {
      // ⚠️ Hard delete - Unit table doesn't have trash field
      await this.prisma.unit.delete({ where: { id } });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete unit: ${error.message}`);
    }
  }
}
