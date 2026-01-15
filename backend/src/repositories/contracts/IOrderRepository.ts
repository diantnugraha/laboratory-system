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
  status: string;
  priority: string;
  orderDate: Date;
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
  customer: {
    id: number;
    code: string;
    customer_name: string;
  };
  contact: {
    id: number;
    first_name: string;
    surname: string;
    email: string;
    phone: string;
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
}
