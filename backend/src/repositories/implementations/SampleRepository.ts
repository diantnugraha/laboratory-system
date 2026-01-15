import { PrismaClient } from '@prisma/client';
import {
  ISampleRepository,
  SampleFilter,
  CreateSampleDTO,
  UpdateSampleDTO,
  SampleWithRelations,
  SampleStatus,
  SampleStatusType,
  STATUS_PRIORITY,
} from '../contracts/ISampleRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildMultiFieldSearchCondition } from '../../utils/searchHelper';

/**
 * Sample Repository Implementation
 * Concrete implementation of sample data access operations
 */
export class SampleRepository implements ISampleRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: SampleFilter): Promise<RepositoryResult<PaginatedData<SampleWithRelations>>> {
    try {
      const { search, orderId, customerId, status, dateFrom, dateTo, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = { trash: null };

      // Multi-field search on code and name
      if (search) {
        Object.assign(where, buildMultiFieldSearchCondition(['code', 'name'], search));
      }

      // Filter by order
      if (orderId) {
        where.order_id = orderId;
      }

      // Filter by customer (through order)
      if (customerId) {
        where.order = { customer_id: customerId };
      }

      // Filter by status
      if (status) {
        if (Array.isArray(status)) {
          where.status = { in: status };
        } else {
          where.status = status;
        }
      }

      // Filter by date range
      if (dateFrom) {
        where.received_date = { ...where.received_date, gte: dateFrom };
      }
      if (dateTo) {
        where.received_date = { ...where.received_date, lte: dateTo };
      }

      // Customer role filter
      if (filter.userRole === 8 && filter.userCustomerId) {
        where.order = { ...where.order, customer_id: filter.userCustomerId };
      }

      const [data, total] = await Promise.all([
        this.prisma.sample.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: {
            order: {
              select: {
                id: true,
                code: true,
                status: true,
                priority: true,
                customer: {
                  select: {
                    id: true,
                    code: true,
                    customer_name: true,
                  },
                },
              },
            },
            standart: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            _count: {
              select: { worksheets: true },
            },
          },
        }),
        this.prisma.sample.count({ where }),
      ]);

      return RepositoryResult.ok({
        data: data as unknown as SampleWithRelations[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch samples: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<SampleWithRelations | null>> {
    try {
      const sample = await this.prisma.sample.findFirst({
        where: { id, trash: null },
        include: {
          order: {
            select: {
              id: true,
              code: true,
              status: true,
              priority: true,
              customer: {
                select: {
                  id: true,
                  code: true,
                  customer_name: true,
                },
              },
            },
          },
          standart: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          _count: {
            select: { worksheets: true },
          },
        },
      });

      if (!sample) {
        return RepositoryResult.fail('Sample not found');
      }

      return RepositoryResult.ok(sample as unknown as SampleWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch sample: ${error.message}`);
    }
  }

  async findByCode(code: string, excludeId?: number): Promise<RepositoryResult<SampleWithRelations | null>> {
    try {
      const where: any = {
        code: { equals: code, mode: 'insensitive' },
        trash: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const sample = await this.prisma.sample.findFirst({
        where,
        include: {
          order: {
            select: {
              id: true,
              code: true,
              status: true,
              priority: true,
              customer: {
                select: {
                  id: true,
                  code: true,
                  customer_name: true,
                },
              },
            },
          },
        },
      });

      return RepositoryResult.ok(sample as unknown as SampleWithRelations | null);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to find sample by code: ${error.message}`);
    }
  }

  async findForAutocomplete(search?: string, orderId?: number): Promise<RepositoryResult<any[]>> {
    try {
      const where: any = { trash: null };

      if (search) {
        Object.assign(where, buildMultiFieldSearchCondition(['code', 'name'], search));
      }

      if (orderId) {
        where.order_id = orderId;
      }

      const samples = await this.prisma.sample.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          order: {
            select: {
              id: true,
              code: true,
              customer: {
                select: {
                  id: true,
                  customer_name: true,
                },
              },
            },
          },
        },
        orderBy: { id: 'desc' },
        take: 20,
      });

      return RepositoryResult.ok(samples);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch samples for autocomplete: ${error.message}`);
    }
  }

  async findByOrderId(orderId: number): Promise<RepositoryResult<SampleWithRelations[]>> {
    try {
      const samples = await this.prisma.sample.findMany({
        where: {
          order_id: orderId,
          trash: null,
        },
        include: {
          order: {
            select: {
              id: true,
              code: true,
              status: true,
              priority: true,
              customer: {
                select: {
                  id: true,
                  code: true,
                  customer_name: true,
                },
              },
            },
          },
          standart: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          _count: {
            select: { worksheets: true },
          },
        },
        orderBy: { id: 'asc' },
      });

      return RepositoryResult.ok(samples as unknown as SampleWithRelations[]);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch samples by order: ${error.message}`);
    }
  }

  async updateStatus(id: number, status: string, userId: number): Promise<RepositoryResult<SampleWithRelations>> {
    try {
      const updateData: any = {
        status,
        updated_by: userId,
      };

      // Set analysis_finished_date when approved
      if (status === SampleStatus.APPROVED_BY_TM) {
        updateData.analysis_finished_date = new Date();
      }

      const sample = await this.prisma.sample.update({
        where: { id },
        data: updateData,
        include: {
          order: {
            select: {
              id: true,
              code: true,
              status: true,
              priority: true,
              customer: {
                select: {
                  id: true,
                  code: true,
                  customer_name: true,
                },
              },
            },
          },
        },
      });

      return RepositoryResult.ok(sample as unknown as SampleWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update sample status: ${error.message}`);
    }
  }

  async recalculateStatusFromWorksheets(sampleId: number): Promise<RepositoryResult<string>> {
    try {
      const worksheets = await this.prisma.worksheet.findMany({
        where: {
          sample_id: sampleId,
          trash: null,
          non_parameter: null,
        },
        select: { status: true },
      });

      if (worksheets.length === 0) {
        return RepositoryResult.ok(SampleStatus.PROCESS);
      }

      // Find worst status (lowest priority number)
      let worstPriority = 7; // Start with best (Approved by TM)
      let worstStatus: SampleStatusType = SampleStatus.APPROVED_BY_TM;

      for (const ws of worksheets) {
        const priority = STATUS_PRIORITY[ws.status] ?? 4;
        if (priority < worstPriority) {
          worstPriority = priority;
          worstStatus = ws.status as SampleStatusType;
        }
      }

      return RepositoryResult.ok(worstStatus);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to recalculate sample status: ${error.message}`);
    }
  }

  async checkAllWorksheetsVerified(sampleId: number): Promise<RepositoryResult<boolean>> {
    try {
      const pendingCount = await this.prisma.worksheet.count({
        where: {
          sample_id: sampleId,
          trash: null,
          non_parameter: null,
          status: {
            in: ['Process', 'To Be Verified', 'Need to Revised'],
          },
        },
      });

      return RepositoryResult.ok(pendingCount === 0);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check worksheets verified: ${error.message}`);
    }
  }

  async checkAllWorksheetsApproved(sampleId: number): Promise<RepositoryResult<boolean>> {
    try {
      const [totalCount, approvedCount] = await Promise.all([
        this.prisma.worksheet.count({
          where: {
            sample_id: sampleId,
            trash: null,
            non_parameter: null,
          },
        }),
        this.prisma.worksheet.count({
          where: {
            sample_id: sampleId,
            trash: null,
            non_parameter: null,
            status: 'Approved by TM',
          },
        }),
      ]);

      return RepositoryResult.ok(totalCount > 0 && totalCount === approvedCount);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check worksheets approved: ${error.message}`);
    }
  }

  async create(data: CreateSampleDTO): Promise<RepositoryResult<SampleWithRelations>> {
    try {
      const sample = await this.prisma.sample.create({
        data: {
          code: data.code,
          order_id: data.orderId,
          standart_id: data.standartId,
          name: data.name,
          description: data.description,
          sample_type: data.sampleType,
          sample_condition: data.sampleCondition,
          sampling_date: data.samplingDate,
          received_date: data.receivedDate,
          quantity: data.quantity ?? 1,
          unit: data.unit,
          status: data.status,
          due_date: data.dueDate,
          coa_release_due_date: data.coaReleaseDueDate,
          created_by: data.createdBy,
        },
        include: {
          order: {
            select: {
              id: true,
              code: true,
              status: true,
              priority: true,
              customer: {
                select: {
                  id: true,
                  code: true,
                  customer_name: true,
                },
              },
            },
          },
          standart: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(sample as unknown as SampleWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create sample: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateSampleDTO): Promise<RepositoryResult<SampleWithRelations>> {
    try {
      const updateData: any = {
        updated_by: data.updatedBy,
      };

      // Only update fields that are provided
      if (data.standartId !== undefined) updateData.standart_id = data.standartId;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.sampleType !== undefined) updateData.sample_type = data.sampleType;
      if (data.sampleCondition !== undefined) updateData.sample_condition = data.sampleCondition;
      if (data.samplingDate !== undefined) updateData.sampling_date = data.samplingDate;
      if (data.receivedDate !== undefined) updateData.received_date = data.receivedDate;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.dueDate !== undefined) updateData.due_date = data.dueDate;
      if (data.coaReleaseDueDate !== undefined) updateData.coa_release_due_date = data.coaReleaseDueDate;
      if (data.analysisFinishedDate !== undefined) updateData.analysis_finished_date = data.analysisFinishedDate;
      if (data.leadTime !== undefined) updateData.lead_time = data.leadTime;

      const sample = await this.prisma.sample.update({
        where: { id },
        data: updateData,
        include: {
          order: {
            select: {
              id: true,
              code: true,
              status: true,
              priority: true,
              customer: {
                select: {
                  id: true,
                  code: true,
                  customer_name: true,
                },
              },
            },
          },
          standart: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(sample as unknown as SampleWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update sample: ${error.message}`);
    }
  }

  async delete(id: number, userId: number): Promise<RepositoryResult<boolean>> {
    try {
      // Check if sample has worksheets
      const worksheetCount = await this.prisma.worksheet.count({
        where: { sample_id: id, trash: null },
      });

      if (worksheetCount > 0) {
        return RepositoryResult.fail(`Cannot delete sample with ${worksheetCount} worksheet(s). Delete worksheets first.`);
      }

      await this.prisma.sample.update({
        where: { id },
        data: {
          trash: 1,
          updated_by: userId,
        },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete sample: ${error.message}`);
    }
  }

  async generateCode(): Promise<RepositoryResult<string>> {
    try {
      const now = new Date();
      const yearMonth = now.toISOString().slice(2, 4) + (now.getMonth() + 1).toString().padStart(2, '0');
      const prefix = `SAM${yearMonth}`;

      const lastSample = await this.prisma.sample.findFirst({
        where: {
          code: { startsWith: prefix },
        },
        orderBy: { code: 'desc' },
        select: { code: true },
      });

      let sequence = 1;
      if (lastSample?.code) {
        const lastSequence = parseInt(lastSample.code.slice(-7), 10);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }

      const code = `${prefix}${sequence.toString().padStart(7, '0')}`;
      return RepositoryResult.ok(code);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to generate sample code: ${error.message}`);
    }
  }

  async saveAnalystType(sampleId: number, analystTypeId: number): Promise<RepositoryResult<boolean>> {
    try {
      // Upsert - create if not exists, do nothing if exists
      await this.prisma.sampleAnalyst.upsert({
        where: {
          sample_id_analyst_type_id: {
            sample_id: sampleId,
            analyst_type_id: analystTypeId,
          },
        },
        update: {},
        create: {
          sample_id: sampleId,
          analyst_type_id: analystTypeId,
          status: 'Pending',
        },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to save analyst type: ${error.message}`);
    }
  }

  async getAnalystTypes(sampleId: number): Promise<RepositoryResult<number[]>> {
    try {
      const sampleAnalysts = await this.prisma.sampleAnalyst.findMany({
        where: { sample_id: sampleId },
        select: { analyst_type_id: true },
      });

      return RepositoryResult.ok(sampleAnalysts.map(sa => sa.analyst_type_id));
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to get analyst types: ${error.message}`);
    }
  }
}
