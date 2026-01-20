import { RepositoryResult, PaginatedData } from '../results/RepositoryResult.js';

/**
 * Quotation Status Constants
 */
export const QuotationStatus = {
  CREATED: 'Created',
  ORDER: 'Order',
} as const;

export type QuotationStatusType = (typeof QuotationStatus)[keyof typeof QuotationStatus];

/**
 * Lab Type Constants
 */
export const LabType = {
  STANDARD: '1',
  ENVIRONMENTAL: '2',
} as const;

export type LabTypeValue = (typeof LabType)[keyof typeof LabType];

/**
 * Quotation Priority Constants
 */
export const QuotationPriority = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  VERY_URGENT: 'very urgent',
} as const;

export type QuotationPriorityType = (typeof QuotationPriority)[keyof typeof QuotationPriority];

/**
 * Quotation Filter Options
 */
export interface QuotationFilter {
  search?: string;
  qCode?: string;
  customerId?: number;
  contactId?: number;
  status?: string;
  salesId?: number;
  dateStart?: Date;
  dateEnd?: Date;
  lab?: string;
  sortSubtotal?: 'ASC' | 'DESC';
  orderBy?: string;
  page?: number;
  limit?: number;
  offset?: number;
  userRole?: number;
  userCustomerId?: number;
  userDepartments?: string[];
}

/**
 * Service Detail Input for quotation
 */
export interface ServiceDetailInput {
  serviceId: number;
  quantity: number;
  discount: number;
  idDetail?: number; // For updates
  order?: number; // Display order within sample
}

/**
 * Package Detail Input for quotation
 */
export interface PackageDetailInput {
  packageId: number;
  quantity: number;
  discount: number;
  idDetail?: string; // Format: {packageId}__{indexSample}
  order?: number; // Display order within sample
}

/**
 * Sample Input for quotation
 */
export interface SampleInput {
  name: string;
  quantity: number;
  priority: string;
  services?: ServiceDetailInput[];
  packages?: PackageDetailInput[];
}

/**
 * Product Input for quotation
 */
export interface ProductInput {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  idDetail?: number; // For updates
}

/**
 * Create Quotation DTO
 */
export interface CreateQuotationDTO {
  code: string;
  quoStatus: string;
  quoDate: Date;
  samplingRequest?: string | null;
  samplingDate?: Date | null;
  customerId: number;
  contactId: number;
  addressId: number;
  volume?: string | null;
  remarks?: string | null;
  minVolumeSample?: string;
  subTotal: number;
  percentDiscount?: number;
  percentVat?: number;
  percentPc?: number | null;
  priceGroup?: number | null;
  priority?: string;
  total: number;
  lab?: string;
  createdBy: number;
  samples?: SampleInput[];
  products?: ProductInput[];
}

/**
 * Update Quotation DTO
 */
export interface UpdateQuotationDTO {
  quoStatus?: string;
  quoDate?: Date;
  samplingRequest?: string | null;
  samplingDate?: Date | null;
  customerId?: number;
  contactId?: number;
  addressId?: number;
  volume?: string | null;
  remarks?: string | null;
  minVolumeSample?: string;
  subTotal?: number;
  percentDiscount?: number;
  percentVat?: number;
  percentPc?: number | null;
  priceGroup?: number | null;
  priority?: string;
  total?: number;
  lab?: string;
  updatedBy: number;
  samples?: SampleInput[];
  products?: ProductInput[];
}

/**
 * Quotation Detail (internal representation)
 */
export interface QuotationDetailData {
  id: number;
  sampleName: string;
  quotationId: number;
  serviceId: number;
  sampleDescription: string | null;
  volume: string | null;
  priority: string;
  quantity: number;
  percentDiscount: number;
  packageId: number | null;
  indexArray: number | null;
  indexSample: number | null;
  price: number | null;
  product: number | null;
  serviceMatrix: string | null;
  service?: {
    id: number;
    name: string;
    price: number;
    parameter?: { id: number; name: string };
    method?: { id: number; name: string };
  };
  package?: {
    id: number;
    name: string;
    totalPrice: number | null;
    services?: Array<{
      id: number;
      name: string;
      price: number;
      parameter?: { id: number; name: string };
      method?: { id: number; name: string };
    }>;
  };
}

/**
 * Quotation with relations response
 */
export interface QuotationWithRelations {
  id: number;
  code: string;
  quoStatus: string;
  quoDate: Date;
  samplingRequest: string | null;
  samplingDate: Date | null;
  customerId: number | null;
  contactId: number | null;
  addressId: number | null;
  volume: string | null;
  remarks: string | null;
  minVolumeSample: string | null;
  subTotal: number;
  percentDiscount: number;
  percentVat: number;
  percentPc: number | null;
  priceGroup: number | null;
  priority: string | null;
  total: number;
  lab: string | null;
  expiredDate: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  createdBy: number;
  updatedBy: number | null;
  trash: number | null;
  // Relations
  customer: {
    id: number;
    code: string;
    customer_name: string;
    special_customer: number | null;
    top: number | null;
  } | null;
  contact: {
    id: number;
    first_name: string;
    middle_name: string | null;
    surname: string;
    email: string;
    phone: string;
    department: string | null;
  } | null;
  address: {
    id: number;
    address: string;
    city: string;
    state: string;
    country: string;
  } | null;
  contract?: {
    id: number;
    code: string;
  } | null;
  quotation_detail?: QuotationDetailData[];
  orders?: {
    id: number;
    code: string | null;
    order_status: string | null;
  }[];
}

/**
 * Quotation List Item (for JSON endpoints)
 */
export interface QuotationListItem {
  id: number;
  code: string;
  customer: {
    id: number;
    name: string;
  };
  contact: {
    id: number;
    name: string;
  };
  status: string;
  date: string;
  validDate: string;
  samplingDate: string | null;
  order: {
    id: number | null;
    code: string | null;
  };
  preOrder?: {
    id: number | null;
    code: string | null;
  };
}

/**
 * Fetch JSON Response Item
 */
export interface FetchJsonItem {
  id: number;
  code: string;
  created: string;
  total: string;
  subTotal: string;
  validDate: string;
  customer: {
    id: number;
    name: string;
  };
  contact: {
    id: number;
    name: string;
  };
  creator: {
    id: number;
    name: string;
  };
  status: string;
}

/**
 * Fetch JSON Response with stats
 */
export interface FetchJsonResponse {
  totalCount: number;
  stats: {
    itemCount: number;
    subTotalSum: number;
  };
  items: FetchJsonItem[];
}

/**
 * Report Row Data
 */
export interface ReportRowData {
  quotationCode: string;
  customerName: string;
  contactName: string;
  status: string;
  orderStatus: string | null;
  quotationDate: string;
  creator: string;
  subTotal: number;
  total: number;
}

/**
 * Sample Array Structure (for duplication/edit)
 */
export interface SampleArrayStructure {
  [key: string]: {
    name: string;
    quantity: number;
    priority: string;
    service?: {
      [key: string]: {
        id: number;
        quantity: number;
        discount: number;
        packageStatus?: string;
      };
    };
    product?: string;
    price?: number;
    discount?: number;
    idDetail?: number;
  };
}

/**
 * Quotation Repository Interface
 * Defines all data access operations for Quotation entity
 */
export interface IQuotationRepository {
  // ===== Read Operations =====

  /**
   * Get all quotations with pagination and filters
   */
  findAll(filter: QuotationFilter): Promise<RepositoryResult<PaginatedData<QuotationWithRelations>>>;

  /**
   * Get quotation by ID with all relations
   */
  findById(id: number): Promise<RepositoryResult<QuotationWithRelations | null>>;

  /**
   * Get quotation by code
   */
  findByCode(code: string, excludeId?: number): Promise<RepositoryResult<QuotationWithRelations | null>>;

  /**
   * Get quotations for autocomplete/dropdown (JSON format)
   */
  findForAutocomplete(
    search?: string,
    customerId?: number,
    isDataTable?: boolean
  ): Promise<RepositoryResult<QuotationListItem[]>>;

  /**
   * Get quotations with filtering for standard lab (lab=1)
   */
  findForFetchJson(filter: QuotationFilter): Promise<RepositoryResult<FetchJsonResponse>>;

  /**
   * Get quotations with filtering for environmental lab (lab=2)
   */
  findForFetchJsonEnv(filter: QuotationFilter): Promise<RepositoryResult<FetchJsonResponse>>;

  /**
   * Get quotations for customer portal with department filtering
   */
  findForCustomerPortal(
    filter: QuotationFilter,
    userDepartments?: string[]
  ): Promise<RepositoryResult<PaginatedData<QuotationListItem>>>;

  /**
   * Get report data for CSV export
   */
  getReportData(startDate?: Date, endDate?: Date, includeTrash?: boolean): Promise<RepositoryResult<ReportRowData[]>>;

  // ===== Write Operations =====

  /**
   * Create new quotation with details
   */
  create(data: CreateQuotationDTO): Promise<RepositoryResult<QuotationWithRelations>>;

  /**
   * Update existing quotation with details
   */
  update(id: number, data: UpdateQuotationDTO): Promise<RepositoryResult<QuotationWithRelations>>;

  /**
   * Soft delete quotation
   */
  delete(id: number, userId: number): Promise<RepositoryResult<boolean>>;

  // ===== Code Generation =====

  /**
   * Generate next quotation code
   * Format: QT.YYMM{0000} for standard lab
   * Format: QT.E.YYMM{0000} for environmental lab
   */
  generateCode(labType?: string): Promise<RepositoryResult<string>>;

  // ===== Duplication =====

  /**
   * Get quotation data for duplication
   */
  getForDuplication(id: number): Promise<RepositoryResult<{
    quotation: QuotationWithRelations;
    sampleArray: SampleArrayStructure;
  } | null>>;

  // ===== Detail Operations =====

  /**
   * Get quotation details by quotation ID
   */
  getDetails(quotationId: number): Promise<RepositoryResult<QuotationDetailData[]>>;

  /**
   * Check if quotation has linked order
   */
  hasLinkedOrder(quotationId: number): Promise<RepositoryResult<{ hasOrder: boolean; orderId?: number; orderCode?: string }>>;

  /**
   * Check if quotation has linked pre-order
   */
  hasLinkedPreOrder(quotationId: number): Promise<RepositoryResult<{ hasPreOrder: boolean; preOrderId?: number; preOrderCode?: string }>>;
}
