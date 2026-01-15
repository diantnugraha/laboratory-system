import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Sample Status Constants
 */
export const SampleStatus = {
  PROCESS: 'Process',
  TO_BE_VERIFIED: 'To Be Verified',
  NEED_TO_REVISED: 'Need to Revised',
  INTERNAL_RETEST: 'Internal Retest',
  CUSTOMER_RETEST: 'Customer Retest',
  VERIFIED_BY_QC: 'Verified by QC',
  APPROVED_BY_TM: 'Approved by TM',
  CANCEL: 'Cancel',
} as const;

export type SampleStatusType = typeof SampleStatus[keyof typeof SampleStatus];

/**
 * Sample Filter Options
 */
export interface SampleFilter {
  search?: string;
  orderId?: number;
  customerId?: number;
  status?: string | string[];
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  offset?: number;
  userRole?: number;
  userCustomerId?: number;
}

/**
 * Create Sample DTO
 */
export interface CreateSampleDTO {
  code: string;
  orderId: number;
  standartId?: number | null;
  name: string;
  description?: string | null;
  sampleType?: string | null;
  sampleCondition?: string | null;
  samplingDate?: Date | null;
  receivedDate?: Date | null;
  quantity?: number;
  unit?: string | null;
  status: string;
  dueDate?: Date | null;
  coaReleaseDueDate?: Date | null;
  createdBy: number;
}

/**
 * Update Sample DTO
 */
export interface UpdateSampleDTO {
  standartId?: number | null;
  name?: string;
  description?: string | null;
  sampleType?: string | null;
  sampleCondition?: string | null;
  samplingDate?: Date | null;
  receivedDate?: Date | null;
  quantity?: number;
  unit?: string | null;
  status?: string;
  dueDate?: Date | null;
  coaReleaseDueDate?: Date | null;
  analysisFinishedDate?: Date | null;
  leadTime?: string | null;
  updatedBy: number;
}

/**
 * Sample with relations response
 */
export interface SampleWithRelations {
  id: number;
  code: string;
  orderId: number;
  standartId: number | null;
  name: string;
  description: string | null;
  sampleType: string | null;
  sampleCondition: string | null;
  samplingDate: Date | null;
  receivedDate: Date | null;
  quantity: number;
  unit: string | null;
  status: string;
  dueDate: Date | null;
  coaReleaseDueDate: Date | null;
  analysisFinishedDate: Date | null;
  leadTime: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  order: {
    id: number;
    code: string;
    status: string;
    priority: string;
    customer: {
      id: number;
      code: string;
      customer_name: string;
    };
  };
  standart?: {
    id: number;
    code: string;
    name: string;
  } | null;
  _count?: {
    worksheets: number;
  };
}

/**
 * Status priority for aggregation (worst to best)
 */
export const STATUS_PRIORITY: Record<string, number> = {
  'Cancel': 0,
  'Customer Retest': 1,
  'Internal Retest': 2,
  'Need to Revised': 3,
  'Process': 4,
  'To Be Verified': 5,
  'Verified by QC': 6,
  'Approved by TM': 7,
};

/**
 * Sample Repository Interface
 * Defines all data access operations for Sample entity
 */
export interface ISampleRepository {
  // ===== Read Operations =====

  /**
   * Get all samples with pagination and filters
   */
  findAll(filter: SampleFilter): Promise<RepositoryResult<PaginatedData<SampleWithRelations>>>;

  /**
   * Get sample by ID with all relations
   */
  findById(id: number): Promise<RepositoryResult<SampleWithRelations | null>>;

  /**
   * Get sample by code
   */
  findByCode(code: string, excludeId?: number): Promise<RepositoryResult<SampleWithRelations | null>>;

  /**
   * Get samples for autocomplete/dropdown (JSON format)
   */
  findForAutocomplete(search?: string, orderId?: number): Promise<RepositoryResult<any[]>>;

  /**
   * Get samples by order ID
   */
  findByOrderId(orderId: number): Promise<RepositoryResult<SampleWithRelations[]>>;

  // ===== Status Operations =====

  /**
   * Update sample status
   */
  updateStatus(id: number, status: string, userId: number): Promise<RepositoryResult<SampleWithRelations>>;

  /**
   * Recalculate sample status based on its worksheets
   * Returns the worst status among worksheets
   */
  recalculateStatusFromWorksheets(sampleId: number): Promise<RepositoryResult<string>>;

  /**
   * Check if all worksheets are verified
   */
  checkAllWorksheetsVerified(sampleId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Check if all worksheets are approved
   */
  checkAllWorksheetsApproved(sampleId: number): Promise<RepositoryResult<boolean>>;

  // ===== Write Operations =====

  /**
   * Create new sample
   */
  create(data: CreateSampleDTO): Promise<RepositoryResult<SampleWithRelations>>;

  /**
   * Update existing sample
   */
  update(id: number, data: UpdateSampleDTO): Promise<RepositoryResult<SampleWithRelations>>;

  /**
   * Soft delete sample
   */
  delete(id: number, userId: number): Promise<RepositoryResult<boolean>>;

  // ===== Code Generation =====

  /**
   * Generate next sample code
   * Format: SAM{YY}{MM}{0000000}
   */
  generateCode(): Promise<RepositoryResult<string>>;

  // ===== Sample Analyst Operations =====

  /**
   * Save analyst type for sample (from service)
   */
  saveAnalystType(sampleId: number, analystTypeId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Get analyst types for sample
   */
  getAnalystTypes(sampleId: number): Promise<RepositoryResult<number[]>>;
}
