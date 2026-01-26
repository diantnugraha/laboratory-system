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
  ApproveSampleOptions,
  SampleApprovalResult,
  SampleCancellationResult,
  ReceiveSampleDTO,
  SampleDashboardFilter,
  SampleDashboardItem,
  SampleReportFilter,
  SampleReportData,
} from '../contracts/ISampleRepository.js';
import {
  COA_STATUS,
  COA_STATUSES_FOR_ECOA_DRAFT,
  AUTO_PUBLISH_DELAY_HOURS,
  SAMPLE_STATUS,
} from '../../config/sample.js';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult.js';
import { buildMultiFieldSearchCondition } from '../../utils/searchHelper.js';

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
          where.sample_status = { in: status };
        } else {
          where.sample_status = status;
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
                order_status: true,
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
              order_status: true,
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

      if (!sample) {
        return RepositoryResult.fail('Sample not found');
      }

      return RepositoryResult.ok(sample as unknown as SampleWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch sample: ${error.message}`);
    }
  }

  /**
   * Find sample by ID with detailed information including worksheets
   * Used for Sample Detail page
   */
  async findByIdWithDetails(id: number): Promise<RepositoryResult<any>> {
    try {
      const sample = await this.prisma.sample.findFirst({
        where: { id, trash: null },
        include: {
          order: {
            select: {
              id: true,
              code: true,
              order_status: true,
              order_priority: true,
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
          worksheet: {
            where: { trash: null },
            include: {
              service: {
                select: {
                  id: true,
                  code: true,
                  unit: true,
                  parameter: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  method: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              package: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
      });

      if (!sample) {
        return RepositoryResult.fail('Sample not found');
      }

      // Calculate worksheet progress
      const worksheets = sample.worksheet || [];
      const completedStatuses = ['Verified by QC', 'Approved by TM'];
      const completedCount = worksheets.filter((ws: any) =>
        completedStatuses.includes(ws.status)
      ).length;

      // Get analyst names for worksheets
      const analystIds = [...new Set(worksheets.filter((ws: any) => ws.analyst_id).map((ws: any) => ws.analyst_id))];
      const analysts = analystIds.length > 0
        ? await this.prisma.users.findMany({
            where: { id: { in: analystIds } },
            select: { id: true, display_name: true },
          })
        : [];
      const analystMap = new Map(analysts.map(a => [a.id, a.display_name]));

      // Get min/max values from standart_detail if sample has a standard
      let standartDetailMap = new Map<number, { min: string; max: string }>();
      if (sample.standart_id) {
        const serviceIds = worksheets.map((ws: any) => ws.service_id);
        const standartDetails = await this.prisma.standartDetail.findMany({
          where: {
            standart_id: sample.standart_id,
            service_id: { in: serviceIds },
          },
          select: {
            service_id: true,
            min: true,
            max: true,
          },
        });
        standartDetailMap = new Map(standartDetails.map(sd => [sd.service_id, { min: sd.min, max: sd.max }]));
      }

      // Transform to detail response
      const result = {
        id: sample.id,
        code: sample.code,
        name: sample.name,
        description: sample.description,
        volume: sample.volume,
        sampleStorage: sample.sample_storage,
        quantity: sample.quantity,
        priority: sample.priority,
        sampleStatus: sample.sample_status,
        leadTime: sample.lead_time,
        verificationStatusMicro: sample.verification_status_micro,
        verificationStatusChem: sample.verification_status_chem,
        receivedDate: sample.received_date,
        dueDate: sample.due_date,
        coaReleaseDueDate: sample.coa_release_due_date,
        analysisFinishedDate: sample.analysis_finished_date,
        coaReleasedDate: sample.coa_released_date,
        retainDate: sample.retain_date,
        resultSummary: sample.result_summary,
        price: sample.price,
        discount: sample.discount,
        standardId: sample.standart_id,
        standardName: sample.standart?.name || null,
        standardCode: sample.standart?.code || null,
        order: {
          id: sample.order.id,
          code: sample.order.code,
          status: sample.order.order_status,
          priority: sample.order.order_priority,
          customerName: sample.order.customer?.customer_name || null,
        },
        worksheets: worksheets.map((ws: any) => {
          const standartDetail = standartDetailMap.get(ws.service_id);
          return {
            id: ws.id,
            code: ws.code,
            status: ws.status,
            result: ws.result,
            unit: ws.unit || ws.service?.unit || null,
            parameter: ws.service?.parameter?.name || '',
            method: ws.service?.method?.name || '',
            packageId: ws.package_id,
            packageName: ws.package?.name || null,
            finishDate: ws.finish_date,
            min: standartDetail?.min || null,
            max: standartDetail?.max || null,
            analystId: ws.analyst_id,
            analystName: ws.analyst_id ? analystMap.get(ws.analyst_id) || null : null,
            dueDate: sample.due_date,
          };
        }),
        worksheetProgress: {
          completed: completedCount,
          total: worksheets.length,
        },
        createdAt: sample.created_at,
        updatedAt: sample.updated_at,
      };

      return RepositoryResult.ok(result);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch sample details: ${error.message}`);
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
              order_status: true,
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
          sample_status: true,
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
              order_status: true,
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
        sample_status: status,
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
              order_status: true,
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
          volume: data.volume,
          sample_storage: data.sampleStorage,
          received_date: data.receivedDate,
          quantity: data.quantity ?? 1,
          sample_status: data.status ?? 'Process',
          priority: data.priority ?? 'Normal',
          due_date: data.dueDate,
          coa_release_due_date: data.coaReleaseDueDate,
          created_by: data.createdBy,
          created_at: new Date(),
        },
        include: {
          order: {
            select: {
              id: true,
              code: true,
              order_status: true,
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
      if (data.volume !== undefined) updateData.volume = data.volume;
      if (data.sampleStorage !== undefined) updateData.sample_storage = data.sampleStorage;
      if (data.receivedDate !== undefined) updateData.received_date = data.receivedDate;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.status !== undefined) updateData.sample_status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
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
              order_status: true,
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
          sample_id_analyst_type: {
            sample_id: sampleId,
            analyst_type: analystTypeId,
          },
        },
        update: {},
        create: {
          sample_id: sampleId,
          analyst_type: analystTypeId,
          created_by: 0, // Will be overwritten by actual user in controller
          created_at: new Date(),
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
        select: { analyst_type: true },
      });

      return RepositoryResult.ok(sampleAnalysts.map(sa => sa.analyst_type));
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to get analyst types: ${error.message}`);
    }
  }

  // ===== Workflow Operations =====

  async approveSample(
    id: number,
    userId: number,
    options?: ApproveSampleOptions
  ): Promise<RepositoryResult<SampleApprovalResult>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Get sample with order
        const sample = await tx.sample.findFirst({
          where: { id, trash: null },
          include: {
            order: {
              include: {
                customer: true,
              },
            },
          },
        });

        if (!sample) {
          throw new Error('Sample not found');
        }

        // Check if sample can be approved
        if (sample.sample_status !== SAMPLE_STATUS.VERIFIED_BY_QC) {
          throw new Error(`Cannot approve sample with status: ${sample.sample_status}`);
        }

        // Check if all worksheets are verified
        const pendingWorksheets = await tx.worksheet.count({
          where: {
            sample_id: id,
            trash: null,
            non_parameter: null,
            status: { notIn: ['Verified by QC', 'Approved by TM', 'Cancel'] },
          },
        });

        if (pendingWorksheets > 0) {
          throw new Error(`Cannot approve: ${pendingWorksheets} worksheet(s) not yet verified`);
        }

        // Check for existing COA with specific statuses
        const existingCoa = await tx.coa.findFirst({
          where: {
            sample_id: id,
            trash: null,
            status: { in: COA_STATUSES_FOR_ECOA_DRAFT as unknown as string[] },
          },
        });

        let newStatus: string = SAMPLE_STATUS.APPROVED_BY_TM;
        let autoPublishDate: Date | null = null;
        let coaCreated = false;
        let coaCode: string | undefined;
        let coaId: number | undefined;
        let orderStatusUpdated = false;

        // If COA exists with specific status, set ECOA Draft Sent
        if (existingCoa) {
          newStatus = SAMPLE_STATUS.ECOA_DRAFT_SENT;
          autoPublishDate = new Date(Date.now() + AUTO_PUBLISH_DELAY_HOURS * 60 * 60 * 1000);

          // Update COA status
          await tx.coa.update({
            where: { id: existingCoa.id },
            data: {
              status: COA_STATUS.DRAFT_SENT,
              updated_by: userId,
            },
          });

          coaCode = existingCoa.code ?? undefined;
          coaId = existingCoa.id;

          // Update order status
          await tx.order.update({
            where: { id: sample.order_id },
            data: {
              order_status: 'ECOA Draft Sent',
              updated_by: userId,
            },
          });
          orderStatusUpdated = true;
        }

        // Update sample
        const updatedSample = await tx.sample.update({
          where: { id },
          data: {
            sample_status: newStatus,
            analysis_finished_date: new Date(),
            auto_publish_date: autoPublishDate,
            result_summary: options?.resultSummary,
            updated_by: userId,
          },
          include: {
            order: {
              select: {
                id: true,
                code: true,
                order_status: true,
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

        // Update worksheets to Approved by TM
        await tx.worksheet.updateMany({
          where: {
            sample_id: id,
            trash: null,
            non_parameter: null,
            status: 'Verified by QC',
          },
          data: {
            status: 'Approved by TM',
            updated_by: userId,
          },
        });

        return RepositoryResult.ok({
          sample: updatedSample as unknown as SampleWithRelations,
          coaCreated,
          coaCode,
          coaId,
          autoPublishDate: autoPublishDate ?? undefined,
          orderStatusUpdated,
        });
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to approve sample: ${error.message}`);
    }
  }

  async verifySample(
    id: number,
    userId: number,
    analystTypeIds: number[]
  ): Promise<RepositoryResult<SampleWithRelations>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Get sample
        const sample = await tx.sample.findFirst({
          where: { id, trash: null },
        });

        if (!sample) {
          throw new Error('Sample not found');
        }

        // Update worksheets matching analyst type to Verified by QC
        await tx.worksheet.updateMany({
          where: {
            sample_id: id,
            trash: null,
            non_parameter: null,
            status: 'To Be Verified',
            result: { not: null },
            service: {
              analyst_type_id: { in: analystTypeIds },
            },
          },
          data: {
            status: 'Verified by QC',
            qc_id: userId,
            verify_qc_date: new Date(),
            updated_by: userId,
          },
        });

        // Check verification status by analyst type (micro vs chem)
        const MICRO_TYPE_ID = 17; // Microbiology analyst type
        const hasMicroAuth = analystTypeIds.includes(MICRO_TYPE_ID);
        const hasChemAuth = analystTypeIds.some(id => id !== MICRO_TYPE_ID);

        // Update verification flags
        const verificationUpdate: any = {
          updated_by: userId,
        };

        if (hasMicroAuth) {
          // Check if all micro worksheets are verified
          const pendingMicro = await tx.worksheet.count({
            where: {
              sample_id: id,
              trash: null,
              non_parameter: null,
              status: { notIn: ['Verified by QC', 'Approved by TM', 'Cancel'] },
              service: { analyst_type_id: MICRO_TYPE_ID },
            },
          });
          if (pendingMicro === 0) {
            verificationUpdate.verification_status_micro = 1;
          }
        }

        if (hasChemAuth) {
          // Check if all chem worksheets are verified
          const pendingChem = await tx.worksheet.count({
            where: {
              sample_id: id,
              trash: null,
              non_parameter: null,
              status: { notIn: ['Verified by QC', 'Approved by TM', 'Cancel'] },
              service: { analyst_type_id: { not: MICRO_TYPE_ID } },
            },
          });
          if (pendingChem === 0) {
            verificationUpdate.verification_status_chem = 1;
          }
        }

        // Check if all worksheets are now verified
        const pendingWorksheets = await tx.worksheet.count({
          where: {
            sample_id: id,
            trash: null,
            non_parameter: null,
            status: { notIn: ['Verified by QC', 'Approved by TM', 'Cancel'] },
          },
        });

        if (pendingWorksheets === 0) {
          verificationUpdate.sample_status = SAMPLE_STATUS.VERIFIED_BY_QC;
        }

        // Update sample
        const updatedSample = await tx.sample.update({
          where: { id },
          data: verificationUpdate,
          include: {
            order: {
              select: {
                id: true,
                code: true,
                order_status: true,
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

        return RepositoryResult.ok(updatedSample as unknown as SampleWithRelations);
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to verify sample: ${error.message}`);
    }
  }

  async cancelSample(
    id: number,
    userId: number,
    _reason?: string
  ): Promise<RepositoryResult<SampleCancellationResult>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Get sample
        const sample = await tx.sample.findFirst({
          where: { id, trash: null },
          include: {
            order: {
              select: {
                id: true,
                code: true,
                order_status: true,
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

        if (!sample) {
          throw new Error('Sample not found');
        }

        // Update sample status to Cancel
        await tx.sample.update({
          where: { id },
          data: {
            sample_status: SAMPLE_STATUS.CANCEL,
            updated_by: userId,
          },
        });

        // Cancel all worksheets
        const worksheetUpdateResult = await tx.worksheet.updateMany({
          where: {
            sample_id: id,
            trash: null,
          },
          data: {
            status: 'Cancel',
            updated_by: userId,
          },
        });

        // Check if all samples in order are cancelled
        const activeSamples = await tx.sample.findMany({
          where: {
            order_id: sample.order_id,
            trash: null,
            sample_status: { not: SAMPLE_STATUS.CANCEL },
          },
        });

        let orderTrashed = false;

        if (activeSamples.length === 0) {
          // All samples cancelled, trash the order
          await tx.order.update({
            where: { id: sample.order_id },
            data: {
              trash: 1,
              updated_by: userId,
            },
          });
          orderTrashed = true;
        }

        // Fetch updated sample
        const updatedSample = await tx.sample.findFirst({
          where: { id },
          include: {
            order: {
              select: {
                id: true,
                code: true,
                order_status: true,
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

        return RepositoryResult.ok({
          sample: updatedSample as unknown as SampleWithRelations,
          worksheetsCancelled: worksheetUpdateResult.count,
          orderTrashed,
        });
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to cancel sample: ${error.message}`);
    }
  }

  async receiveSample(
    id: number,
    data: ReceiveSampleDTO,
    userId: number
  ): Promise<RepositoryResult<SampleWithRelations>> {
    try {
      const updateData: any = {
        received_date: data.receivedDate,
        due_date: data.dueDate,
        coa_release_due_date: data.coaReleaseDueDate,
        updated_by: userId,
      };

      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.quantity) updateData.quantity = data.quantity;

      const sample = await this.prisma.sample.update({
        where: { id },
        data: updateData,
        include: {
          order: {
            select: {
              id: true,
              code: true,
              order_status: true,
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
      return RepositoryResult.fail(`Failed to receive sample: ${error.message}`);
    }
  }

  // ===== Dashboard Queries =====

  private async buildDashboardQuery(
    filter: SampleDashboardFilter,
    additionalWhere: any = {}
  ): Promise<RepositoryResult<PaginatedData<SampleDashboardItem>>> {
    try {
      const { page = 1, limit = 20, search, orderId, customerId, status, orderBy, sortDir } = filter;
      const skip = (page - 1) * limit;

      const where: any = {
        trash: null,
        ...additionalWhere,
      };

      // Search filter
      if (search) {
        Object.assign(where, buildMultiFieldSearchCondition(['code', 'name'], search));
      }

      // Order filter
      if (orderId) {
        where.order_id = orderId;
      }

      // Customer filter
      if (customerId) {
        where.order = { ...where.order, customer_id: customerId };
      }

      // Status filter
      if (status) {
        if (Array.isArray(status)) {
          where.sample_status = { in: status };
        } else {
          where.sample_status = status;
        }
      }

      // Role-based filter
      if (filter.userRole === 8 && filter.userCustomerId) {
        where.order = { ...where.order, customer_id: filter.userCustomerId };
      }

      // Build order by
      const orderByClause: any = {};
      if (orderBy) {
        orderByClause[orderBy] = sortDir || 'desc';
      } else {
        orderByClause.coa_release_due_date = 'asc';
      }

      const [data, total] = await Promise.all([
        this.prisma.sample.findMany({
          where,
          skip,
          take: limit,
          orderBy: orderByClause,
          include: {
            order: {
              select: {
                id: true,
                code: true,
                order_status: true,
                priority: true,
                payment_document: true,
                payment_date: true,
                customer: {
                  select: {
                    id: true,
                    code: true,
                    customer_name: true,
                    special_customer: true,
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
        }),
        this.prisma.sample.count({ where }),
      ]);

      // Get COA info if requested
      let coaMap = new Map<number, any>();
      if (filter.includeCoa) {
        const sampleIds = data.map(s => s.id);
        const coas = await this.prisma.coa.findMany({
          where: {
            sample_id: { in: sampleIds },
            trash: null,
          },
          select: {
            id: true,
            code: true,
            status: true,
            published_date: true,
            sample_id: true,
          },
          orderBy: { id: 'desc' },
        });

        // Group by sample_id, take latest
        for (const coa of coas) {
          if (!coaMap.has(coa.sample_id)) {
            coaMap.set(coa.sample_id, coa);
          }
        }
      }

      // Transform to dashboard items
      const items: SampleDashboardItem[] = data.map(sample => {
        const coa = coaMap.get(sample.id);
        const now = new Date();
        const dueDate = sample.coa_release_due_date;
        let remainingTime = '';
        let isOverdue = false;

        if (dueDate) {
          const diff = dueDate.getTime() - now.getTime();
          const days = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
          const hours = Math.floor((Math.abs(diff) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          isOverdue = diff < 0;
          remainingTime = isOverdue ? `(( ${days}d, ${hours}hr ))` : `${days}d, ${hours}hr`;
        }

        return {
          ...sample,
          orderId: sample.order_id,
          standartId: sample.standart_id,
          sampleStatus: sample.sample_status,
          receivedDate: sample.received_date,
          dueDate: sample.due_date,
          coaReleaseDueDate: sample.coa_release_due_date,
          analysisFinishedDate: sample.analysis_finished_date,
          leadTime: sample.lead_time,
          createdAt: sample.created_at,
          updatedAt: sample.updated_at,
          coa: coa ? {
            id: coa.id,
            code: coa.code,
            status: coa.status,
            publishedDate: coa.published_date,
          } : null,
          remainingTime,
          isOverdue,
        } as unknown as SampleDashboardItem;
      });

      return RepositoryResult.ok({
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch dashboard samples: ${error.message}`);
    }
  }

  async findDelayedSamples(
    filter: SampleDashboardFilter
  ): Promise<RepositoryResult<PaginatedData<SampleDashboardItem>>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.buildDashboardQuery(filter, {
      sample_status: { notIn: [SAMPLE_STATUS.CANCEL, SAMPLE_STATUS.COA_RELEASED] },
      coa_release_due_date: { lt: today },
      order: {
        OR: [
          { customer: { special_customer: 1 } },
          { AND: [{ payment_document: { not: null } }, { payment_date: { not: null } }] },
        ],
      },
    });
  }

  async findSamplesDueToday(
    filter: SampleDashboardFilter
  ): Promise<RepositoryResult<PaginatedData<SampleDashboardItem>>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.buildDashboardQuery(filter, {
      sample_status: { notIn: [SAMPLE_STATUS.CANCEL, SAMPLE_STATUS.COA_RELEASED] },
      coa_release_due_date: {
        gte: today,
        lt: tomorrow,
      },
    });
  }

  async findRetestSamples(
    filter: SampleDashboardFilter
  ): Promise<RepositoryResult<PaginatedData<SampleDashboardItem>>> {
    const retestStatuses = filter.retestStatus === 'internal'
      ? [SAMPLE_STATUS.INTERNAL_RETEST]
      : filter.retestStatus === 'customer'
        ? [SAMPLE_STATUS.CUSTOMER_RETEST]
        : [SAMPLE_STATUS.INTERNAL_RETEST, SAMPLE_STATUS.CUSTOMER_RETEST];

    return this.buildDashboardQuery(filter, {
      sample_status: { in: retestStatuses },
    });
  }

  async findRevisionSamples(
    filter: SampleDashboardFilter
  ): Promise<RepositoryResult<PaginatedData<SampleDashboardItem>>> {
    return this.buildDashboardQuery(filter, {
      sample_status: SAMPLE_STATUS.NEED_TO_REVISED,
    });
  }

  async findWaitingPaymentSamples(
    filter: SampleDashboardFilter
  ): Promise<RepositoryResult<PaginatedData<SampleDashboardItem>>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.buildDashboardQuery(filter, {
      sample_status: { notIn: [SAMPLE_STATUS.CANCEL, SAMPLE_STATUS.COA_RELEASED] },
      coa_release_due_date: { lt: today },
      order: {
        payment_document: null,
        payment_date: null,
        customer: { special_customer: { not: 1 } },
      },
    });
  }

  // ===== Report Operations =====

  async findForReport(
    filter: SampleReportFilter
  ): Promise<RepositoryResult<SampleReportData[]>> {
    try {
      const where: any = {
        created_at: {
          gte: filter.dateFrom,
          lte: filter.dateTo,
        },
      };

      if (!filter.includeTrash) {
        where.trash = null;
      }

      if (filter.customerId) {
        where.order = { customer_id: filter.customerId };
      }

      if (filter.status && filter.status.length > 0) {
        where.sample_status = { in: filter.status };
      }

      const samples = await this.prisma.sample.findMany({
        where,
        include: {
          order: {
            select: {
              code: true,
              order_status: true,
              customer: {
                select: {
                  code: true,
                  customer_name: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'asc' },
      });

      // Get worksheet counts per sample
      const sampleIds = samples.map(s => s.id);

      const worksheetCounts = await this.prisma.worksheet.groupBy({
        by: ['sample_id'],
        where: {
          sample_id: { in: sampleIds },
          trash: null,
        },
        _count: true,
      });

      const approvedCounts = await this.prisma.worksheet.groupBy({
        by: ['sample_id'],
        where: {
          sample_id: { in: sampleIds },
          trash: null,
          status: 'Approved by TM',
        },
        _count: true,
      });

      const worksheetMap = new Map(worksheetCounts.map(w => [w.sample_id, w._count]));
      const approvedMap = new Map(approvedCounts.map(a => [a.sample_id, a._count]));

      const reportData: SampleReportData[] = samples.map(sample => ({
        id: sample.id,
        code: sample.code,
        name: sample.name,
        status: sample.sample_status,
        priority: sample.lead_time ?? 'Normal',
        receivedDate: sample.received_date,
        dueDate: sample.due_date,
        coaReleaseDueDate: sample.coa_release_due_date,
        coaReleasedDate: sample.coa_released_date,
        analysisFinishedDate: sample.analysis_finished_date,
        leadTime: sample.lead_time,
        orderCode: sample.order.code,
        orderStatus: sample.order.order_status,
        customerCode: sample.order.customer?.code ?? '',
        customerName: sample.order.customer?.customer_name ?? '',
        worksheetCount: worksheetMap.get(sample.id) ?? 0,
        worksheetApprovedCount: approvedMap.get(sample.id) ?? 0,
        createdAt: sample.created_at,
      }));

      return RepositoryResult.ok(reportData);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch report data: ${error.message}`);
    }
  }
}
