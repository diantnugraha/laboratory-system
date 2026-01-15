import { PrismaClient } from '@prisma/client';
import {
  IWorksheetRepository,
  WorksheetFilter,
  CreateWorksheetDTO,
  UpdateWorksheetResultDTO,
  VerifyWorksheetDTO,
  ApproveWorksheetDTO,
  RevisionRequestDTO,
  RetestRequestDTO,
  SubcontractUpdateDTO,
  WorksheetWithRelations,
  StatusUpdateResult,
  AnalystAuthorizationCheck,
  DataTablesResponse,
  WorksheetStatus,
  STATUS_PRIORITY,
} from '../contracts/IWorksheetRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
// Removed unused import: buildMultiFieldSearchCondition
import { SampleStatus } from '../contracts/ISampleRepository';
import { OrderStatus } from '../contracts/IOrderRepository';

/**
 * Worksheet Repository Implementation
 * Concrete implementation of worksheet data access operations
 */
export class WorksheetRepository implements IWorksheetRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Common include for worksheet queries
   */
  private readonly worksheetInclude = {
    sample: {
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        due_date: true,
        received_date: true,
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
    },
    service: {
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        status: true,
        price: true,
        analystType: {
          select: {
            id: true,
            name: true,
          },
        },
        subcontractor: {
          select: {
            id: true,
            lab_name: true,
          },
        },
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
  };

  async findAll(filter: WorksheetFilter): Promise<RepositoryResult<PaginatedData<WorksheetWithRelations>>> {
    try {
      const { search, sampleId, orderId, serviceId, analystId, status, isSubcontract, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = {
        trash: null,
        non_parameter: null,
      };

      // Search by code
      if (search) {
        where.code = { contains: search, mode: 'insensitive' };
      }

      // Filter by sample
      if (sampleId) {
        where.sample_id = sampleId;
      }

      // Filter by order (through sample)
      if (orderId) {
        where.sample = { order_id: orderId };
      }

      // Filter by service
      if (serviceId) {
        where.service_id = serviceId;
      }

      // Filter by analyst
      if (analystId) {
        where.analyst_id = analystId;
      }

      // Filter by status
      if (status) {
        if (Array.isArray(status)) {
          where.status = { in: status };
        } else {
          where.status = status;
        }
      }

      // Filter by subcontract
      if (isSubcontract !== undefined) {
        where.service = {
          ...where.service,
          status: isSubcontract ? 'Subcontracted' : { not: 'Subcontracted' },
        };
      }

      // Analyst type filter (for analyst role)
      if (filter.userAnalystTypeIds && filter.userAnalystTypeIds.length > 0) {
        where.service = {
          ...where.service,
          analyst_type_id: { in: filter.userAnalystTypeIds },
        };
        // Analyst can only see worksheets they own or unassigned
        where.OR = [
          { analyst_id: filter.userRole === 5 ? { in: [null, filter.analystId] } : undefined },
        ];
      }

      // Customer role filter
      if (filter.userRole === 8 && filter.userCustomerId) {
        where.sample = {
          ...where.sample,
          order: { customer_id: filter.userCustomerId },
        };
      }

      const [data, total] = await Promise.all([
        this.prisma.worksheet.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: this.worksheetInclude,
        }),
        this.prisma.worksheet.count({ where }),
      ]);

      return RepositoryResult.ok({
        data: this.transformWorksheets(data),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch worksheets: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<WorksheetWithRelations | null>> {
    try {
      const worksheet = await this.prisma.worksheet.findFirst({
        where: { id, trash: null },
        include: this.worksheetInclude,
      });

      if (!worksheet) {
        return RepositoryResult.fail('Worksheet not found');
      }

      return RepositoryResult.ok(this.transformWorksheet(worksheet));
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch worksheet: ${error.message}`);
    }
  }

  async findByCode(code: string): Promise<RepositoryResult<WorksheetWithRelations | null>> {
    try {
      const worksheet = await this.prisma.worksheet.findFirst({
        where: {
          code: { equals: code },
          trash: null,
        },
        include: this.worksheetInclude,
      });

      return RepositoryResult.ok(worksheet ? this.transformWorksheet(worksheet) : null);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to find worksheet by code: ${error.message}`);
    }
  }

  async findForDataTables(
    filter: WorksheetFilter,
    sEcho: number,
    iDisplayStart: number,
    iDisplayLength: number,
    sSearch?: string
  ): Promise<RepositoryResult<DataTablesResponse>> {
    try {
      const where: any = {
        trash: null,
        non_parameter: null,
      };

      // Apply filters
      if (filter.isSubcontract !== undefined) {
        where.service = {
          status: filter.isSubcontract ? 'Subcontracted' : { not: 'Subcontracted' },
        };
      }

      if (filter.status) {
        where.status = filter.status;
      }

      // Search across multiple columns
      if (sSearch) {
        where.OR = [
          { code: { contains: sSearch, mode: 'insensitive' } },
          { sample: { code: { contains: sSearch, mode: 'insensitive' } } },
          { service: { parameter: { name: { contains: sSearch, mode: 'insensitive' } } } },
          { service: { method: { name: { contains: sSearch, mode: 'insensitive' } } } },
        ];
      }

      // Analyst type filter
      if (filter.userAnalystTypeIds && filter.userAnalystTypeIds.length > 0) {
        where.service = {
          ...where.service,
          analyst_type_id: { in: filter.userAnalystTypeIds },
        };
      }

      // Customer filter
      if (filter.userRole === 8 && filter.userCustomerId) {
        where.sample = {
          order: { customer_id: filter.userCustomerId },
        };
      }

      const [data, iTotalRecords, iTotalDisplayRecords] = await Promise.all([
        this.prisma.worksheet.findMany({
          where,
          skip: iDisplayStart,
          take: iDisplayLength,
          orderBy: { id: 'desc' },
          include: this.worksheetInclude,
        }),
        this.prisma.worksheet.count({ where: { trash: null, non_parameter: null } }),
        this.prisma.worksheet.count({ where }),
      ]);

      // Transform to DataTables format
      const aaData = data.map((ws: any) => [
        ws.id,
        ws.code,
        ws.sample?.code || '',
        ws.service?.parameter?.name || '',
        ws.service?.method?.name || '',
        ws.result || '',
        ws.unit || '',
        ws.status,
        ws.sample?.order?.priority || '',
        ws.sample?.received_date || '',
        ws.sample?.due_date || '',
      ]);

      return RepositoryResult.ok({
        sEcho,
        iTotalRecords,
        iTotalDisplayRecords,
        aaData,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch worksheets for DataTables: ${error.message}`);
    }
  }

  async findForAutocomplete(search?: string, sampleId?: number, limit: number = 20): Promise<RepositoryResult<any[]>> {
    try {
      const where: any = { trash: null, non_parameter: null };

      if (search) {
        where.code = { contains: search, mode: 'insensitive' };
      }

      if (sampleId) {
        where.sample_id = sampleId;
      }

      const worksheets = await this.prisma.worksheet.findMany({
        where,
        select: {
          id: true,
          code: true,
          status: true,
          result: true,
          sample: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              parameter: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { id: 'desc' },
        take: limit,
      });

      return RepositoryResult.ok(worksheets);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch worksheets for autocomplete: ${error.message}`);
    }
  }

  async findBySampleId(sampleId: number): Promise<RepositoryResult<WorksheetWithRelations[]>> {
    try {
      const worksheets = await this.prisma.worksheet.findMany({
        where: {
          sample_id: sampleId,
          trash: null,
          non_parameter: null,
        },
        include: this.worksheetInclude,
        orderBy: { index_array: 'asc' },
      });

      return RepositoryResult.ok(this.transformWorksheets(worksheets));
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch worksheets by sample: ${error.message}`);
    }
  }

  async findByOrderId(orderId: number): Promise<RepositoryResult<WorksheetWithRelations[]>> {
    try {
      const worksheets = await this.prisma.worksheet.findMany({
        where: {
          sample: { order_id: orderId },
          trash: null,
          non_parameter: null,
        },
        include: this.worksheetInclude,
        orderBy: { id: 'asc' },
      });

      return RepositoryResult.ok(this.transformWorksheets(worksheets));
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch worksheets by order: ${error.message}`);
    }
  }

  async checkAnalystAuthorization(worksheetId: number, userId: number): Promise<RepositoryResult<AnalystAuthorizationCheck>> {
    try {
      const worksheet = await this.prisma.worksheet.findFirst({
        where: { id: worksheetId, trash: null },
        select: {
          service: {
            select: { analyst_type_id: true },
          },
        },
      });

      if (!worksheet) {
        return RepositoryResult.ok({ isAuthorized: false, reason: 'Worksheet not found' });
      }

      const serviceAnalystTypeId = worksheet.service.analyst_type_id;
      if (!serviceAnalystTypeId) {
        return RepositoryResult.ok({ isAuthorized: true }); // No analyst type restriction
      }

      const analystRule = await this.prisma.analystRules.findFirst({
        where: {
          user_id: userId,
          analyst_type_id: serviceAnalystTypeId,
          trash: null,
        },
      });

      if (!analystRule) {
        return RepositoryResult.ok({
          isAuthorized: false,
          reason: 'Worksheet not authorized for this analyst type',
        });
      }

      return RepositoryResult.ok({ isAuthorized: true });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check analyst authorization: ${error.message}`);
    }
  }

  async getUserAnalystTypeIds(userId: number): Promise<RepositoryResult<number[]>> {
    try {
      const analystRules = await this.prisma.analystRules.findMany({
        where: { user_id: userId, trash: null },
        select: { analyst_type_id: true },
      });

      return RepositoryResult.ok(analystRules.map(ar => ar.analyst_type_id));
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to get user analyst types: ${error.message}`);
    }
  }

  async checkOrderStatusForUpdate(worksheetId: number): Promise<RepositoryResult<{
    canUpdate: boolean;
    orderStatus: string;
    reason?: string;
  }>> {
    try {
      const worksheet = await this.prisma.worksheet.findFirst({
        where: { id: worksheetId, trash: null },
        select: {
          sample: {
            select: {
              order: {
                select: { status: true },
              },
            },
          },
        },
      });

      if (!worksheet) {
        return RepositoryResult.fail('Worksheet not found');
      }

      const orderStatus = worksheet.sample.order.status;
      const statusInt = this.getOrderStatusInt(orderStatus);
      const canUpdate = statusInt >= 4; // Reviewed or higher

      return RepositoryResult.ok({
        canUpdate,
        orderStatus,
        reason: canUpdate ? undefined : `Order must be "Reviewed" or later. Current status: "${orderStatus}"`,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check order status: ${error.message}`);
    }
  }

  async validateStatusTransition(
    currentStatus: string,
    targetStatus: string,
    userRole: number
  ): Promise<RepositoryResult<{ isValid: boolean; reason?: string }>> {
    // Define valid transitions per role
    const validTransitions: Record<number, Record<string, string[]>> = {
      // Analyst (5)
      5: {
        'Process': ['To Be Verified'],
        'Need to Revised': ['To Be Verified'],
        'Internal Retest': ['To Be Verified'],
        'Customer Retest': ['To Be Verified'],
      },
      // QC (6)
      6: {
        'To Be Verified': ['Verified by QC', 'Need to Revised', 'Internal Retest'],
        'Verified by QC': ['Need to Revised'],
      },
      // Technical Manager (7)
      7: {
        'Verified by QC': ['Approved by TM'],
      },
    };

    const roleTransitions = validTransitions[userRole];
    if (!roleTransitions) {
      return RepositoryResult.ok({ isValid: false, reason: 'Role not authorized for status transitions' });
    }

    const allowedTargets = roleTransitions[currentStatus];
    if (!allowedTargets || !allowedTargets.includes(targetStatus)) {
      return RepositoryResult.ok({
        isValid: false,
        reason: `Cannot transition from "${currentStatus}" to "${targetStatus}" with your role`,
      });
    }

    return RepositoryResult.ok({ isValid: true });
  }

  async create(data: CreateWorksheetDTO): Promise<RepositoryResult<WorksheetWithRelations>> {
    try {
      const worksheet = await this.prisma.worksheet.create({
        data: {
          code: data.code,
          sample_id: data.sampleId,
          service_id: data.serviceId,
          package_id: data.packageId,
          standart_id: data.standartId,
          status: data.status || WorksheetStatus.PROCESS,
          discount: data.discount,
          index_array: data.indexArray,
          created_by: data.createdBy,
        },
        include: this.worksheetInclude,
      });

      return RepositoryResult.ok(this.transformWorksheet(worksheet));
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create worksheet: ${error.message}`);
    }
  }

  async createMany(worksheets: CreateWorksheetDTO[]): Promise<RepositoryResult<number>> {
    try {
      const result = await this.prisma.worksheet.createMany({
        data: worksheets.map(ws => ({
          code: ws.code,
          sample_id: ws.sampleId,
          service_id: ws.serviceId,
          package_id: ws.packageId,
          standart_id: ws.standartId,
          status: ws.status || WorksheetStatus.PROCESS,
          discount: ws.discount,
          index_array: ws.indexArray,
          created_by: ws.createdBy,
        })),
      });

      return RepositoryResult.ok(result.count);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create worksheets: ${error.message}`);
    }
  }

  async updateResult(
    id: number,
    data: UpdateWorksheetResultDTO,
    userId: number,
    userRole: number
  ): Promise<RepositoryResult<StatusUpdateResult>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const worksheet = await tx.worksheet.findFirst({
          where: { id, trash: null },
          include: { sample: { select: { id: true, order_id: true } } },
        });

        if (!worksheet) {
          throw new Error('Worksheet not found');
        }

        const updateData: any = {
          updated_by: data.updatedBy,
        };

        if (data.result !== undefined) updateData.result = data.result;
        if (data.nResult !== undefined) updateData.n_result = data.nResult;
        if (data.unit !== undefined) updateData.unit = data.unit;
        if (data.remarks !== undefined) updateData.remarks = data.remarks;
        if (data.document !== undefined) updateData.document = data.document;

        // Set analyst if first time (role 5 = Analyst, role 10 = SubcontractStaff)
        if ([5, 10].includes(userRole) && !worksheet.analyst_id) {
          updateData.analyst_id = userId;
          updateData.worksheet_date = new Date();
        }

        // Set finish date and status if result is provided
        if (data.result !== undefined) {
          if (!worksheet.finish_date) {
            updateData.finish_date = new Date();
          }

          // Update result history
          if (!['To Be Verified', 'Verified by QC', 'Approved by TM'].includes(worksheet.status)) {
            updateData.result_history = worksheet.result
              ? `${worksheet.result},${data.result}`
              : `,${data.result}`;
          }

          // Change status to To Be Verified for Analyst/SubcontractStaff
          if ([5, 10].includes(userRole)) {
            updateData.status = WorksheetStatus.TO_BE_VERIFIED;
          }
        }

        const updated = await tx.worksheet.update({
          where: { id },
          data: updateData,
          include: this.worksheetInclude,
        });

        // Recalculate sample status
        const sampleStatus = await this.recalculateSampleStatusTx(tx, worksheet.sample.id);
        let sampleStatusChanged = false;

        const currentSample = await tx.sample.findFirst({
          where: { id: worksheet.sample.id },
          select: { status: true },
        });

        if (currentSample && currentSample.status !== sampleStatus) {
          await tx.sample.update({
            where: { id: worksheet.sample.id },
            data: { status: sampleStatus },
          });
          sampleStatusChanged = true;
        }

        return RepositoryResult.ok({
          worksheet: this.transformWorksheet(updated),
          sampleStatusChanged,
          orderStatusChanged: false,
          newSampleStatus: sampleStatusChanged ? sampleStatus : undefined,
        });
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update worksheet result: ${error.message}`);
    }
  }

  async verify(id: number, data: VerifyWorksheetDTO): Promise<RepositoryResult<StatusUpdateResult>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const worksheet = await tx.worksheet.findFirst({
          where: { id, trash: null },
          include: { sample: { select: { id: true } } },
        });

        if (!worksheet) {
          throw new Error('Worksheet not found');
        }

        const updated = await tx.worksheet.update({
          where: { id },
          data: {
            status: WorksheetStatus.VERIFIED_BY_QC,
            qc_id: data.verifiedBy,
            verify_qc_date: new Date(),
          },
          include: this.worksheetInclude,
        });

        // Check if all worksheets are verified
        const allVerified = await this.checkAllWorksheetsVerifiedTx(tx, worksheet.sample.id);
        let sampleStatusChanged = false;

        if (allVerified) {
          await tx.sample.update({
            where: { id: worksheet.sample.id },
            data: { status: SampleStatus.VERIFIED_BY_QC },
          });
          sampleStatusChanged = true;
        }

        return RepositoryResult.ok({
          worksheet: this.transformWorksheet(updated),
          sampleStatusChanged,
          orderStatusChanged: false,
          newSampleStatus: sampleStatusChanged ? SampleStatus.VERIFIED_BY_QC : undefined,
        });
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to verify worksheet: ${error.message}`);
    }
  }

  async approve(id: number, data: ApproveWorksheetDTO): Promise<RepositoryResult<StatusUpdateResult>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const worksheet = await tx.worksheet.findFirst({
          where: { id, trash: null },
          include: { sample: { select: { id: true, order_id: true } } },
        });

        if (!worksheet) {
          throw new Error('Worksheet not found');
        }

        const updated = await tx.worksheet.update({
          where: { id },
          data: {
            status: WorksheetStatus.APPROVED_BY_TM,
            manager_id: data.approvedBy,
          },
          include: this.worksheetInclude,
        });

        // Check if all worksheets are approved
        const allApproved = await this.checkAllWorksheetsApprovedTx(tx, worksheet.sample.id);
        let sampleStatusChanged = false;
        let orderStatusChanged = false;

        if (allApproved) {
          await tx.sample.update({
            where: { id: worksheet.sample.id },
            data: {
              status: SampleStatus.APPROVED_BY_TM,
              analysis_finished_date: new Date(),
            },
          });
          sampleStatusChanged = true;

          // Check if all samples in order are approved
          const orderSamples = await tx.sample.findMany({
            where: { order_id: worksheet.sample.order_id, trash: null },
            select: { status: true },
          });

          const allSamplesApproved = orderSamples.every(s => s.status === SampleStatus.APPROVED_BY_TM);
          if (allSamplesApproved) {
            await tx.order.update({
              where: { id: worksheet.sample.order_id },
              data: {
                status: OrderStatus.COMPLETE,
                complete_date: new Date(),
              },
            });
            orderStatusChanged = true;
          }
        }

        return RepositoryResult.ok({
          worksheet: this.transformWorksheet(updated),
          sampleStatusChanged,
          orderStatusChanged,
          newSampleStatus: sampleStatusChanged ? SampleStatus.APPROVED_BY_TM : undefined,
          newOrderStatus: orderStatusChanged ? OrderStatus.COMPLETE : undefined,
        });
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to approve worksheet: ${error.message}`);
    }
  }

  async requestRevision(id: number, data: RevisionRequestDTO): Promise<RepositoryResult<StatusUpdateResult>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const worksheet = await tx.worksheet.findFirst({
          where: { id, trash: null },
          include: { sample: { select: { id: true, order_id: true } } },
        });

        if (!worksheet) {
          throw new Error('Worksheet not found');
        }

        // Update target worksheet
        const updated = await tx.worksheet.update({
          where: { id },
          data: {
            status: WorksheetStatus.NEED_TO_REVISED,
            qc_id: data.requestedBy,
            total_revision: { increment: 1 },
          },
          include: this.worksheetInclude,
        });

        // Downgrade other approved worksheets in same sample
        await tx.worksheet.updateMany({
          where: {
            sample_id: worksheet.sample.id,
            id: { not: id },
            trash: null,
            status: WorksheetStatus.APPROVED_BY_TM,
          },
          data: { status: WorksheetStatus.VERIFIED_BY_QC },
        });

        // Update sample status
        await tx.sample.update({
          where: { id: worksheet.sample.id },
          data: { status: SampleStatus.NEED_TO_REVISED },
        });

        // Update order status
        await tx.order.update({
          where: { id: worksheet.sample.order_id },
          data: { status: OrderStatus.WAITING_REVISION },
        });

        return RepositoryResult.ok({
          worksheet: this.transformWorksheet(updated),
          sampleStatusChanged: true,
          orderStatusChanged: true,
          newSampleStatus: SampleStatus.NEED_TO_REVISED,
          newOrderStatus: OrderStatus.WAITING_REVISION,
        });
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to request revision: ${error.message}`);
    }
  }

  async requestInternalRetest(id: number, data: RetestRequestDTO): Promise<RepositoryResult<StatusUpdateResult>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const worksheet = await tx.worksheet.findFirst({
          where: { id, trash: null },
          include: { sample: { select: { id: true } } },
        });

        if (!worksheet) {
          throw new Error('Worksheet not found');
        }

        const updated = await tx.worksheet.update({
          where: { id },
          data: {
            status: WorksheetStatus.INTERNAL_RETEST,
            qc_id: data.requestedBy,
            total_retest: { increment: 1 },
          },
          include: this.worksheetInclude,
        });

        // Update sample status
        await tx.sample.update({
          where: { id: worksheet.sample.id },
          data: { status: SampleStatus.INTERNAL_RETEST },
        });

        return RepositoryResult.ok({
          worksheet: this.transformWorksheet(updated),
          sampleStatusChanged: true,
          orderStatusChanged: false,
          newSampleStatus: SampleStatus.INTERNAL_RETEST,
        });
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to request internal retest: ${error.message}`);
    }
  }

  async requestCustomerRetest(id: number, _data: RetestRequestDTO): Promise<RepositoryResult<StatusUpdateResult>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const worksheet = await tx.worksheet.findFirst({
          where: { id, trash: null },
          include: { sample: { select: { id: true, order_id: true } } },
        });

        if (!worksheet) {
          throw new Error('Worksheet not found');
        }

        const updated = await tx.worksheet.update({
          where: { id },
          data: {
            status: WorksheetStatus.CUSTOMER_RETEST,
            total_customer_retest: { increment: 1 },
            qc_id: null,
            finish_date: null,
          },
          include: this.worksheetInclude,
        });

        // Downgrade other approved worksheets
        await tx.worksheet.updateMany({
          where: {
            sample_id: worksheet.sample.id,
            id: { not: id },
            trash: null,
            status: WorksheetStatus.APPROVED_BY_TM,
          },
          data: { status: WorksheetStatus.VERIFIED_BY_QC },
        });

        // Update order status
        await tx.order.update({
          where: { id: worksheet.sample.order_id },
          data: { status: OrderStatus.CUSTOMER_RETEST },
        });

        // Update sample status with extended due date
        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + 5); // Add 5 days

        await tx.sample.update({
          where: { id: worksheet.sample.id },
          data: {
            status: SampleStatus.CUSTOMER_RETEST,
            coa_release_due_date: newDueDate,
          },
        });

        return RepositoryResult.ok({
          worksheet: this.transformWorksheet(updated),
          sampleStatusChanged: true,
          orderStatusChanged: true,
          newSampleStatus: SampleStatus.CUSTOMER_RETEST,
          newOrderStatus: OrderStatus.CUSTOMER_RETEST,
        });
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to request customer retest: ${error.message}`);
    }
  }

  async cancel(id: number, userId: number, reason?: string): Promise<RepositoryResult<StatusUpdateResult>> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const worksheet = await tx.worksheet.findFirst({
          where: { id, trash: null },
          include: { sample: { select: { id: true } } },
        });

        if (!worksheet) {
          throw new Error('Worksheet not found');
        }

        const updated = await tx.worksheet.update({
          where: { id },
          data: {
            status: WorksheetStatus.CANCEL,
            remarks: reason || worksheet.remarks,
            updated_by: userId,
          },
          include: this.worksheetInclude,
        });

        // Recalculate sample status
        const newStatus = await this.recalculateSampleStatusTx(tx, worksheet.sample.id);
        await tx.sample.update({
          where: { id: worksheet.sample.id },
          data: { status: newStatus },
        });

        return RepositoryResult.ok({
          worksheet: this.transformWorksheet(updated),
          sampleStatusChanged: true,
          orderStatusChanged: false,
          newSampleStatus: newStatus,
        });
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to cancel worksheet: ${error.message}`);
    }
  }

  async quickSubmit(
    id: number,
    result: string,
    unit: string | undefined,
    nResult: string | undefined,
    userId: number,
    userRole: number
  ): Promise<RepositoryResult<WorksheetWithRelations>> {
    try {
      const worksheet = await this.prisma.worksheet.findFirst({
        where: { id, trash: null },
      });

      if (!worksheet) {
        return RepositoryResult.fail('Worksheet not found');
      }

      const updateData: any = {
        result,
        updated_by: userId,
      };

      if (unit) updateData.unit = unit;
      if (nResult) updateData.n_result = nResult;

      // Set analyst if first time
      if ([5, 10].includes(userRole) && !worksheet.analyst_id) {
        updateData.analyst_id = userId;
        updateData.worksheet_date = new Date();
      }

      // Set finish date and status
      if (!worksheet.finish_date) {
        updateData.finish_date = new Date();
      }

      if ([5, 10].includes(userRole)) {
        updateData.status = WorksheetStatus.TO_BE_VERIFIED;
      }

      const updated = await this.prisma.worksheet.update({
        where: { id },
        data: updateData,
        include: this.worksheetInclude,
      });

      return RepositoryResult.ok(this.transformWorksheet(updated));
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to quick submit: ${error.message}`);
    }
  }

  async updateSubcontract(id: number, data: SubcontractUpdateDTO): Promise<RepositoryResult<WorksheetWithRelations>> {
    try {
      const updateData: any = { updated_by: data.updatedBy };

      if (data.airWayBill !== undefined) updateData.air_way_bill = data.airWayBill;
      if (data.subconSendDate !== undefined) updateData.subcon_send_date = data.subconSendDate;
      if (data.subconReceivedDate !== undefined) updateData.subcon_received_date = data.subconReceivedDate;
      if (data.subconEndDate !== undefined) updateData.subcon_end_date = data.subconEndDate;

      const worksheet = await this.prisma.worksheet.update({
        where: { id },
        data: updateData,
        include: this.worksheetInclude,
      });

      return RepositoryResult.ok(this.transformWorksheet(worksheet));
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update subcontract info: ${error.message}`);
    }
  }

  async delete(id: number, userId: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.worksheet.update({
        where: { id },
        data: {
          trash: 1,
          updated_by: userId,
        },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete worksheet: ${error.message}`);
    }
  }

  async recalculateSampleStatus(sampleId: number): Promise<RepositoryResult<string>> {
    try {
      const status = await this.recalculateSampleStatusTx(this.prisma, sampleId);
      return RepositoryResult.ok(status);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to recalculate sample status: ${error.message}`);
    }
  }

  async updateOrderToUnderProcess(sampleId: number): Promise<RepositoryResult<boolean>> {
    try {
      const sample = await this.prisma.sample.findFirst({
        where: { id: sampleId },
        select: { order: { select: { id: true, status: true } } },
      });

      if (!sample) {
        return RepositoryResult.fail('Sample not found');
      }

      const statusInt = this.getOrderStatusInt(sample.order.status);
      if (statusInt < 5) { // Not yet Under Process
        await this.prisma.order.update({
          where: { id: sample.order.id },
          data: { status: OrderStatus.UNDER_PROCESS },
        });
      }

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update order to Under Process: ${error.message}`);
    }
  }

  async generateCode(): Promise<RepositoryResult<string>> {
    try {
      const now = new Date();
      const yearMonth = now.toISOString().slice(2, 4) + (now.getMonth() + 1).toString().padStart(2, '0');
      const prefix = `WS${yearMonth}`;

      const lastWorksheet = await this.prisma.worksheet.findFirst({
        where: {
          code: { startsWith: prefix },
        },
        orderBy: { code: 'desc' },
        select: { code: true },
      });

      let sequence = 1;
      if (lastWorksheet?.code) {
        const lastSequence = parseInt(lastWorksheet.code.slice(-7), 10);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }

      const code = `${prefix}${sequence.toString().padStart(7, '0')}`;
      return RepositoryResult.ok(code);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to generate worksheet code: ${error.message}`);
    }
  }

  // ===== Private Helper Methods =====

  private getOrderStatusInt(status: string): number {
    const statusMap: Record<string, number> = {
      'Created': 1,
      'To Be Verified': 2,
      'Need to Revise': 3,
      'Reviewed': 4,
      'Under Process': 5,
      'Waiting Revision': 5,
      'Customer Retest': 5,
      'Complete': 6,
      'Cancelled': 0,
    };
    return statusMap[status] ?? 0;
  }

  private async recalculateSampleStatusTx(tx: any, sampleId: number): Promise<string> {
    const worksheets = await tx.worksheet.findMany({
      where: {
        sample_id: sampleId,
        trash: null,
        non_parameter: null,
      },
      select: { status: true },
    });

    if (worksheets.length === 0) {
      return SampleStatus.PROCESS;
    }

    let worstPriority = 7;
    let worstStatus = SampleStatus.APPROVED_BY_TM;

    for (const ws of worksheets) {
      const priority = STATUS_PRIORITY[ws.status] ?? 4;
      if (priority < worstPriority) {
        worstPriority = priority;
        worstStatus = ws.status;
      }
    }

    return worstStatus;
  }

  private async checkAllWorksheetsVerifiedTx(tx: any, sampleId: number): Promise<boolean> {
    const pendingCount = await tx.worksheet.count({
      where: {
        sample_id: sampleId,
        trash: null,
        non_parameter: null,
        status: { in: ['Process', 'To Be Verified', 'Need to Revised'] },
      },
    });

    return pendingCount === 0;
  }

  private async checkAllWorksheetsApprovedTx(tx: any, sampleId: number): Promise<boolean> {
    const [totalCount, approvedCount] = await Promise.all([
      tx.worksheet.count({
        where: { sample_id: sampleId, trash: null, non_parameter: null },
      }),
      tx.worksheet.count({
        where: { sample_id: sampleId, trash: null, non_parameter: null, status: 'Approved by TM' },
      }),
    ]);

    return totalCount > 0 && totalCount === approvedCount;
  }

  private transformWorksheet(ws: any): WorksheetWithRelations {
    return {
      id: ws.id,
      code: ws.code,
      sampleId: ws.sample_id,
      serviceId: ws.service_id,
      packageId: ws.package_id,
      standartId: ws.standart_id,
      status: ws.status,
      result: ws.result,
      nResult: ws.n_result,
      resultHistory: ws.result_history,
      unit: ws.unit,
      remarks: ws.remarks,
      document: ws.document,
      analystId: ws.analyst_id,
      worksheetDate: ws.worksheet_date,
      finishDate: ws.finish_date,
      supervisorId: ws.supervisor_id,
      qcId: ws.qc_id,
      verifyQcDate: ws.verify_qc_date,
      managerId: ws.manager_id,
      airWayBill: ws.air_way_bill,
      subconSendDate: ws.subcon_send_date,
      subconReceivedDate: ws.subcon_received_date,
      subconEndDate: ws.subcon_end_date,
      totalRetest: ws.total_retest,
      totalRevision: ws.total_revision,
      totalCustomerRetest: ws.total_customer_retest,
      discount: ws.discount,
      indexArray: ws.index_array,
      nonParameter: ws.non_parameter,
      createdAt: ws.created_at,
      updatedAt: ws.updated_at,
      sample: {
        id: ws.sample.id,
        code: ws.sample.code,
        name: ws.sample.name,
        status: ws.sample.status,
        dueDate: ws.sample.due_date,
        receivedDate: ws.sample.received_date,
        order: {
          id: ws.sample.order.id,
          code: ws.sample.order.code,
          status: ws.sample.order.status,
          priority: ws.sample.order.priority,
          customer: ws.sample.order.customer,
        },
      },
      service: {
        id: ws.service.id,
        code: ws.service.code,
        name: ws.service.name,
        unit: ws.service.unit,
        status: ws.service.status,
        price: ws.service.price,
        analystType: ws.service.analystType,
        subcontractor: ws.service.subcontractor,
        parameter: ws.service.parameter,
        method: ws.service.method,
      },
    };
  }

  private transformWorksheets(worksheets: any[]): WorksheetWithRelations[] {
    return worksheets.map(ws => this.transformWorksheet(ws));
  }
}
