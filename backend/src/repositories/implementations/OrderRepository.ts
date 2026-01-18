import { PrismaClient } from '@prisma/client';
import {
  IOrderRepository,
  OrderFilter,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderWithRelations,
  OrderStatus,
  ReviewOrderDTO,
  UploadPaymentDTO,
  InvoiceStatusInfo,
} from '../contracts/IOrderRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildMultiFieldSearchCondition } from '../../utils/searchHelper';
import { orderCodeCache } from '../../services/cacheService';

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
          where.order_status = { in: status };
        } else {
          where.order_status = status;
        }
      }

      // Filter by priority
      if (priority) {
        where.order_priority = priority;
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
          order_status: true,
          order_priority: true,
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
        select: { order_status: true },
      });

      if (!order) {
        return RepositoryResult.fail('Order not found');
      }

      const statusInt = this.getStatusInt(order.order_status);
      const canUpdate = statusInt >= 4; // Reviewed or higher

      return RepositoryResult.ok({
        canUpdate,
        currentStatus: order.order_status,
        reason: canUpdate ? undefined : `Order must be "Reviewed" or later. Current status: "${order.order_status}"`,
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
          order_status: status,
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
          pre_order_id: data.preOrderId,
          quotation_id: data.quotationId,
          order_status: data.status,
          order_priority: data.priority,
          order_date: data.orderDate,
          sub_total: data.subTotal ?? 0,
          percent_discount: data.discountPercent ?? 0,
          percent_vat: data.vatPercent ?? 11,
          total: data.total ?? 0,
          remarks: data.remarks,
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
      if (data.preOrderId !== undefined) updateData.pre_order_id = data.preOrderId;
      if (data.quotationId !== undefined) updateData.quotation_id = data.quotationId;
      if (data.status !== undefined) updateData.order_status = data.status;
      if (data.priority !== undefined) updateData.order_priority = data.priority;
      if (data.orderDate !== undefined) updateData.order_date = data.orderDate;
      if (data.completeDate !== undefined) updateData.complete_date = data.completeDate;
      if (data.subTotal !== undefined) updateData.sub_total = data.subTotal;
      if (data.discountPercent !== undefined) updateData.percent_discount = data.discountPercent;
      if (data.vatPercent !== undefined) updateData.percent_vat = data.vatPercent;
      if (data.total !== undefined) updateData.total = data.total;
      if (data.remarks !== undefined) updateData.remarks = data.remarks;

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
      const cacheKey = `order_sequence_${prefix}`;

      // Try to get last sequence from cache first
      let sequence = orderCodeCache.get<number>(cacheKey);

      if (sequence === undefined) {
        // Cache miss - fetch from database
        const lastOrder = await this.prisma.order.findFirst({
          where: {
            code: { startsWith: prefix },
          },
          orderBy: { code: 'desc' },
          select: { code: true },
        });

        sequence = 0;
        if (lastOrder?.code) {
          const lastSequence = parseInt(lastOrder.code.slice(-7), 10);
          if (!isNaN(lastSequence)) {
            sequence = lastSequence;
          }
        }
      }

      // Increment and cache the new sequence
      sequence++;
      orderCodeCache.set(cacheKey, sequence, 60000); // 1 minute TTL

      const code = `${prefix}${sequence.toString().padStart(7, '0')}`;
      return RepositoryResult.ok(code);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to generate order code: ${error.message}`);
    }
  }

  // ===== Review Workflow =====

  async reviewOrder(id: number, data: ReviewOrderDTO): Promise<RepositoryResult<OrderWithRelations>> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id, trash: null },
      });

      if (!order) {
        return RepositoryResult.fail('Order not found');
      }

      // Validate status transition
      const currentStatus = order.order_status;
      if (data.status === 'Reviewed' && currentStatus !== 'Created' && currentStatus !== 'To Be Verified') {
        return RepositoryResult.fail(`Cannot review order with status "${currentStatus}". Order must be "Created" or "To Be Verified".`);
      }

      const updateData: any = {
        order_status: data.status,
        reviewed_by: data.reviewerId,
        reviewed_at: new Date(),
        updated_by: data.reviewerId,
      };

      // Set first_reviewed_at if this is the first review
      if (!order.first_reviewed_at && data.status === 'Reviewed') {
        updateData.first_reviewed_at = new Date();
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: updateData,
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
          contact: {
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              phone: true,
              department: true,
            },
          },
          address: {
            select: {
              id: true,
              address: true,
              city: true,
            },
          },
        },
      });

      return RepositoryResult.ok(updatedOrder as unknown as OrderWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to review order: ${error.message}`);
    }
  }

  // ===== Payment Workflow =====

  async uploadPayment(id: number, data: UploadPaymentDTO): Promise<RepositoryResult<OrderWithRelations>> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id, trash: null },
      });

      if (!order) {
        return RepositoryResult.fail('Order not found');
      }

      // Validate that order is reviewed before payment upload
      if (order.order_status !== 'Reviewed' && order.order_status !== 'Under Process') {
        return RepositoryResult.fail(`Cannot upload payment for order with status "${order.order_status}". Order must be "Reviewed" or "Under Process".`);
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          payment_document: data.paymentDocument,
          upload_payment_by: data.uploadedBy,
          upload_payment_date: new Date(),
          payment_date: data.paymentDate,
          order_status: OrderStatus.PAYMENT_CONFIRMATION,
          updated_by: data.uploadedBy,
        },
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
          contact: {
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              phone: true,
              department: true,
            },
          },
        },
      });

      return RepositoryResult.ok(updatedOrder as unknown as OrderWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to upload payment: ${error.message}`);
    }
  }

  async confirmPayment(id: number, userId: number): Promise<RepositoryResult<OrderWithRelations>> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id, trash: null },
      });

      if (!order) {
        return RepositoryResult.fail('Order not found');
      }

      if (order.order_status !== OrderStatus.PAYMENT_CONFIRMATION) {
        return RepositoryResult.fail(`Cannot confirm payment for order with status "${order.order_status}". Order must be in "Payment Confirmation" status.`);
      }

      if (!order.payment_document) {
        return RepositoryResult.fail('No payment document uploaded');
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          order_status: OrderStatus.UNDER_PROCESS,
          payment_confirmation_date: new Date(),
          confirmation: 1,
          confirmation_by: userId,
          updated_by: userId,
        },
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
          contact: {
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              phone: true,
              department: true,
            },
          },
        },
      });

      return RepositoryResult.ok(updatedOrder as unknown as OrderWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to confirm payment: ${error.message}`);
    }
  }

  // ===== Revision Workflow =====

  async createRevision(id: number, userId: number, reason?: string): Promise<RepositoryResult<OrderWithRelations>> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id, trash: null },
      });

      if (!order) {
        return RepositoryResult.fail('Order not found');
      }

      // Increment revision number
      const newRevisionNumber = order.total_revisi + 1;

      // Generate new code with revision suffix
      // If code already has -R suffix, replace it. Otherwise append it.
      let newCode = order.code;
      const revisionRegex = /-R\d+$/;
      if (revisionRegex.test(newCode)) {
        newCode = newCode.replace(revisionRegex, `-R${newRevisionNumber}`);
      } else {
        newCode = `${newCode}-R${newRevisionNumber}`;
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          code: newCode,
          total_revisi: newRevisionNumber,
          revise_at: new Date(),
          revise_reason: reason,
          first_revise_at: order.first_revise_at ?? new Date(),
          updated_by: userId,
        },
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
          contact: {
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              phone: true,
              department: true,
            },
          },
        },
      });

      return RepositoryResult.ok(updatedOrder as unknown as OrderWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create revision: ${error.message}`);
    }
  }

  // ===== Unlock Mechanism =====

  async unlockOrder(id: number, userId: number): Promise<RepositoryResult<OrderWithRelations>> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id, trash: null },
      });

      if (!order) {
        return RepositoryResult.fail('Order not found');
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          unlock: 1,
          unlocked_by: userId,
          unlocked_date: new Date(),
          updated_by: userId,
        },
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
          contact: {
            select: {
              id: true,
              first_name: true,
              surname: true,
              email: true,
              phone: true,
              department: true,
            },
          },
        },
      });

      return RepositoryResult.ok(updatedOrder as unknown as OrderWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to unlock order: ${error.message}`);
    }
  }

  // ===== Invoice Integration =====

  async getInvoiceStatusBatch(orderIds: number[]): Promise<RepositoryResult<Map<number, InvoiceStatusInfo>>> {
    try {
      if (orderIds.length === 0) {
        return RepositoryResult.ok(new Map());
      }

      // Query invoice_order junction table with invoice details
      const invoiceOrders = await this.prisma.invoiceOrder.findMany({
        where: {
          order_id: { in: orderIds },
        },
        include: {
          invoice: {
            select: {
              id: true,
              code: true,
              status: true,
              invoice_send_date: true,
            },
          },
        },
        orderBy: {
          invoice_id: 'desc',
        },
      });

      // Build a Map for O(1) lookup instead of O(n) Array.find()
      // This improves overall complexity from O(n²) to O(n)
      const invoiceMap = new Map<number, typeof invoiceOrders[0]>();
      for (const io of invoiceOrders) {
        // Only keep the first (latest due to orderBy desc) invoice for each order
        if (!invoiceMap.has(io.order_id)) {
          invoiceMap.set(io.order_id, io);
        }
      }

      // Build result map using O(1) Map lookups
      const result = new Map<number, InvoiceStatusInfo>();
      for (const orderId of orderIds) {
        const invoiceOrder = invoiceMap.get(orderId);
        if (invoiceOrder?.invoice) {
          result.set(orderId, {
            id: invoiceOrder.invoice.id,
            code: invoiceOrder.invoice.code,
            status: invoiceOrder.invoice.status,
            invoiceSendDate: invoiceOrder.invoice.invoice_send_date,
          });
        } else {
          result.set(orderId, {
            id: null,
            code: null,
            status: 'Not Yet',
          });
        }
      }

      return RepositoryResult.ok(result);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to get invoice status batch: ${error.message}`);
    }
  }

  // ===== Statistics =====

  async getOrderStats(type: 'today' | 'month' | 'year', invoiceDate: boolean = false): Promise<RepositoryResult<number>> {
    try {
      const now = new Date();
      let dateFilter: any = {};

      if (type === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        dateFilter = { gte: startOfDay, lt: endOfDay };
      } else if (type === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        dateFilter = { gte: startOfMonth, lt: endOfMonth };
      } else if (type === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
        dateFilter = { gte: startOfYear, lt: endOfYear };
      }

      const result = await this.prisma.order.aggregate({
        where: {
          trash: null,
          order_date: dateFilter,
        },
        _sum: {
          sub_total: true,
        },
      });

      return RepositoryResult.ok(result._sum.sub_total ?? 0);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to get order stats: ${error.message}`);
    }
  }

  async findWaitingPayment(filter: OrderFilter): Promise<RepositoryResult<PaginatedData<OrderWithRelations>>> {
    try {
      const { page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = {
        trash: null,
        order_status: { in: [OrderStatus.UNDER_PROCESS, OrderStatus.REVIEWED] },
        payment_document: null,
        customer: {
          special_customer: null, // Not whitelist customers
        },
        created_at: { gt: new Date('2017-08-17') },
      };

      if (filter.search) {
        where.code = { contains: filter.search };
      }

      if (filter.customerId) {
        where.customer_id = filter.customerId;
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
                special_customer: true,
                top: true,
              },
            },
            contact: {
              select: {
                id: true,
                first_name: true,
                surname: true,
                email: true,
                phone: true,
                department: true,
              },
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
      return RepositoryResult.fail(`Failed to fetch waiting payment orders: ${error.message}`);
    }
  }

  async findOutstandingWhitelist(filter: OrderFilter): Promise<RepositoryResult<PaginatedData<OrderWithRelations>>> {
    try {
      const { page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      // This is a complex query that requires invoice data
      // Get orders where customer is whitelist, has invoice, invoice not PAID, and overdue
      const where: any = {
        trash: null,
        order_status: { in: [OrderStatus.REVIEWED, OrderStatus.UNDER_PROCESS] },
        customer: {
          special_customer: { not: null }, // Whitelist customers
        },
      };

      if (filter.search) {
        where.code = { contains: filter.search };
      }

      if (filter.customerId) {
        where.customer_id = filter.customerId;
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
                special_customer: true,
                top: true,
              },
            },
            contact: {
              select: {
                id: true,
                first_name: true,
                surname: true,
                email: true,
                phone: true,
                department: true,
              },
            },
            invoice: {
              select: {
                id: true,
                code: true,
                status: true,
                invoice_send_date: true,
              },
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
      return RepositoryResult.fail(`Failed to fetch outstanding whitelist orders: ${error.message}`);
    }
  }
}
