import { PrismaClient } from '@prisma/client';
import {
  IOrderRepository,
  OrderFilter,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderWithRelations,
  OrderStatus,
} from '../contracts/IOrderRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildMultiFieldSearchCondition } from '../../utils/searchHelper';

/**
 * Order Repository Implementation
 * Concrete implementation of order data access operations
 */
export class OrderRepository implements IOrderRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Status to integer mapping for comparison
   */
  private readonly STATUS_INT_MAP: Record<string, number> = {
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

  getStatusInt(status: string): number {
    return this.STATUS_INT_MAP[status] ?? 0;
  }

  async findAll(filter: OrderFilter): Promise<RepositoryResult<PaginatedData<OrderWithRelations>>> {
    try {
      const { search, customerId, contactId, status, priority, dateFrom, dateTo, lab, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = { trash: null };

      // Multi-field search on code
      if (search) {
        Object.assign(where, buildMultiFieldSearchCondition(['code'], search));
      }

      // Filter by customer
      if (customerId) {
        where.customer_id = customerId;
      }

      // Filter by contact
      if (contactId) {
        where.contact_id = contactId;
      }

      // Filter by status
      if (status) {
        if (Array.isArray(status)) {
          where.status = { in: status };
        } else {
          where.status = status;
        }
      }

      // Filter by priority
      if (priority) {
        where.priority = priority;
      }

      // Filter by date range
      if (dateFrom) {
        where.order_date = { ...where.order_date, gte: dateFrom };
      }
      if (dateTo) {
        where.order_date = { ...where.order_date, lte: dateTo };
      }

      // Filter by lab
      if (lab !== undefined) {
        where.lab = lab;
      }

      // Customer role filter
      if (filter.userRole === 8 && filter.userCustomerId) {
        where.customer_id = filter.userCustomerId;
      }

      const [data, total] = await Promise.all([
        this.prisma.order.findMany({
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
            contact: {
              select: {
                id: true,
                first_name: true,
                surname: true,
                email: true,
                phone: true,
              },
            },
            address: {
              select: {
                id: true,
                address: true,
                city: true,
              },
            },
            contract: {
              select: {
                id: true,
                code: true,
                period: true,
              },
            },
            _count: {
              select: { samples: true },
            },
          },
        }),
        this.prisma.order.count({ where }),
      ]);

      return RepositoryResult.ok({
        data: data as unknown as OrderWithRelations[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch orders: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<OrderWithRelations | null>> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id, trash: null },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
            },
          },
          contact: {
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              phone: true,
            },
          },
          address: {
            select: {
              id: true,
              address: true,
              city: true,
            },
          },
          contract: {
            select: {
              id: true,
              code: true,
              period: true,
            },
          },
          _count: {
            select: { samples: true },
          },
        },
      });

      if (!order) {
        return RepositoryResult.fail('Order not found');
      }

      return RepositoryResult.ok(order as unknown as OrderWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch order: ${error.message}`);
    }
  }

  async findByCode(code: string, excludeId?: number): Promise<RepositoryResult<OrderWithRelations | null>> {
    try {
      const where: any = {
        code: { equals: code, mode: 'insensitive' },
        trash: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const order = await this.prisma.order.findFirst({
        where,
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
            },
          },
          contact: {
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      return RepositoryResult.ok(order as unknown as OrderWithRelations | null);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to find order by code: ${error.message}`);
    }
  }

  async findForAutocomplete(search?: string, customerId?: number): Promise<RepositoryResult<any[]>> {
    try {
      const where: any = { trash: null };

      if (search) {
        where.code = { contains: search, mode: 'insensitive' };
      }

      if (customerId) {
        where.customer_id = customerId;
      }

      const orders = await this.prisma.order.findMany({
        where,
        select: {
          id: true,
          code: true,
          status: true,
          priority: true,
          customer: {
            select: {
              id: true,
              customer_name: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        take: 20,
      });

      return RepositoryResult.ok(orders);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch orders for autocomplete: ${error.message}`);
    }
  }

  async findByCustomerId(customerId: number, limit: number = 10): Promise<RepositoryResult<OrderWithRelations[]>> {
    try {
      const orders = await this.prisma.order.findMany({
        where: {
          customer_id: customerId,
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
          contact: {
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        take: limit,
      });

      return RepositoryResult.ok(orders as unknown as OrderWithRelations[]);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch orders by customer: ${error.message}`);
    }
  }

  async canUpdateWorksheets(orderId: number): Promise<RepositoryResult<{
    canUpdate: boolean;
    currentStatus: string;
    reason?: string;
  }>> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, trash: null },
        select: { status: true },
      });

      if (!order) {
        return RepositoryResult.fail('Order not found');
      }

      const statusInt = this.getStatusInt(order.status);
      const canUpdate = statusInt >= 4; // Reviewed or higher

      return RepositoryResult.ok({
        canUpdate,
        currentStatus: order.status,
        reason: canUpdate ? undefined : `Order must be "Reviewed" or later. Current status: "${order.status}"`,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check order status: ${error.message}`);
    }
  }

  async updateStatus(id: number, status: string, userId: number): Promise<RepositoryResult<OrderWithRelations>> {
    try {
      const order = await this.prisma.order.update({
        where: { id },
        data: {
          status,
          updated_by: userId,
          complete_date: status === OrderStatus.COMPLETE ? new Date() : undefined,
        },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
            },
          },
          contact: {
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      return RepositoryResult.ok(order as unknown as OrderWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update order status: ${error.message}`);
    }
  }

  async create(data: CreateOrderDTO): Promise<RepositoryResult<OrderWithRelations>> {
    try {
      const order = await this.prisma.order.create({
        data: {
          code: data.code,
          customer_id: data.customerId,
          contact_id: data.contactId,
          address_id: data.addressId,
          contract_id: data.contractId,
          pre_order_id: data.preOrderId,
          quotation_id: data.quotationId,
          status: data.status,
          priority: data.priority,
          order_date: data.orderDate,
          due_date: data.dueDate,
          sub_total: data.subTotal ?? 0,
          discount_percent: data.discountPercent ?? 0,
          discount_value: data.discountValue ?? 0,
          vat_percent: data.vatPercent ?? 11,
          vat_value: data.vatValue ?? 0,
          total: data.total ?? 0,
          remarks: data.remarks,
          notes_internal: data.notesInternal,
          lab: data.lab ?? 0,
          created_by: data.createdBy,
        },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
            },
          },
          contact: {
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      return RepositoryResult.ok(order as unknown as OrderWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create order: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateOrderDTO): Promise<RepositoryResult<OrderWithRelations>> {
    try {
      const updateData: any = {
        updated_by: data.updatedBy,
      };

      // Only update fields that are provided
      if (data.customerId !== undefined) updateData.customer_id = data.customerId;
      if (data.contactId !== undefined) updateData.contact_id = data.contactId;
      if (data.addressId !== undefined) updateData.address_id = data.addressId;
      if (data.contractId !== undefined) updateData.contract_id = data.contractId;
      if (data.preOrderId !== undefined) updateData.pre_order_id = data.preOrderId;
      if (data.quotationId !== undefined) updateData.quotation_id = data.quotationId;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.orderDate !== undefined) updateData.order_date = data.orderDate;
      if (data.dueDate !== undefined) updateData.due_date = data.dueDate;
      if (data.completeDate !== undefined) updateData.complete_date = data.completeDate;
      if (data.subTotal !== undefined) updateData.sub_total = data.subTotal;
      if (data.discountPercent !== undefined) updateData.discount_percent = data.discountPercent;
      if (data.discountValue !== undefined) updateData.discount_value = data.discountValue;
      if (data.vatPercent !== undefined) updateData.vat_percent = data.vatPercent;
      if (data.vatValue !== undefined) updateData.vat_value = data.vatValue;
      if (data.total !== undefined) updateData.total = data.total;
      if (data.remarks !== undefined) updateData.remarks = data.remarks;
      if (data.notesInternal !== undefined) updateData.notes_internal = data.notesInternal;
      if (data.lab !== undefined) updateData.lab = data.lab;

      const order = await this.prisma.order.update({
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
          contact: {
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              phone: true,
            },
          },
          address: {
            select: {
              id: true,
              address: true,
              city: true,
            },
          },
          contract: {
            select: {
              id: true,
              code: true,
              period: true,
            },
          },
        },
      });

      return RepositoryResult.ok(order as unknown as OrderWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update order: ${error.message}`);
    }
  }

  async delete(id: number, userId: number): Promise<RepositoryResult<boolean>> {
    try {
      // Check if order has samples
      const sampleCount = await this.prisma.sample.count({
        where: { order_id: id, trash: null },
      });

      if (sampleCount > 0) {
        return RepositoryResult.fail(`Cannot delete order with ${sampleCount} sample(s). Delete samples first.`);
      }

      await this.prisma.order.update({
        where: { id },
        data: {
          trash: 1,
          updated_by: userId,
        },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete order: ${error.message}`);
    }
  }

  async generateCode(): Promise<RepositoryResult<string>> {
    try {
      const now = new Date();
      const yearMonth = now.toISOString().slice(2, 4) + (now.getMonth() + 1).toString().padStart(2, '0');
      const prefix = `ORD${yearMonth}`;

      const lastOrder = await this.prisma.order.findFirst({
        where: {
          code: { startsWith: prefix },
        },
        orderBy: { code: 'desc' },
        select: { code: true },
      });

      let sequence = 1;
      if (lastOrder?.code) {
        const lastSequence = parseInt(lastOrder.code.slice(-7), 10);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }

      const code = `${prefix}${sequence.toString().padStart(7, '0')}`;
      return RepositoryResult.ok(code);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to generate order code: ${error.message}`);
    }
  }
}
