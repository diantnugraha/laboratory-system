import { RepositoryResult, PaginatedData } from '../results/RepositoryResult.js';

/**
 * PreOrder Priority Constants
 */
export const PreOrderPriority = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  VERY_URGENT: 'very-urgent',
} as const;

export type PreOrderPriorityType = typeof PreOrderPriority[keyof typeof PreOrderPriority];

/**
 * Lab Type Constants
 */
export const LabType = {
  STANDARD: 1,
  ENVIRONMENTAL: 2,
} as const;

export type LabTypeValue = typeof LabType[keyof typeof LabType];

/**
 * PreOrder Characteristic Constants
 */
export const PreOrderCharacteristic = {
  PERISHABLE: 1,
  NOT_PERISHABLE: 2,
} as const;

/**
 * PreOrder Filter Options
 */
export interface PreOrderFilter {
  qCode?: string;
  customerId?: number;
  creator?: string;
  orderId?: 'null' | 'notnull' | number;
  priority?: string;
  receivedDateStart?: Date;
  receivedDateEnd?: Date;
  characteristic?: number;
  completeDateStatus?: 'null' | 'notnull';
  lab?: number;
  page?: number;
  limit?: number;
  orderBy?: string;
  userRole?: number;
  userCustomerId?: number;
}

/**
 * PreSample Input for create/update
 */
export interface PreSampleInput {
  id?: number;
  standartId?: number | null;
  code?: string;
  name: string;
  description?: string | null;
  volume?: string | null;
  sampleStorage?: string | null;
  priority?: string | null;
  customFields?: string | null;
  indexSample?: number;
  indexArray?: number;
}

/**
 * Create PreOrder DTO
 */
export interface CreatePreOrderDTO {
  customerId: number;
  contactId: number;
  quotationId?: number | null;
  receivedDate?: Date | null;
  delivery?: string | null;
  receiptNumber?: string | null;
  driverId?: number | null;
  submitedBy: string;
  sampleQuantity?: number;
  priority?: string | null;
  document?: string | null;
  coveringLetter?: string | null;
  testingParameters?: string | null;
  remarks?: string | null;
  characteristic?: number | null;
  lab: number;
  subcon?: number | null;
  subconId?: number | null;
  subconDue?: Date | null;
  notesCustomer?: string | null;
  createdBy: number;
  samples?: PreSampleInput[];
}

/**
 * Update PreOrder DTO
 */
export interface UpdatePreOrderDTO {
  customerId?: number;
  contactId?: number;
  quotationId?: number | null;
  receivedDate?: Date | null;
  delivery?: string | null;
  receiptNumber?: string | null;
  driverId?: number | null;
  submitedBy?: string;
  sampleQuantity?: number;
  priority?: string | null;
  document?: string | null;
  coveringLetter?: string | null;
  testingParameters?: string | null;
  remarks?: string | null;
  characteristic?: number | null;
  lab?: number;
  subcon?: number | null;
  subconId?: number | null;
  subconDue?: Date | null;
  notesCustomer?: string | null;
  updatedBy: number;
  samples?: PreSampleInput[];
}

/**
 * PreSample with relations
 */
export interface PreSampleWithRelations {
  id: number;
  preOrderId: number;
  standartId: number | null;
  code: string;
  name: string;
  description: string | null;
  volume: string | null;
  sampleStorage: string | null;
  priority: string | null;
  customFields: string | null;
  indexSample: number | null;
  indexArray: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  standart?: {
    id: number;
    code: string;
    name: string;
  } | null;
}

/**
 * PreOrder with relations response
 */
export interface PreOrderWithRelations {
  id: number;
  code: string;
  customerId: number;
  quotationId: number | null;
  contactId: number;
  receivedDate: Date | null;
  delivery: string | null;
  receiptNumber: string | null;
  driverId: number | null;
  orderId: number | null;
  submitedBy: string;
  sampleQuantity: number;
  priority: string | null;
  document: string | null;
  coveringLetter: string | null;
  testingParameters: string | null;
  completeDate: Date | null;
  remarks: string | null;
  unlock: number | null;
  characteristic: number | null;
  lab: number;
  subcon: number | null;
  subconId: number | null;
  subconDue: Date | null;
  notesCustomer: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: number | null;
  updatedBy: number | null;
  trash: number | null;
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
    email: string | null;
    phone: string | null;
    department: string | null;
  };
  quotation?: {
    id: number;
    code: string;
  } | null;
  driver?: {
    id: number;
    name: string;
  } | null;
  orders?: {
    id: number;
    code: string;
    order_status: string;
  }[];
  pre_sample?: PreSampleWithRelations[];
  creator?: {
    id: number;
    display_name: string;
  } | null;
  _count?: {
    pre_sample: number;
    orders: number;
  };
}

/**
 * Outstanding Info Response
 */
export interface OutstandingInfo {
  hasOutstanding: boolean;
  amount: number;
  daysPastDue: number;
  isWhitelist: boolean;
  threshold: number;
}

/**
 * Can Create Order Response
 */
export interface CanCreateOrderInfo {
  canCreate: boolean;
  isDocumentComplete: boolean;
  hasOrder: boolean;
  hasOutstanding: boolean;
  isUnlocked: boolean;
  outstandingAmount?: number;
  reasons: string[];
}

/**
 * PreOrder Autocomplete Item
 */
export interface PreOrderAutocompleteItem {
  id: number;
  code: string;
  receivedDate: Date | null;
  sampleQuantity: number;
  customer: {
    id: number;
    name: string;
  };
  contact: {
    id: number;
    name: string;
  };
  hasOrder: boolean;
}

/**
 * PreOrder Repository Interface
 * Defines all data access operations for PreOrder entity
 */
export interface IPreOrderRepository {
  // ===== Read Operations =====

  /**
   * Get all pre-orders with pagination and filters
   */
  findAll(filter: PreOrderFilter): Promise<RepositoryResult<PaginatedData<PreOrderWithRelations>>>;

  /**
   * Get pre-order by ID with all relations
   */
  findById(id: number): Promise<RepositoryResult<PreOrderWithRelations | null>>;

  /**
   * Get pre-order by code
   */
  findByCode(code: string, excludeId?: number): Promise<RepositoryResult<PreOrderWithRelations | null>>;

  /**
   * Get pre-orders for autocomplete/dropdown (JSON format)
   */
  findForAutocomplete(search?: string, customerId?: number): Promise<RepositoryResult<PreOrderAutocompleteItem[]>>;

  /**
   * Get pre-orders in DataTables format
   */
  findForDataTables(
    filter: PreOrderFilter,
    sEcho: number,
    iDisplayStart: number,
    iDisplayLength: number,
    sSearch?: string
  ): Promise<RepositoryResult<any>>;

  // ===== Sample Operations =====

  /**
   * Get all samples for a pre-order
   */
  getSamples(preOrderId: number): Promise<RepositoryResult<PreSampleWithRelations[]>>;

  // ===== Write Operations =====

  /**
   * Create new pre-order with samples
   */
  create(data: CreatePreOrderDTO): Promise<RepositoryResult<PreOrderWithRelations>>;

  /**
   * Create pre-order from existing quotation
   */
  createFromQuotation(quotationId: number, data: Partial<CreatePreOrderDTO>): Promise<RepositoryResult<PreOrderWithRelations>>;

  /**
   * Update existing pre-order with samples
   */
  update(id: number, data: UpdatePreOrderDTO): Promise<RepositoryResult<PreOrderWithRelations>>;

  /**
   * Soft delete pre-order and its samples
   */
  delete(id: number, userId: number): Promise<RepositoryResult<boolean>>;

  // ===== Code Generation =====

  /**
   * Generate next pre-order code
   * Format: POD.{YYMM}{0000} (Standard) or POD.E.{YYMM}{0000} (Environmental)
   */
  generateCode(labType?: number): Promise<RepositoryResult<string>>;

  /**
   * Generate next pre-sample code
   * Format: PSC.{00000}
   */
  generateSampleCode(): Promise<RepositoryResult<string>>;

  // ===== Business Logic =====

  /**
   * Check if pre-order documents are complete
   * Complete when: document + covering_letter + testing_parameters are all filled
   */
  checkDocumentComplete(id: number): Promise<RepositoryResult<boolean>>;

  /**
   * Check outstanding invoices for customer
   * Standard: > 63 days
   * Whitelist: customer.top + 3 days
   */
  checkOutstanding(customerId: number): Promise<RepositoryResult<OutstandingInfo>>;

  /**
   * Check if pre-order can create an order
   * Requirements: documents complete + no existing order + (no outstanding OR unlocked)
   */
  canCreateOrder(id: number): Promise<RepositoryResult<CanCreateOrderInfo>>;

  /**
   * Unlock pre-order to bypass outstanding check
   * Only SuperAdmin and TechnicalManager can unlock
   */
  unlock(id: number, userId: number): Promise<RepositoryResult<PreOrderWithRelations>>;

  /**
   * Mark pre-order as complete when all documents are filled
   */
  markComplete(id: number, userId: number): Promise<RepositoryResult<PreOrderWithRelations>>;
}
