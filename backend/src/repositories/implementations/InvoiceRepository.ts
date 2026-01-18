import { PrismaClient } from '@prisma/client';
import {
  IInvoiceRepository,
  InvoiceFilter,
  CreateInvoiceDTO,
  UpdateInvoiceDTO,
  InvoiceWithRelations,
  InvoiceSummary,
  InvoiceStatus,
} from '../contracts/IInvoiceRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Build search condition helper
 */
function buildSearchCondition(fields: string[], search: string): any {
  if (!search) return {};
  return {
    OR: fields.map(field => ({ [field]: { contains: search } })),
  };
}

/**
 * Invoice Repository Implementation
 * Concrete implementation of invoice data access operations
 */
export class InvoiceRepository implements IInvoiceRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Select clause for invoice with relations
   */
  private readonly invoiceSelect = {
    id: true,
    code: true,
    faktur_no: true,
    order_id: true,
    remarks: true,
    description: true,
    invoice_date: true,
    invoice_send_date: true,
    purchase_order_no: true,
    attached_document: true,
    payment_document: true,
    awb_no: true,
    payment_status: true,
    payment_date: true,
    receipt_document: true,
    list_order: true,
    grand_total: true,
    sub_total: true,
    status: true,
    created_at: true,
    updated_at: true,
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
      },
    },
    address: {
      select: {
        id: true,
        address: true,
        city: true,
      },
    },
  };

  /**
   * Map Prisma result to InvoiceWithRelations
   */
  private mapToInvoiceWithRelations(data: any): InvoiceWithRelations {
    return {
      id: data.id,
      code: data.code,
      fakturNo: data.faktur_no,
      orderId: data.order_id,
      remarks: data.remarks,
      description: data.description,
      invoiceDate: data.invoice_date,
      invoiceSendDate: data.invoice_send_date,
      purchaseOrderNo: data.purchase_order_no,
      attachedDocument: data.attached_document,
      paymentDocument: data.payment_document,
      awbNo: data.awb_no,
      paymentStatus: data.payment_status,
      paymentDate: data.payment_date,
      receiptDocument: data.receipt_document,
      listOrder: data.list_order,
      grandTotal: data.grand_total,
      subTotal: data.sub_total,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      customer: data.customer
        ? {
            id: data.customer.id,
            code: data.customer.code,
            customerName: data.customer.customer_name,
            specialCustomer: data.customer.special_customer,
            top: data.customer.top,
          }
        : null,
      contact: data.contact
        ? {
            id: data.contact.id,
            firstName: data.contact.first_name,
            surname: data.contact.surname,
            email: data.contact.email,
            phone: data.contact.phone,
          }
        : null,
      address: data.address
        ? {
            id: data.address.id,
            address: data.address.address,
            city: data.address.city,
          }
        : null,
    };
  }

  async findAll(filter: InvoiceFilter): Promise<RepositoryResult<PaginatedData<InvoiceWithRelations>>> {
    try {
      const { search, customerId, contactId, status, dateFrom, dateTo, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = { trash: null };

      // Multi-field search on code
      if (search) {
        Object.assign(where, buildMultiFieldSearchCondition(['code', 'faktur_no'], search));
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

      // Filter by date range
      if (dateFrom) {
        where.invoice_date = { ...where.invoice_date, gte: dateFrom };
      }
      if (dateTo) {
        where.invoice_date = { ...where.invoice_date, lte: dateTo };
      }

      const [data, total] = await Promise.all([
        this.prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          select: this.invoiceSelect,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.invoice.count({ where }),
      ]);

      return RepositoryResult.ok({
        data: data.map((item) => this.mapToInvoiceWithRelations(item)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to fetch invoices');
    }
  }

  async findById(id: number): Promise<RepositoryResult<InvoiceWithRelations | null>> {
    try {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id, trash: null },
        select: this.invoiceSelect,
      });

      if (!invoice) {
        return RepositoryResult.ok(null);
      }

      return RepositoryResult.ok(this.mapToInvoiceWithRelations(invoice));
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to fetch invoice');
    }
  }

  async findByCode(code: string, excludeId?: number): Promise<RepositoryResult<InvoiceWithRelations | null>> {
    try {
      const where: any = { code, trash: null };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const invoice = await this.prisma.invoice.findFirst({
        where,
        select: this.invoiceSelect,
      });

      if (!invoice) {
        return RepositoryResult.ok(null);
      }

      return RepositoryResult.ok(this.mapToInvoiceWithRelations(invoice));
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to fetch invoice');
    }
  }

  async findByCustomerId(customerId: number, limit = 100): Promise<RepositoryResult<InvoiceWithRelations[]>> {
    try {
      const invoices = await this.prisma.invoice.findMany({
        where: { customer_id: customerId, trash: null },
        select: this.invoiceSelect,
        orderBy: { created_at: 'desc' },
        take: limit,
      });

      return RepositoryResult.ok(invoices.map((item) => this.mapToInvoiceWithRelations(item)));
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to fetch invoices');
    }
  }

  async findByOrderIds(orderIds: number[]): Promise<RepositoryResult<Map<number, InvoiceSummary>>> {
    try {
      // Get invoice_order junction records
      const junctions = await this.prisma.invoiceOrder.findMany({
        where: { order_id: { in: orderIds } },
        select: {
          order_id: true,
          invoice_id: true,
        },
      });

      if (junctions.length === 0) {
        return RepositoryResult.ok(new Map());
      }

      // Get unique invoice IDs
      const invoiceIds = [...new Set(junctions.map((j) => j.invoice_id))];

      // Fetch invoices
      const invoices = await this.prisma.invoice.findMany({
        where: { id: { in: invoiceIds }, trash: null },
        select: {
          id: true,
          code: true,
          status: true,
          invoice_send_date: true,
          payment_status: true,
          payment_date: true,
        },
      });

      // Create invoice map
      const invoiceMap = new Map<number, InvoiceSummary>();
      for (const inv of invoices) {
        invoiceMap.set(inv.id, {
          id: inv.id,
          code: inv.code,
          status: inv.status,
          invoiceSendDate: inv.invoice_send_date,
          paymentStatus: inv.payment_status,
          paymentDate: inv.payment_date,
        });
      }

      // Map order_id to invoice summary
      const result = new Map<number, InvoiceSummary>();
      for (const junction of junctions) {
        const invoice = invoiceMap.get(junction.invoice_id);
        if (invoice) {
          result.set(junction.order_id, invoice);
        }
      }

      return RepositoryResult.ok(result);
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to fetch invoice status');
    }
  }

  async create(data: CreateInvoiceDTO): Promise<RepositoryResult<InvoiceWithRelations>> {
    try {
      const invoice = await this.prisma.$transaction(async (tx) => {
        // Create invoice
        const newInvoice = await tx.invoice.create({
          data: {
            code: data.code,
            faktur_no: data.fakturNo,
            order_id: data.orderId,
            remarks: data.remarks,
            description: data.description,
            invoice_date: data.invoiceDate,
            invoice_send_date: data.invoiceSendDate,
            purchase_order_no: data.purchaseOrderNo,
            attached_document: data.attachedDocument,
            customer_id: data.customerId,
            contact_id: data.contactId,
            address_id: data.addressId,
            grand_total: data.grandTotal,
            sub_total: data.subTotal,
            status: data.status || InvoiceStatus.PREPARED_BY_ADMIN,
            created_at: new Date(),
            created_by: data.createdBy,
          },
        });

        // Add to invoice_order junction if orderIds provided
        if (data.orderIds && data.orderIds.length > 0) {
          await tx.invoiceOrder.createMany({
            data: data.orderIds.map((orderId) => ({
              invoice_id: newInvoice.id,
              order_id: orderId,
            })),
          });

          // Update orders to link to this invoice
          await tx.order.updateMany({
            where: { id: { in: data.orderIds } },
            data: { invoice_id: newInvoice.id },
          });
        }

        return newInvoice;
      });

      // Fetch with relations
      const result = await this.findById(invoice.id);
      if (result.isFailure() || !result.getValue()) {
        return RepositoryResult.fail('Failed to fetch created invoice');
      }

      return RepositoryResult.ok(result.getValue()!);
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to create invoice');
    }
  }

  async update(id: number, data: UpdateInvoiceDTO): Promise<RepositoryResult<InvoiceWithRelations>> {
    try {
      await this.prisma.invoice.update({
        where: { id },
        data: {
          code: data.code,
          faktur_no: data.fakturNo,
          remarks: data.remarks,
          description: data.description,
          invoice_date: data.invoiceDate,
          invoice_send_date: data.invoiceSendDate,
          purchase_order_no: data.purchaseOrderNo,
          attached_document: data.attachedDocument,
          awb_no: data.awbNo,
          payment_status: data.paymentStatus,
          payment_date: data.paymentDate,
          receipt_document: data.receiptDocument,
          grand_total: data.grandTotal,
          sub_total: data.subTotal,
          status: data.status,
          updated_by: data.updatedBy,
        },
      });

      const result = await this.findById(id);
      if (result.isFailure() || !result.getValue()) {
        return RepositoryResult.fail('Failed to fetch updated invoice');
      }

      return RepositoryResult.ok(result.getValue()!);
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to update invoice');
    }
  }

  async delete(id: number, userId: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.invoice.update({
        where: { id },
        data: {
          trash: 1,
          updated_by: userId,
        },
      });

      return RepositoryResult.ok(true);
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to delete invoice');
    }
  }

  async generateCode(): Promise<RepositoryResult<string>> {
    try {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const prefix = `INV${year}${month}`;

      // Find the latest code for this month
      const latest = await this.prisma.invoice.findFirst({
        where: {
          code: { startsWith: prefix },
        },
        orderBy: { code: 'desc' },
        select: { code: true },
      });

      let sequence = 1;
      if (latest?.code) {
        const match = latest.code.match(/INV\d{4}(\d+)/);
        if (match) {
          sequence = parseInt(match[1], 10) + 1;
        }
      }

      const code = `${prefix}${sequence.toString().padStart(7, '0')}`;

      return RepositoryResult.ok(code);
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to generate code');
    }
  }

  async updateStatus(id: number, status: string, userId: number): Promise<RepositoryResult<InvoiceWithRelations>> {
    try {
      await this.prisma.invoice.update({
        where: { id },
        data: {
          status,
          updated_by: userId,
        },
      });

      const result = await this.findById(id);
      if (result.isFailure() || !result.getValue()) {
        return RepositoryResult.fail('Failed to fetch updated invoice');
      }

      return RepositoryResult.ok(result.getValue()!);
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to update invoice status');
    }
  }

  async markAsSent(id: number, sendDate: Date, userId: number): Promise<RepositoryResult<InvoiceWithRelations>> {
    try {
      await this.prisma.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.SENT,
          invoice_send_date: sendDate,
          updated_by: userId,
        },
      });

      const result = await this.findById(id);
      if (result.isFailure() || !result.getValue()) {
        return RepositoryResult.fail('Failed to fetch updated invoice');
      }

      return RepositoryResult.ok(result.getValue()!);
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to mark invoice as sent');
    }
  }

  async markAsPaid(
    id: number,
    paymentDate: Date,
    paymentDocument: string | null,
    userId: number
  ): Promise<RepositoryResult<InvoiceWithRelations>> {
    try {
      await this.prisma.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.PAID,
          payment_status: InvoiceStatus.PAID,
          payment_date: paymentDate,
          payment_document: paymentDocument,
          updated_by: userId,
        },
      });

      const result = await this.findById(id);
      if (result.isFailure() || !result.getValue()) {
        return RepositoryResult.fail('Failed to fetch updated invoice');
      }

      return RepositoryResult.ok(result.getValue()!);
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to mark invoice as paid');
    }
  }

  async addOrders(invoiceId: number, orderIds: number[]): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Create junction records
        await tx.invoiceOrder.createMany({
          data: orderIds.map((orderId) => ({
            invoice_id: invoiceId,
            order_id: orderId,
          })),
          skipDuplicates: true,
        });

        // Update orders to link to this invoice
        await tx.order.updateMany({
          where: { id: { in: orderIds } },
          data: { invoice_id: invoiceId },
        });
      });

      return RepositoryResult.ok(true);
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to add orders to invoice');
    }
  }

  async removeOrders(invoiceId: number, orderIds: number[]): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Remove junction records
        await tx.invoiceOrder.deleteMany({
          where: {
            invoice_id: invoiceId,
            order_id: { in: orderIds },
          },
        });

        // Unlink orders from this invoice
        await tx.order.updateMany({
          where: {
            id: { in: orderIds },
            invoice_id: invoiceId,
          },
          data: { invoice_id: null },
        });
      });

      return RepositoryResult.ok(true);
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to remove orders from invoice');
    }
  }

  async getInvoiceOrders(invoiceId: number): Promise<RepositoryResult<number[]>> {
    try {
      const junctions = await this.prisma.invoiceOrder.findMany({
        where: { invoice_id: invoiceId },
        select: { order_id: true },
      });

      return RepositoryResult.ok(junctions.map((j) => j.order_id));
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to get invoice orders');
    }
  }

  async findOutstanding(filter: InvoiceFilter): Promise<RepositoryResult<PaginatedData<InvoiceWithRelations>>> {
    try {
      const { customerId, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = {
        trash: null,
        status: InvoiceStatus.SENT,
        payment_status: { not: InvoiceStatus.PAID },
      };

      if (customerId) {
        where.customer_id = customerId;
      }

      const [data, total] = await Promise.all([
        this.prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          select: this.invoiceSelect,
          orderBy: { invoice_send_date: 'asc' },
        }),
        this.prisma.invoice.count({ where }),
      ]);

      return RepositoryResult.ok({
        data: data.map((item) => this.mapToInvoiceWithRelations(item)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to fetch outstanding invoices');
    }
  }

  async getInvoiceStats(
    type: 'today' | 'month' | 'year'
  ): Promise<RepositoryResult<{ total: number; sent: number; paid: number; outstanding: number }>> {
    try {
      const now = new Date();
      let dateFrom: Date;

      switch (type) {
        case 'today':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          dateFrom = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const baseWhere = {
        trash: null,
        created_at: { gte: dateFrom },
      };

      const [total, sent, paid, outstanding] = await Promise.all([
        this.prisma.invoice.count({ where: baseWhere }),
        this.prisma.invoice.count({
          where: { ...baseWhere, status: InvoiceStatus.SENT },
        }),
        this.prisma.invoice.count({
          where: { ...baseWhere, payment_status: InvoiceStatus.PAID },
        }),
        this.prisma.invoice.count({
          where: {
            ...baseWhere,
            status: InvoiceStatus.SENT,
            payment_status: { not: InvoiceStatus.PAID },
          },
        }),
      ]);

      return RepositoryResult.ok({ total, sent, paid, outstanding });
    } catch (error) {
      return RepositoryResult.fail(error instanceof Error ? error.message : 'Failed to get invoice stats');
    }
  }
}
