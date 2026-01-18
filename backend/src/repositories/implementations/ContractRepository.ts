import { PrismaClient } from '@prisma/client';
import {
  IContractRepository,
  ContractFilter,
  CreateContractDTO,
  UpdateContractDTO,
  ContractDetailDTO,
  ContractWithDetails,
  OverlapCheckResult,
} from '../contracts/IContractRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildSearchCondition, sanitizeSearchQuery } from '../../utils/searchHelper';

/**
 * Contract Repository Implementation
 * Handles all database operations for Contract entity
 */
export class ContractRepository implements IContractRepository {
  constructor(private prisma: PrismaClient) {}

  // ===== Helper Methods =====

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getContractInclude() {
    return {
      customer: {
        select: {
          id: true,
          code: true,
          customer_name: true,
          business: true,
          email: true,
          special_customer: true,
          top: true,
        },
      },
      details: {
        include: {
          service: {
            select: {
              id: true,
              code: true,
              name: true,
              price: true,
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              totalPrice: true,
            },
          },
        },
      },
    };
  }

  // ===== Read Operations =====

  async findAll(filter: ContractFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const {
        search,
        customerId,
        periodToStart,
        periodToEnd,
        priority,
        offset = 0,
        limit = 20,
        userRole,
        userCustomerId,
      } = filter;

      const where: any = {
        trash: null,
        ...buildSearchCondition('code', sanitizeSearchQuery(search)),
      };

      // Customer role restrictions
      if (userRole === 16 && userCustomerId) {
        where.customerId = userCustomerId;
      }

      // Optional customer filter
      if (customerId) {
        where.customerId = customerId;
      }

      // Date range filters
      if (periodToStart) {
        where.periodTo = { ...where.periodTo, gte: periodToStart };
      }
      if (periodToEnd) {
        where.periodTo = { ...where.periodTo, lte: periodToEnd };
      }

      // Priority filter (1=special customer, 2=normal customer)
      if (priority === 1) {
        where.customer = { special_customer: 1 };
      } else if (priority === 2) {
        where.customer = { special_customer: { not: 1 } };
      }

      const [contracts, total] = await Promise.all([
        this.prisma.contract.findMany({
          where,
          orderBy: { id: 'desc' },
          take: limit,
          skip: offset,
          include: {
            customer: {
              select: {
                id: true,
                code: true,
                customer_name: true,
                special_customer: true,
                top: true,
              },
            },
            details: {
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
        this.prisma.contract.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.floor(offset / limit) + 1;

      return RepositoryResult.ok({
        data: contracts,
        pagination: {
          page: currentPage,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch contracts: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<ContractWithDetails | null>> {
    try {
      // Use findUnique for better performance with primary key lookups
      const contract = await this.prisma.contract.findUnique({
        where: { id },
        include: this.getContractInclude(),
      });

      // Check trash after fetch (findUnique doesn't support compound where)
      if (!contract || contract.trash) {
        return RepositoryResult.ok(null);
      }

      return RepositoryResult.ok(contract as unknown as ContractWithDetails);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch contract: ${error.message}`);
    }
  }

  async findByCustomerId(customerId: number, date?: Date): Promise<RepositoryResult<ContractWithDetails | null>> {
    try {
      const targetDate = date || new Date();

      const contract = await this.prisma.contract.findFirst({
        where: {
          customerId,
          trash: null,
          periodFrom: { lte: targetDate },
          periodTo: { gte: targetDate },
        },
        orderBy: { id: 'desc' },
        include: this.getContractInclude(),
      });

      if (!contract) {
        return RepositoryResult.ok(null);
      }

      return RepositoryResult.ok(contract as unknown as ContractWithDetails);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch customer contract: ${error.message}`);
    }
  }

  async findByCode(code: string, excludeId?: number): Promise<RepositoryResult<any | null>> {
    try {
      const contract = await this.prisma.contract.findFirst({
        where: {
          code: { equals: code },
          trash: null,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });

      return RepositoryResult.ok(contract);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check contract code: ${error.message}`);
    }
  }

  async findForAutocomplete(search?: string, _dataTable?: boolean): Promise<RepositoryResult<any[]>> {
    try {
      const where: any = { trash: null };

      if (search) {
        where.customer = {
          customer_name: { contains: search },
        };
      }

      const contracts = await this.prisma.contract.findMany({
        where,
        take: 50,
        orderBy: { id: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              customer_name: true,
            },
          },
        },
      });

      const items = contracts.map((contract) => ({
        id: contract.id,
        name: contract.code,
        customer: {
          id: contract.customer.id,
          name: contract.customer.customer_name,
        },
        periode_from: this.formatDate(contract.periodFrom),
        periode_to: this.formatDate(contract.periodTo),
      }));

      return RepositoryResult.ok(items);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch contracts for autocomplete: ${error.message}`);
    }
  }

  async findWithFilters(filter: ContractFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const {
        customerId,
        periodToStart,
        periodToEnd,
        priority,
        offset = 0,
        limit = 20,
        userRole,
        userCustomerId,
      } = filter;

      const now = new Date();
      const where: any = {
        trash: null,
        periodTo: { gte: now }, // Only active contracts
      };

      // Customer role restrictions
      if (userRole === 16 && userCustomerId) {
        where.customerId = userCustomerId;
      }

      if (customerId) {
        where.customerId = customerId;
      }

      // Priority filter
      if (priority === 1) {
        where.customer = { special_customer: 1 };
      } else if (priority === 2) {
        where.customer = { special_customer: { not: 1 } };
      }

      // Date range filters
      if (periodToStart) {
        where.periodTo = { ...where.periodTo, gte: periodToStart };
      }
      if (periodToEnd) {
        where.periodTo = { ...where.periodTo, lte: periodToEnd };
      }

      const [contracts, total] = await Promise.all([
        this.prisma.contract.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { id: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                customer_name: true,
                special_customer: true,
                top: true,
              },
            },
          },
        }),
        this.prisma.contract.count({ where }),
      ]);

      const items = contracts.map((contract) => ({
        id: contract.id,
        code: contract.code,
        period_from: this.formatDate(contract.periodFrom),
        period_to: this.formatDate(contract.periodTo),
        customer: {
          id: contract.customer.id,
          name: contract.customer.customer_name,
          top_value: contract.customer.top,
        },
        white_list: contract.customer.special_customer === 1,
        top: contract.customer.top !== null && contract.customer.top !== 0,
      }));

      return RepositoryResult.ok({
        data: items,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch contracts: ${error.message}`);
    }
  }

  // ===== Validation Operations =====

  async checkOverlap(
    customerId: number,
    periodFrom: Date,
    periodTo: Date,
    excludeId?: number
  ): Promise<RepositoryResult<OverlapCheckResult>> {
    try {
      // Simplified overlap detection using mathematical formula:
      // Two ranges [A, B] and [C, D] overlap if and only if: A < D AND B > C
      // This is more efficient than 3 OR conditions
      const overlapping = await this.prisma.contract.findFirst({
        where: {
          customerId,
          trash: null,
          ...(excludeId && { id: { not: excludeId } }),
          // Overlap condition: existing.periodFrom < new.periodTo AND existing.periodTo > new.periodFrom
          AND: [
            { periodFrom: { lt: periodTo } },   // existing starts before new ends
            { periodTo: { gt: periodFrom } },   // existing ends after new starts
          ],
        },
        select: {
          id: true,
          code: true,
          periodFrom: true,
          periodTo: true,
        },
      });

      if (overlapping) {
        return RepositoryResult.ok({
          hasOverlap: true,
          overlappingContract: overlapping,
        });
      }

      return RepositoryResult.ok({ hasOverlap: false });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check overlap: ${error.message}`);
    }
  }

  // ===== Write Operations =====

  async create(
    data: CreateContractDTO,
    serviceDetails?: ContractDetailDTO[],
    packageDetails?: ContractDetailDTO[]
  ): Promise<RepositoryResult<ContractWithDetails>> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const detailsToCreate: any[] = [];

        // Process service details
        if (data.statusService === 'selected' && serviceDetails) {
          for (const detail of serviceDetails) {
            if (detail.serviceId) {
              detailsToCreate.push({
                serviceId: detail.serviceId,
                discountNormal: detail.discountNormal,
                discountUrgent: detail.discountUrgent,
                discountVeryUrgent: detail.discountVeryUrgent,
              });
            }
          }
        }

        // Process package details
        if (data.statusService === 'selected' && packageDetails) {
          for (const detail of packageDetails) {
            if (detail.packageId) {
              detailsToCreate.push({
                packageId: detail.packageId,
                discountNormal: detail.discountNormal,
                discountUrgent: detail.discountUrgent,
                discountVeryUrgent: detail.discountVeryUrgent,
              });
            }
          }
        }

        const contractData: any = {
          code: data.code.trim(),
          customerId: data.customerId,
          period: data.period,
          periodFrom: data.periodFrom,
          periodTo: data.periodTo,
          periodAlias: data.periodAlias || null,
          documents: data.documents?.substring(0, 65535) || null,
          normalDay: data.normalDay,
          urgentDay: data.urgentDay,
          veryUrgentDay: data.veryUrgentDay,
          statusService: data.statusService,
          discount: data.discount ?? 0,
          discountUrgent: data.discountUrgent ?? 50,
          discountVeryUrgent: data.discountVeryUrgent ?? 100,
          promotionId: data.promotionId || null,
          remarks: data.remarks || null,
          createdBy: data.createdBy,
        };

        if (detailsToCreate.length > 0) {
          contractData.details = { create: detailsToCreate };
        }

        const contract = await tx.contract.create({
          data: contractData,
          include: this.getContractInclude(),
        });

        return contract;
      });

      return RepositoryResult.ok(result as unknown as ContractWithDetails);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create contract: ${error.message}`);
    }
  }

  async update(
    id: number,
    data: UpdateContractDTO,
    serviceDetails?: ContractDetailDTO[],
    packageDetails?: ContractDetailDTO[]
  ): Promise<RepositoryResult<ContractWithDetails>> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Get existing contract
        const existing = await tx.contract.findUnique({
          where: { id },
          include: { details: true },
        });

        if (!existing || existing.trash) {
          throw new Error('Contract not found');
        }

        // If switching from SELECTED to ALL, delete all details
        if (
          data.statusService === 'all' &&
          existing.statusService === 'selected'
        ) {
          await tx.contractDetail.deleteMany({
            where: { contractId: id },
          });
        }

        // Build update data
        const updateData: any = {
          updatedBy: data.updatedBy,
        };

        if (data.code !== undefined) updateData.code = data.code.trim();
        if (data.customerId !== undefined) updateData.customerId = data.customerId;
        if (data.period !== undefined) updateData.period = data.period;
        if (data.periodFrom !== undefined) updateData.periodFrom = data.periodFrom;
        if (data.periodTo !== undefined) updateData.periodTo = data.periodTo;
        if (data.periodAlias !== undefined) updateData.periodAlias = data.periodAlias;
        if (data.documents !== undefined) updateData.documents = data.documents?.substring(0, 65535) || null;
        if (data.normalDay !== undefined) updateData.normalDay = data.normalDay;
        if (data.urgentDay !== undefined) updateData.urgentDay = data.urgentDay;
        if (data.veryUrgentDay !== undefined) updateData.veryUrgentDay = data.veryUrgentDay;
        if (data.statusService !== undefined) updateData.statusService = data.statusService;
        if (data.discount !== undefined) updateData.discount = data.discount;
        if (data.discountUrgent !== undefined) updateData.discountUrgent = data.discountUrgent;
        if (data.discountVeryUrgent !== undefined) updateData.discountVeryUrgent = data.discountVeryUrgent;
        if (data.promotionId !== undefined) updateData.promotionId = data.promotionId;
        if (data.remarks !== undefined) updateData.remarks = data.remarks;

        // Update contract
        await tx.contract.update({
          where: { id },
          data: updateData,
        });

        // Handle details if SELECTED mode (batch pattern to avoid N+1)
        const statusService = data.statusService ?? existing.statusService;
        if (statusService === 'selected' && (serviceDetails || packageDetails)) {
          // Step 1: Delete all existing details for this contract
          await tx.contractDetail.deleteMany({
            where: { contractId: id },
          });

          // Step 2: Prepare all new details
          const allDetails: Array<{
            contractId: number;
            serviceId?: number;
            packageId?: number;
            discountNormal: number;
            discountUrgent: number;
            discountVeryUrgent: number;
          }> = [];

          // Add service details
          if (serviceDetails) {
            for (const detail of serviceDetails) {
              if (detail.serviceId) {
                allDetails.push({
                  contractId: id,
                  serviceId: detail.serviceId,
                  discountNormal: detail.discountNormal,
                  discountUrgent: detail.discountUrgent,
                  discountVeryUrgent: detail.discountVeryUrgent,
                });
              }
            }
          }

          // Add package details
          if (packageDetails) {
            for (const detail of packageDetails) {
              if (detail.packageId) {
                allDetails.push({
                  contractId: id,
                  packageId: detail.packageId,
                  discountNormal: detail.discountNormal,
                  discountUrgent: detail.discountUrgent,
                  discountVeryUrgent: detail.discountVeryUrgent,
                });
              }
            }
          }

          // Step 3: Batch create all details (single query)
          if (allDetails.length > 0) {
            await tx.contractDetail.createMany({ data: allDetails });
          }
        }

        // Fetch updated contract
        const updated = await tx.contract.findUnique({
          where: { id },
          include: this.getContractInclude(),
        });

        return updated;
      });

      return RepositoryResult.ok(result as unknown as ContractWithDetails);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update contract: ${error.message}`);
    }
  }

  async delete(id: number, userId: number): Promise<RepositoryResult<boolean>> {
    try {
      // Use transaction for atomic check-and-update operation
      await this.prisma.$transaction(async (tx) => {
        const contract = await tx.contract.findUnique({
          where: { id },
        });

        if (!contract || contract.trash) {
          throw new Error('Contract not found');
        }

        // Soft delete - set trash flag
        await tx.contract.update({
          where: { id },
          data: {
            trash: 1,
            updatedBy: userId,
          },
        });
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      if (error.message === 'Contract not found') {
        return RepositoryResult.fail('Contract not found');
      }
      return RepositoryResult.fail(`Failed to delete contract: ${error.message}`);
    }
  }

  // ===== Code Generation =====

  /**
   * Generate next contract code using transaction with row-level locking
   * to prevent race conditions under concurrent requests.
   * Format: CON.00001, CON.00002, etc.
   */
  async generateCode(): Promise<RepositoryResult<string>> {
    try {
      const code = await this.prisma.$transaction(async (tx) => {
        // Use FOR UPDATE to lock the rows during code generation
        // This prevents race conditions when multiple requests try to generate codes simultaneously
        const result = await tx.$queryRaw<[{ max_code: string | null }]>`
          SELECT MAX(code) as max_code
          FROM contract
          WHERE code LIKE 'CON.%' AND trash IS NULL
          FOR UPDATE
        `;

        let nextNumber = 1;
        const maxCode = result[0]?.max_code;

        if (maxCode) {
          const match = maxCode.match(/CON\.(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
          }
        }

        return `CON.${String(nextNumber).padStart(5, '0')}`;
      });

      return RepositoryResult.ok(code);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to generate code: ${error.message}`);
    }
  }
}
