import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Invoice Status Constants
 */
export const InvoiceStatus = {
  PREPARED_BY_ADMIN: 'Prepared by admin',
  NOT_YET: 'Not Yet',
  SENT: 'Sent',
  PAID: 'PAID',
} as const;

export type InvoiceStatusType = typeof InvoiceStatus[keyof typeof InvoiceStatus];

/**
 * Invoice Filter Options
 */
export interface InvoiceFilter {
  search?: string;
  customerId?: number;
  contactId?: number;
  status?: string | string[];
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Create Invoice DTO
 */
export interface CreateInvoiceDTO {
  code?: string;
  fakturNo?: string;
  orderId?: number;
  remarks?: string;
  description?: string;
  invoiceDate?: Date;
  invoiceSendDate?: Date;
  purchaseOrderNo?: string;
  attachedDocument?: string;
  customerId?: number;
  contactId?: number;
  addressId?: number;
  grandTotal?: number;
  subTotal?: number;
  status?: string;
  createdBy: number;
  orderIds?: number[]; // Multiple orders for invoice_order junction
}

/**
 * Update Invoice DTO
 */
export interface UpdateInvoiceDTO {
  code?: string;
  fakturNo?: string;
  remarks?: string;
  description?: string;
  invoiceDate?: Date;
  invoiceSendDate?: Date;
  purchaseOrderNo?: string;
  attachedDocument?: string;
  awbNo?: string;
  paymentStatus?: string;
  paymentDate?: Date;
  receiptDocument?: string;
  grandTotal?: number;
  subTotal?: number;
  status?: string;
  updatedBy: number;
}

/**
 * Invoice with relations response
 */
export interface InvoiceWithRelations {
  id: number;
  code: string | null;
  fakturNo: string | null;
  orderId: number | null;
  remarks: string | null;
  description: string | null;
  invoiceDate: Date | null;
  invoiceSendDate: Date | null;
  purchaseOrderNo: string | null;
  attachedDocument: string | null;
  paymentDocument: string | null;
  awbNo: string | null;
  paymentStatus: string | null;
  paymentDate: Date | null;
  receiptDocument: string | null;
  listOrder: string | null;
  grandTotal: number | null;
  subTotal: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date | null;
  customer?: {
    id: number;
    code: string;
    customerName: string;
    specialCustomer: number | null;
    top: number | null;
  } | null;
  contact?: {
    id: number;
    firstName: string;
    surname: string;
    email: string;
    phone: string;
  } | null;
  address?: {
    id: number;
    address: string;
    city: string;
  } | null;
  orders?: {
    id: number;
    code: string;
    status: string;
    total: number;
  }[];
}

/**
 * Invoice Summary for Order
 */
export interface InvoiceSummary {
  id: number;
  code: string | null;
  status: string;
  invoiceSendDate: Date | null;
  paymentStatus: string | null;
  paymentDate: Date | null;
}

/**
 * Invoice Repository Interface
 * Defines all data access operations for Invoice entity
 */
export interface IInvoiceRepository {
  // ===== Read Operations =====

  /**
   * Get all invoices with pagination and filters
   */
  findAll(filter: InvoiceFilter): Promise<RepositoryResult<PaginatedData<InvoiceWithRelations>>>;

  /**
   * Get invoice by ID with all relations
   */
  findById(id: number): Promise<RepositoryResult<InvoiceWithRelations | null>>;

  /**
   * Get invoice by code
   */
  findByCode(code: string, excludeId?: number): Promise<RepositoryResult<InvoiceWithRelations | null>>;

  /**
   * Get invoices by customer ID
   */
  findByCustomerId(customerId: number, limit?: number): Promise<RepositoryResult<InvoiceWithRelations[]>>;

  /**
   * Get invoices for specific orders
   */
  findByOrderIds(orderIds: number[]): Promise<RepositoryResult<Map<number, InvoiceSummary>>>;

  // ===== Write Operations =====

  /**
   * Create new invoice
   */
  create(data: CreateInvoiceDTO): Promise<RepositoryResult<InvoiceWithRelations>>;

  /**
   * Update existing invoice
   */
  update(id: number, data: UpdateInvoiceDTO): Promise<RepositoryResult<InvoiceWithRelations>>;

  /**
   * Soft delete invoice
   */
  delete(id: number, userId: number): Promise<RepositoryResult<boolean>>;

  // ===== Code Generation =====

  /**
   * Generate next invoice code
   * Format: INV{YY}{MM}{0000000}
   */
  generateCode(): Promise<RepositoryResult<string>>;

  // ===== Status Operations =====

  /**
   * Update invoice status
   */
  updateStatus(id: number, status: string, userId: number): Promise<RepositoryResult<InvoiceWithRelations>>;

  /**
   * Mark invoice as sent
   */
  markAsSent(id: number, sendDate: Date, userId: number): Promise<RepositoryResult<InvoiceWithRelations>>;

  /**
   * Mark invoice as paid
   */
  markAsPaid(id: number, paymentDate: Date, paymentDocument: string | null, userId: number): Promise<RepositoryResult<InvoiceWithRelations>>;

  // ===== Order Integration =====

  /**
   * Add orders to invoice
   */
  addOrders(invoiceId: number, orderIds: number[]): Promise<RepositoryResult<boolean>>;

  /**
   * Remove orders from invoice
   */
  removeOrders(invoiceId: number, orderIds: number[]): Promise<RepositoryResult<boolean>>;

  /**
   * Get orders for invoice
   */
  getInvoiceOrders(invoiceId: number): Promise<RepositoryResult<number[]>>;

  // ===== Statistics =====

  /**
   * Get outstanding invoices (sent but not paid, past due date)
   */
  findOutstanding(filter: InvoiceFilter): Promise<RepositoryResult<PaginatedData<InvoiceWithRelations>>>;

  /**
   * Get invoice statistics for dashboard
   */
  getInvoiceStats(type: 'today' | 'month' | 'year'): Promise<RepositoryResult<{
    total: number;
    sent: number;
    paid: number;
    outstanding: number;
  }>>;
}
