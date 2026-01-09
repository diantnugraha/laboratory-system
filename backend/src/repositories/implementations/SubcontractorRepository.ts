import { PrismaClient } from '@prisma/client';
import {
  ISubcontractorRepository,
  SubcontractorFilter,
  CreateSubcontractorDTO,
  UpdateSubcontractorDTO,
} from '../contracts/ISubcontractorRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildSearchCondition, checkDuplicateCaseInsensitive } from '../../utils/searchHelper';

/**
 * Subcontractor Repository Implementation (The Worker)
 * Concrete implementation of subcontractor data access operations
 */
export class SubcontractorRepository implements ISubcontractorRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: SubcontractorFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { search, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = {
        trash: null,
        ...buildSearchCondition('lab_name', search),
      };

      const [data, total] = await Promise.all([
        this.prisma.subcontractor.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
        }),
        this.prisma.subcontractor.count({ where }),
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
      return RepositoryResult.fail(`Failed to fetch subcontractors: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const subcontractor = await this.prisma.subcontractor.findFirst({
        where: { id, trash: null },
      });

      if (!subcontractor) {
        return RepositoryResult.fail('Subcontractor not found');
      }

      return RepositoryResult.ok(subcontractor);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch subcontractor: ${error.message}`);
    }
  }

  async findByLabName(labName: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const existing = await checkDuplicateCaseInsensitive(
        this.prisma.subcontractor,
        'lab_name',
        labName,
        excludeId
      );

      return RepositoryResult.ok(existing);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check lab name: ${error.message}`);
    }
  }

  async findForAutocomplete(search?: string): Promise<RepositoryResult<any>> {
    try {
      const where: any = {
        trash: null,
        ...buildSearchCondition('lab_name', search),
      };

      const [items, total] = await Promise.all([
        this.prisma.subcontractor.findMany({
          where,
          select: {
            id: true,
            lab_name: true,
          },
          take: 20,
          orderBy: { lab_name: 'asc' },
        }),
        this.prisma.subcontractor.count({ where }),
      ]);

      // JSON API Response Format
      const response = {
        total_count: total,
        incomplete_results: total > 20,
        items: items.map(item => ({
          id: item.id,
          name: item.lab_name,
        })),
      };

      return RepositoryResult.ok(response);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch subcontractors for autocomplete: ${error.message}`);
    }
  }

  async create(data: CreateSubcontractorDTO): Promise<RepositoryResult<any>> {
    try {
      const subcontractor = await this.prisma.subcontractor.create({
        data: {
          lab_name: data.lab_name,
          address_name: data.address_name,
          phone: data.phone,
          fax: data.fax,
          contact: data.contact,
          email: data.email,
          trash: null,
        },
      });

      return RepositoryResult.ok(subcontractor);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create subcontractor: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateSubcontractorDTO): Promise<RepositoryResult<any>> {
    try {
      const updateData: any = {};

      if (data.lab_name !== undefined) updateData.lab_name = data.lab_name;
      if (data.address_name !== undefined) updateData.address_name = data.address_name;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.fax !== undefined) updateData.fax = data.fax;
      if (data.contact !== undefined) updateData.contact = data.contact;
      if (data.email !== undefined) updateData.email = data.email;

      const subcontractor = await this.prisma.subcontractor.update({
        where: { id },
        data: updateData,
      });

      return RepositoryResult.ok(subcontractor);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update subcontractor: ${error.message}`);
    }
  }

  async delete(id: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.subcontractor.update({
        where: { id },
        data: { trash: 1 },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete subcontractor: ${error.message}`);
    }
  }
}
