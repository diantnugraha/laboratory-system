import { PrismaClient } from '@prisma/client';
import {
  IMethodRepository,
  MethodFilter,
  CreateMethodDTO,
  UpdateMethodDTO,
} from '../contracts/IMethodRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Method Repository Implementation (The Worker)
 * Concrete implementation of method data access operations
 */
export class MethodRepository implements IMethodRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: MethodFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { search, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      // Multi-field search on name and code
      const where: any = {
        trash: null,
      };

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { code: { contains: search } },
        ];
      }

      const [data, total] = await Promise.all([
        this.prisma.method.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: {
            matrix: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.method.count({ where }),
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
      return RepositoryResult.fail(`Failed to fetch methods: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const method = await this.prisma.method.findFirst({
        where: { id, trash: null },
        include: {
          matrix: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!method) {
        return RepositoryResult.fail('Method not found');
      }

      return RepositoryResult.ok(method);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch method: ${error.message}`);
    }
  }

  async findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const where: any = {
        name: { equals: name },
        trash: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const method = await this.prisma.method.findFirst({ where });

      return RepositoryResult.ok(method);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check method name: ${error.message}`);
    }
  }

  async findByCode(code: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const where: any = {
        code: { equals: code },
        trash: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const method = await this.prisma.method.findFirst({ where });

      return RepositoryResult.ok(method);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check method code: ${error.message}`);
    }
  }

  async findForAutocomplete(search?: string, dataTable: boolean = false): Promise<RepositoryResult<any>> {
    try {
      // Page size: 20 (standard) or 1000 (dataTable mode)
      const pageSize = dataTable ? 1000 : 20;

      // Multi-field search on name and code
      const where: any = {
        trash: null,
      };

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { code: { contains: search } },
        ];
      }

      const methods = await this.prisma.method.findMany({
        where,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          matrix: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const items = methods.map((method) => ({
        id: method.id,
        code: method.code,
        name: method.name,
        matrix: {
          id: method.matrix.id,
          name: method.matrix.name,
        },
      }));

      const response = {
        total_count: items.length,
        incomplete_results: false,
        ...(dataTable ? { data: items } : { items }),
      };

      return RepositoryResult.ok(response);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch methods for autocomplete: ${error.message}`);
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
          where.created_at.gte = new Date(startDate);
        }
        if (endDate) {
          // Include entire end date (set to 23:59:59)
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          where.created_at.lte = endDateTime;
        }
      }

      const methods = await this.prisma.method.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          matrix: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(methods);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch methods for report: ${error.message}`);
    }
  }

  async generateNextCode(): Promise<RepositoryResult<string>> {
    try {
      const lastMethod = await this.prisma.method.findFirst({
        where: { trash: null },
        orderBy: { code: 'desc' },
        select: { code: true },
      });

      if (!lastMethod || !lastMethod.code) {
        return RepositoryResult.ok('MTD.00001');
      }

      // Parse MTD.XXXXX format
      const match = lastMethod.code.match(/^MTD\.(\d+)$/);
      if (!match) {
        return RepositoryResult.ok('MTD.00001');
      }

      const lastNumber = parseInt(match[1], 10);
      const nextNumber = lastNumber + 1;
      const nextCode = `MTD.${nextNumber.toString().padStart(5, '0')}`;

      return RepositoryResult.ok(nextCode);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to generate code: ${error.message}`);
    }
  }

  handleDocuments(
    existingDocuments: string | null,
    documentsToRemove: string | null,
    newDocument: string | null
  ): string | null {
    // Parse existing documents
    let documents: string[] = existingDocuments ? existingDocuments.split(';;') : [];

    // Remove specified documents
    if (documentsToRemove) {
      const toRemove = documentsToRemove.split(';;').filter((d) => d.trim() !== '');
      documents = documents.filter((doc) => !toRemove.includes(doc));
    }

    // Add new document
    if (newDocument && newDocument.trim() !== '') {
      documents.push(newDocument.trim());
    }

    // Return joined string or null if empty
    return documents.length > 0 ? documents.join(';;') : null;
  }

  async validateMatrixExists(matrixId: number): Promise<RepositoryResult<boolean>> {
    try {
      const matrix = await this.prisma.matrix.findFirst({
        where: { id: matrixId, trash: null },
      });

      return RepositoryResult.ok(!!matrix);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate matrix: ${error.message}`);
    }
  }

  async create(data: CreateMethodDTO, createdBy?: number): Promise<RepositoryResult<any>> {
    try {
      const method = await this.prisma.method.create({
        data: {
          code: data.code,
          name: data.name,
          matrix_id: data.matrix_id,
          category_name: data.category_name || null,
          status: data.status || null,
          description: data.description || null,
          instruction: data.instruction || null,
          method_document: data.method_document || null,
          trash: null,
          created_by: createdBy || null,
          updated_by: null,
        },
        include: {
          matrix: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(method);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create method: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateMethodDTO, updatedBy?: number): Promise<RepositoryResult<any>> {
    try {
      const updateData: any = {};

      if (data.code !== undefined) {
        updateData.code = data.code;
      }
      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.matrix_id !== undefined) {
        updateData.matrix_id = data.matrix_id;
      }
      if (data.category_name !== undefined) {
        updateData.category_name = data.category_name;
      }
      if (data.status !== undefined) {
        updateData.status = data.status;
      }
      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      if (data.instruction !== undefined) {
        updateData.instruction = data.instruction;
      }
      if (data.method_document !== undefined) {
        updateData.method_document = data.method_document;
      }

      // Track who updated
      if (updatedBy) {
        updateData.updated_by = updatedBy;
      }

      const method = await this.prisma.method.update({
        where: { id },
        data: updateData,
        include: {
          matrix: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(method);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update method: ${error.message}`);
    }
  }

  async delete(id: number, updatedBy?: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.method.update({
        where: { id },
        data: {
          trash: 1,
          updated_by: updatedBy || null,
        },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete method: ${error.message}`);
    }
  }
}
