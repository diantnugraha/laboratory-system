import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Order Status Constants
 */
export const OrderStatus = {
  CREATED: 'Created',
  TO_BE_VERIFIED: 'To Be Verified',
  NEED_TO_REVISE: 'Need to Revise',
  REVIEWED: 'Reviewed',
  UNDER_PROCESS: 'Under Process',
  WAITING_REVISION: 'Waiting Revision',
  CUSTOMER_RETEST: 'Customer Retest',
  COMPLETE: 'Complete',
  CANCELLED: 'Cancelled',
  PAYMENT_CONFIRMATION: 'Payment Confirmation',
  SUBCONTRACTED: 'Subcontracted',
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

/**
 * Order Priority Constants
 */
export const OrderPriority = {
  NORMAL: 'Normal',
  URGENT: 'Urgent',
  VERY_URGENT: 'Very Urgent',
} as const;

export type OrderPriorityType = typeof OrderPriority[keyof typeof OrderPriority];

/**
 * Order Filter Options
 */
export interface OrderFilter {
  search?: string;
  customerId?: number;
  contactId?: number;
  status?: string | string[];
  priority?: string;
  dateFrom?: Date;
  dateTo?: Date;
  lab?: number;
  page?: number;
  limit?: number;
  offset?: number;
  userRole?: number;
  userCustomerId?: number;
  // Enhanced role-based filtering
  userContactId?: number;           // For contact-specific filtering
  userDepartments?: string[];       // For department-based filtering (Customer role)
  agencyCustomerIds?: number[];     // For agency role filtering (list_customer)
  agencyContactIds?: number[];      // For agency role filtering (list_contact)
}

/**
 * Create Order DTO
 */
export interface CreateOrderDTO {
  code: string;
  customerId: number;
  contactId: number;
  addressId?: number | null;
  contractId?: number | null;
  preOrderId?: number | null;
  quotationId?: number | null;
  status: string;
  priority: string;
  orderDate: Date;
  dueDate?: Date | null;
  subTotal?: number;
  discountPercent?: number;
  discountValue?: number;
  vatPercent?: number;
  vatValue?: number;
  total?: number;
  remarks?: string | null;
  notesInternal?: string | null;
  lab?: number;
  createdBy: number;
}

/**
 * Update Order DTO
 */
export interface UpdateOrderDTO {
  customerId?: number;
  contactId?: number;
  addressId?: number | null;
  contractId?: number | null;
  preOrderId?: number | null;
  quotationId?: number | null;
  status?: string;
  priority?: string;
  orderDate?: Date;
  dueDate?: Date | null;
  completeDate?: Date | null;
  subTotal?: number;
  discountPercent?: number;
  discountValue?: number;
  vatPercent?: number;
  vatValue?: number;
  total?: number;
  remarks?: string | null;
  notesInternal?: string | null;
  lab?: number;
  updatedBy: number;
}

/**
 * Review Order DTO
 */
export interface ReviewOrderDTO {
  status: 'Reviewed' | 'To Be Verified' | 'Cancelled';
  reviewerId: number;
  reason?: string;
}

/**
 * Upload Payment DTO
 */
export interface UploadPaymentDTO {
  paymentDocument: string;
  paymentDate?: Date;
  uploadedBy: number;
}

/**
 * Invoice Status Response
 */
export interface InvoiceStatusInfo {
  id: number | null;
  code: string | null;
  status: string;
  invoiceSendDate?: Date | null;
}

/**
 * Order with relations response
 */
export interface OrderWithRelations {
  id: number;
  code: string;
  customerId: number;
  contactId: number;
  addressId: number | null;
  contractId: number | null;
  preOrderId: number | null;
  quotationId: number | null;
  invoiceId: number | null;
  status: string;
  priority: string;
  orderDate: Date;
  receivedDate: Date | null;
  dueDate: Date | null;
  completeDate: Date | null;
  subTotal: number;
  discountPercent: number;
  discountValue: number;
  vatPercent: number;
  vatValue: number;
  total: number;
  remarks: string | null;
  notesInternal: string | null;
  lab: number;
  createdAt: Date;
  updatedAt: Date | null;
  // Review workflow
  reviewedBy: number | null;
  reviewedAt: Date | null;
  // Payment workflow
  paymentDocument: string | null;
  uploadPaymentBy: number | null;
  uploadPaymentDate: Date | null;
  paymentDate: Date | null;
  paymentConfirmationDate: Date | null;
  // Revision workflow
  totalRevisi: number;
  reviseAt: Date | null;
  reviseReason: string | null;
  // Unlock mechanism
  unlock: number | null;
  unlockedBy: number | null;
  unlockedDate: Date | null;
  // Relations
  customer: {
    id: number;
    code: string;
    customer_name: string;
    special_customer: number | null;
    top: number | null;
  };
  contact: {
    id: number;
    first_name: string;
    surname: string;
    email: string;
    phone: string;
    department: string | null;
  };
  address?: {
    id: number;
    address: string;
    city: string;
  } | null;
  contract?: {
    id: number;
    code: string;
    period: string;
  } | null;
  invoice?: {
    id: number;
    code: string | null;
    status: string;
  } | null;
  _count?: {
    samples: number;
  };
}

/**
 * Order Repository Interface
 * Defines all data access operations for Order entity
 */
export interface IOrderRepository {
  // ===== Read Operations =====

  /**
   * Get all orders with pagination and filters
   */
  findAll(filter: OrderFilter): Promise<RepositoryResult<PaginatedData<OrderWithRelations>>>;

  /**
   * Get order by ID with all relations
   */
  findById(id: number): Promise<RepositoryResult<OrderWithRelations | null>>;

  /**
   * Get order by code
   */
  findByCode(code: string, excludeId?: number): Promise<RepositoryResult<OrderWithRelations | null>>;

  /**
   * Get orders for autocomplete/dropdown (JSON format)
   */
  findForAutocomplete(search?: string, customerId?: number): Promise<RepositoryResult<any[]>>;

  /**
   * Get orders by customer ID
   */
  findByCustomerId(customerId: number, limit?: number): Promise<RepositoryResult<OrderWithRelations[]>>;

  // ===== Status Operations =====

  /**
   * Get order status as integer for comparison
   */
  getStatusInt(status: string): number;

  /**
   * Check if order status allows worksheet updates
   * Order must be >= "Reviewed" status
   */
  canUpdateWorksheets(orderId: number): Promise<RepositoryResult<{
    canUpdate: boolean;
    currentStatus: string;
    reason?: string;
  }>>;

  /**
   * Update order status
   */
  updateStatus(id: number, status: string, userId: number): Promise<RepositoryResult<OrderWithRelations>>;

  // ===== Write Operations =====

  /**
   * Create new order
   */
  create(data: CreateOrderDTO): Promise<RepositoryResult<OrderWithRelations>>;

  /**
   * Update existing order
   */
  update(id: number, data: UpdateOrderDTO): Promise<RepositoryResult<OrderWithRelations>>;

  /**
   * Soft delete order
   */
  delete(id: number, userId: number): Promise<RepositoryResult<boolean>>;

  // ===== Code Generation =====

  /**
   * Generate next order code
   * Format: ORD{YY}{MM}{0000000}
   */
  generateCode(): Promise<RepositoryResult<string>>;

  // ===== Review Workflow =====

  /**
   * Review order (approve/reject)
   */
  reviewOrder(id: number, data: ReviewOrderDTO): Promise<RepositoryResult<OrderWithRelations>>;

  // ===== Payment Workflow =====

  /**
   * Upload payment document
   */
  uploadPayment(id: number, data: UploadPaymentDTO): Promise<RepositoryResult<OrderWithRelations>>;

  /**
   * Confirm payment (admin action)
   */
  confirmPayment(id: number, userId: number): Promise<RepositoryResult<OrderWithRelations>>;

  // ===== Revision Workflow =====

  /**
   * Create revision of an order
   * Increments total_revisi and appends -R{n} to code
   */
  createRevision(id: number, userId: number, reason?: string): Promise<RepositoryResult<OrderWithRelations>>;

  // ===== Unlock Mechanism =====

  /**
   * Unlock a locked order for editing
   */
  unlockOrder(id: number, userId: number): Promise<RepositoryResult<OrderWithRelations>>;

  // ===== Invoice Integration =====

  /**
   * Get invoice status for multiple orders in batch
   */
  getInvoiceStatusBatch(orderIds: number[]): Promise<RepositoryResult<Map<number, InvoiceStatusInfo>>>;

  // ===== Statistics =====

  /**
   * Get order statistics for dashboard
   */
  getOrderStats(type: 'today' | 'month' | 'year', invoiceDate?: boolean): Promise<RepositoryResult<number>>;

  /**
   * Get waiting payment orders (non-whitelist customers)
   */
  findWaitingPayment(filter: OrderFilter): Promise<RepositoryResult<PaginatedData<OrderWithRelations>>>;

  /**
   * Get outstanding whitelist orders (overdue invoices)
   */
  findOutstandingWhitelist(filter: OrderFilter): Promise<RepositoryResult<PaginatedData<OrderWithRelations>>>;

  // ===== Export Operations =====

  /**
   * Find orders for CTS (Customer Testing Service) export
   * CTS orders are standard lab testing orders
   */
  findForCTSExport(filter: OrderFilter): Promise<RepositoryResult<any[]>>;

  /**
   * Find orders for Non-CTS export
   * Non-CTS includes subcontracted testing services
   */
  findForNonCTSExport(filter: OrderFilter): Promise<RepositoryResult<any[]>>;

  /**
   * Find orders for Calibration export
   */
  findForCalibrationExport(filter: OrderFilter): Promise<RepositoryResult<any[]>>;

  /**
   * Find active customers with order summary
   */
  findActiveCustomers(dateFrom?: Date, dateTo?: Date): Promise<RepositoryResult<any[]>>;

  /**
   * Generate order report by date range
   */
  generateOrderReport(dateFrom: Date, dateTo: Date): Promise<RepositoryResult<any[]>>;
}
