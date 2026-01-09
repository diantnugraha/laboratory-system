import { PrismaClient } from '@prisma/client';
import {
  IParameterRepository,
  ParameterFilter,
  CreateParameterDTO,
  UpdateParameterDTO,
} from '../contracts/IParameterRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildSearchCondition } from '../../utils/searchHelper';

/**
 * Parameter Repository Implementation (The Worker)
 * Concrete implementation of parameter data access operations
 */
export class ParameterRepository implements IParameterRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: ParameterFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { search, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where = {
        trash: null,
        ...buildSearchCondition('name', search),
      };

      const [data, total] = await Promise.all([
        this.prisma.parameter.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          include: {
            lab: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.parameter.count({ where }),
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
      return RepositoryResult.fail(`Failed to fetch parameters: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const parameter = await this.prisma.parameter.findFirst({
        where: { id, trash: null },
        include: {
          lab: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!parameter) {
        return RepositoryResult.fail('Parameter not found');
      }

      return RepositoryResult.ok(parameter);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch parameter: ${error.message}`);
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

      const parameter = await this.prisma.parameter.findFirst({ where });

      return RepositoryResult.ok(parameter);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check parameter name: ${error.message}`);
    }
  }

  async findForAutocomplete(search?: string, dataTable: boolean = false): Promise<RepositoryResult<any>> {
    try {
      // Page size: 20 (standard) or 1000 (dataTable mode)
      const pageSize = dataTable ? 1000 : 20;

      const where = {
        trash: null,
        ...buildSearchCondition('name', search),
      };

      const parameters = await this.prisma.parameter.findMany({
        where,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          lab: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const items = parameters.map((parameter) => ({
        id: parameter.id,
        name: parameter.name,
        lab: {
          id: parameter.lab.id,
          name: parameter.lab.name,
        },
      }));

      const response = {
        total_count: items.length,
        incomplete_results: false,
        ...(dataTable ? { data: items } : { items }),
      };

      return RepositoryResult.ok(response);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch parameters for autocomplete: ${error.message}`);
    }
  }

  async findAllForReport(): Promise<RepositoryResult<any[]>> {
    try {
      const parameters = await this.prisma.parameter.findMany({
        where: { trash: null },
        orderBy: { name: 'asc' },
        include: {
          lab: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(parameters);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch parameters for report: ${error.message}`);
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

  async create(data: CreateParameterDTO): Promise<RepositoryResult<any>> {
    try {
      const parameter = await this.prisma.parameter.create({
        data: {
          name: data.name,
          lab_id: data.lab_id,
          trash: null,
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

      return RepositoryResult.ok(parameter);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create parameter: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateParameterDTO): Promise<RepositoryResult<any>> {
    try {
      const updateData: any = {};
      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.lab_id !== undefined) {
        updateData.lab_id = data.lab_id;
      }

      const parameter = await this.prisma.parameter.update({
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

      return RepositoryResult.ok(parameter);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update parameter: ${error.message}`);
    }
  }

  async delete(id: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.parameter.update({
        where: { id },
        data: { trash: 1 },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete parameter: ${error.message}`);
    }
  }
}
