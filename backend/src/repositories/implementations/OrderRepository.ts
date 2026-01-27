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
 * Helper to sanitize date values that might be invalid (e.g., '0000-00-00' from MySQL)
 */
function sanitizeDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  try {
    const date = value instanceof Date ? value : new Date(value);
    // Check if date is valid
    if (isNaN(date.getTime())) return null;
    // Check for MySQL zero dates (year 0 or 1970-01-01 from zero timestamp)
    if (date.getFullYear() < 1970) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * Sanitize all date fields in an order object
 */
function sanitizeOrderDates<T extends Record<string, any>>(order: T): T {
  const dateFields = [
    'order_date', 'received_date', 'reviewed_at', 'created_at', 'updated_at',
    'payment_date', 'payment_confirmation_date', 'upload_payment_date',
    'unlocked_date', 'first_reviewed_at', 'revise_at', 'first_revise_at',
    'auto_publish_date', 'orderDate', 'receivedDate', 'reviewedAt', 'createdAt', 'updatedAt'
  ];

  const sanitized = { ...order };
  for (const field of dateFields) {
    if (field in sanitized) {
      sanitized[field] = sanitizeDate(sanitized[field]);
    }
  }
  return sanitized;
}

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

  /**
   * Apply enhanced role-based filtering to a where clause
   * Handles Customer role (8) department filtering and Agency role list filtering
   */
  private applyRoleBasedFilters(where: any, filter: OrderFilter): void {
    // Customer role (8): Filter by customer_id + department
    if (filter.userRole === 8 && filter.userCustomerId) {
      where.customer_id = filter.userCustomerId;

      // If user has specific departments, filter by department
      if (filter.userDepartments && filter.userDepartments.length > 0) {
        // Include orders where contact's department matches user's departments
        // or contact has "All Departement" access
        where.contact = {
          OR: [
            { department: { in: filter.userDepartments } },
            { department: 'All Departement' },
          ],
        };
      }

      // If user has a specific contact, also filter by contact
      if (filter.userContactId) {
        where.contact_id = filter.userContactId;
      }
    }

    // Agency role: Filter by list_customer and list_contact
    if (filter.agencyCustomerIds && filter.agencyCustomerIds.length > 0) {
      where.customer_id = { in: filter.agencyCustomerIds };
    }

    if (filter.agencyContactIds && filter.agencyContactIds.length > 0) {
      // If agency has specific contacts, filter by those contacts
      where.contact_id = { in: filter.agencyContactIds };
    }
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

      // Apply enhanced role-based filtering
      this.applyRoleBasedFilters(where, filter);

      // Use raw query to avoid Prisma's date parsing issues with invalid MySQL dates
      const rawData = await this.prisma.$queryRaw<any[]>`
        SELECT
          o.id,
          o.code,
          o.order_status,
          o.order_priority,
          DATE_FORMAT(o.order_date, '%Y-%m-%d') as order_date,
          o.sub_total,
          o.total,
          o.created_by,
          o.customer_id,
          o.contact_id,
          o.address_id,
          c.id as customer_id_rel,
          c.code as customer_code,
          c.customer_name,
          ct.id as contact_id_rel,
          ct.first_name,
          ct.surname,
          ct.email,
          ct.phone,
          a.id as address_id_rel,
          a.address,
          a.city
        FROM \`order\` o
        LEFT JOIN customer c ON o.customer_id = c.id
        LEFT JOIN contact ct ON o.contact_id = ct.id
        LEFT JOIN address a ON o.address_id = a.id
        WHERE o.trash IS NULL
        ORDER BY o.id DESC
        LIMIT ${limit} OFFSET ${skip}
      `;

      const totalResult = await this.prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(*) as count FROM \`order\` WHERE trash IS NULL
      `;
      const total = Number(totalResult[0]?.count || 0);

      // Transform raw data to expected format
      const data = rawData.map(row => ({
        id: row.id,
        code: row.code,
        order_status: row.order_status,
        order_priority: row.order_priority,
        order_date: row.order_date,
        sub_total: row.sub_total,
        total: row.total,
        created_by: row.created_by,
        customer: row.customer_id_rel ? {
          id: row.customer_id_rel,
          code: row.customer_code,
          customer_name: row.customer_name,
        } : null,
        contact: row.contact_id_rel ? {
          id: row.contact_id_rel,
          first_name: row.first_name,
          surname: row.surname,
          email: row.email,
          phone: row.phone,
        } : null,
        address: row.address_id_rel ? {
          id: row.address_id_rel,
          address: row.address,
          city: row.city,
        } : null,
      }));

      // Sanitize date fields to handle any remaining invalid dates
      const sanitizedData = data.map(order => sanitizeOrderDates(order));

      return RepositoryResult.ok({
        data: sanitizedData as unknown as OrderWithRelations[],
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
              middle_name: true,
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
              state: true,
            },
          },
          quotation: {
            select: {
              id: true,
              code: true,
            },
          },
          preOrder: {
            select: {
              id: true,
              code: true,
            },
          },
          invoice: {
            select: {
              id: true,
              code: true,
            },
          },
          samples: {
            where: { trash: null },
            include: {
              standart: {
                select: {
                  id: true,
                  name: true,
                },
              },
              worksheet: {
                where: { trash: null },
                include: {
                  service: {
                    include: {
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
              },
            },
            orderBy: { id: 'asc' },
          },
        },
      });

      if (!order) {
        return RepositoryResult.fail('Order not found');
      }

      // Sanitize date fields to handle invalid MySQL dates
      return RepositoryResult.ok(sanitizeOrderDates(order) as unknown as OrderWithRelations);
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
          created_at: new Date(),
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

      // Apply enhanced role-based filtering
      this.applyRoleBasedFilters(where, filter);

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

      // Apply enhanced role-based filtering
      this.applyRoleBasedFilters(where, filter);

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

  // ===== Export Operations =====

  async findForCTSExport(filter: OrderFilter): Promise<RepositoryResult<any[]>> {
    try {
      const where: any = {
        trash: null,
        // CTS orders are standard lab testing (lab = 1 or not subcontracted)
        OR: [
          { supplier_id: null },
          { supplier_id: { equals: undefined } },
        ],
      };

      if (filter.dateFrom) {
        where.order_date = { ...where.order_date, gte: filter.dateFrom };
      }
      if (filter.dateTo) {
        where.order_date = { ...where.order_date, lte: filter.dateTo };
      }
      if (filter.customerId) {
        where.customer_id = filter.customerId;
      }
      if (filter.status) {
        where.order_status = Array.isArray(filter.status)
          ? { in: filter.status }
          : filter.status;
      }

      const orders = await this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { customer_name: true },
          },
          samples: {
            where: { trash: null },
            include: {
              standart: true,
              worksheet: {
                where: { trash: null },
                include: {
                  service: {
                    include: {
                      parameter: true,
                      method: {
                        include: { matrix: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { order_date: 'desc' },
        take: filter.limit || 10000,
      });

      // Flatten to export format
      let rowNo = 0;
      const exportData: any[] = [];

      for (const order of orders) {
        for (const sample of order.samples) {
          for (const worksheet of sample.worksheet) {
            rowNo++;
            exportData.push({
              no: rowNo,
              orderCode: order.code,
              orderDate: order.order_date?.toISOString() || '',
              customerName: order.customer?.customer_name || '',
              sampleCode: sample.code,
              sampleName: sample.name,
              matrix: worksheet.service?.method?.matrix?.name || '',
              parameterName: worksheet.service?.parameter?.name || '',
              methodName: worksheet.service?.method?.name || '',
              price: sample.price || 0,
              status: order.order_status,
            });
          }
        }
      }

      return RepositoryResult.ok(exportData);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch CTS export data: ${error.message}`);
    }
  }

  async findForNonCTSExport(filter: OrderFilter): Promise<RepositoryResult<any[]>> {
    try {
      const where: any = {
        trash: null,
        // Non-CTS orders are subcontracted (have supplier_id)
        supplier_id: { not: null },
      };

      if (filter.dateFrom) {
        where.order_date = { ...where.order_date, gte: filter.dateFrom };
      }
      if (filter.dateTo) {
        where.order_date = { ...where.order_date, lte: filter.dateTo };
      }
      if (filter.customerId) {
        where.customer_id = filter.customerId;
      }
      if (filter.status) {
        where.order_status = Array.isArray(filter.status)
          ? { in: filter.status }
          : filter.status;
      }

      const orders = await this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { customer_name: true },
          },
          customer_relation: {
            select: { name: true },
          },
          samples: {
            where: { trash: null },
            include: {
              standart: true,
              worksheet: {
                where: { trash: null },
                include: {
                  service: {
                    include: {
                      parameter: true,
                      method: {
                        include: { matrix: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { order_date: 'desc' },
        take: filter.limit || 10000,
      });

      // Flatten to export format
      let rowNo = 0;
      const exportData: any[] = [];

      for (const order of orders) {
        for (const sample of order.samples) {
          for (const worksheet of sample.worksheet) {
            rowNo++;
            exportData.push({
              no: rowNo,
              orderCode: order.code,
              orderDate: order.order_date?.toISOString() || '',
              customerName: order.customer?.customer_name || '',
              sampleCode: sample.code,
              sampleName: sample.name,
              matrix: worksheet.service?.method?.matrix?.name || '',
              parameterName: worksheet.service?.parameter?.name || '',
              methodName: worksheet.service?.method?.name || '',
              price: sample.price || 0,
              status: order.order_status,
              subcontractor: order.customer_relation?.name || '',
            });
          }
        }
      }

      return RepositoryResult.ok(exportData);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch Non-CTS export data: ${error.message}`);
    }
  }

  async findForCalibrationExport(filter: OrderFilter): Promise<RepositoryResult<any[]>> {
    try {
      const where: any = {
        trash: null,
        // Calibration orders typically have lab = 2 (environmental/calibration lab)
        // or have characteristic = 2 (calibration)
      };

      if (filter.dateFrom) {
        where.order_date = { ...where.order_date, gte: filter.dateFrom };
      }
      if (filter.dateTo) {
        where.order_date = { ...where.order_date, lte: filter.dateTo };
      }
      if (filter.customerId) {
        where.customer_id = filter.customerId;
      }
      if (filter.status) {
        where.order_status = Array.isArray(filter.status)
          ? { in: filter.status }
          : filter.status;
      }

      const orders = await this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { customer_name: true },
          },
          samples: {
            where: { trash: null },
            include: {
              standart: true,
            },
          },
        },
        orderBy: { order_date: 'desc' },
        take: filter.limit || 10000,
      });

      // Flatten to export format for calibration
      let rowNo = 0;
      const exportData: any[] = [];

      for (const order of orders) {
        for (const sample of order.samples) {
          rowNo++;
          exportData.push({
            no: rowNo,
            orderCode: order.code,
            orderDate: order.order_date?.toISOString() || '',
            customerName: order.customer?.customer_name || '',
            equipmentName: sample.name,
            equipmentModel: sample.standart?.name || '',
            serialNumber: sample.code,
            calibrationPoint: '',
            price: sample.price || 0,
            status: order.order_status,
            dueDate: order.due_date?.toISOString() || '',
          });
        }
      }

      return RepositoryResult.ok(exportData);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch calibration export data: ${error.message}`);
    }
  }

  async findActiveCustomers(dateFrom?: Date, dateTo?: Date): Promise<RepositoryResult<any[]>> {
    try {
      const dateFilter: any = {};
      if (dateFrom) {
        dateFilter.gte = dateFrom;
      }
      if (dateTo) {
        dateFilter.lte = dateTo;
      }

      // Get customers with order aggregates
      const customers = await this.prisma.customer.findMany({
        where: {
          trash: null,
          orders: {
            some: {
              trash: null,
              ...(Object.keys(dateFilter).length > 0 ? { order_date: dateFilter } : {}),
            },
          },
        },
        include: {
          orders: {
            where: {
              trash: null,
              ...(Object.keys(dateFilter).length > 0 ? { order_date: dateFilter } : {}),
            },
            select: {
              total: true,
              order_date: true,
            },
            orderBy: { order_date: 'desc' },
          },
        },
      });

      // Transform to export format
      const exportData = customers.map((customer, idx) => {
        const orders = customer.orders;
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const lastOrderDate = orders[0]?.order_date?.toISOString() || '';

        return {
          no: idx + 1,
          customerCode: customer.code || '',
          customerName: customer.customer_name,
          business: customer.business || '',
          totalOrders,
          totalRevenue,
          lastOrderDate,
          salesIncharge: '',
          status: customer.special_customer ? 'Whitelist' : 'Regular',
        };
      });

      // Sort by total revenue descending
      exportData.sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Re-number after sorting
      exportData.forEach((item, idx) => {
        item.no = idx + 1;
      });

      return RepositoryResult.ok(exportData);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch active customers: ${error.message}`);
    }
  }

  async generateOrderReport(dateFrom: Date, dateTo: Date): Promise<RepositoryResult<any[]>> {
    try {
      // Generate monthly report between dates
      const reports: any[] = [];
      const currentDate = new Date(dateFrom);

      while (currentDate <= dateTo) {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

        // Get order statistics for this month
        const [orderStats, statusCounts] = await Promise.all([
          this.prisma.order.aggregate({
            where: {
              trash: null,
              order_date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            _count: true,
            _sum: {
              total: true,
            },
          }),
          this.prisma.order.groupBy({
            by: ['order_status'],
            where: {
              trash: null,
              order_date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            _count: true,
          }),
        ]);

        const totalOrders = orderStats._count || 0;
        const totalRevenue = orderStats._sum.total || 0;

        // Parse status counts
        let completedOrders = 0;
        let cancelledOrders = 0;
        let pendingOrders = 0;

        for (const status of statusCounts) {
          if (status.order_status === 'Complete') {
            completedOrders = status._count;
          } else if (status.order_status === 'Cancelled') {
            cancelledOrders = status._count;
          } else {
            pendingOrders += status._count;
          }
        }

        reports.push({
          period: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`,
          totalOrders,
          totalRevenue,
          averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
          completedOrders,
          cancelledOrders,
          pendingOrders,
        });

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      return RepositoryResult.ok(reports);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to generate order report: ${error.message}`);
    }
  }
}
