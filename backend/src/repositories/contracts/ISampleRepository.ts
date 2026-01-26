import { RepositoryResult, PaginatedData } from '../results/RepositoryResult.js';

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
  ECOA_DRAFT_SENT: 'ECOA Draft Sent',
  COA_RELEASED: 'COA Released',
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
  volume?: string | null;
  sampleStorage?: string | null;
  receivedDate?: Date | null;
  quantity?: number;
  priority?: string;
  status?: string;
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
  volume?: string | null;
  sampleStorage?: string | null;
  receivedDate?: Date | null;
  quantity?: number;
  priority?: string;
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
  order_id: number;
  standart_id: number | null;
  name: string;
  description: string | null;
  volume: string | null;
  sample_storage: string | null;
  received_date: Date | null;
  due_date: Date | null;
  coa_release_due_date: Date | null;
  priority: string;
  sample_status: string;
  lead_time: string | null;
  analysis_finished_date: Date | null;
  quantity: number | null;
  result_summary: string | null;
  coa_released_date: Date | null;
  verification_status_micro: number | null;
  verification_status_chem: number | null;
  auto_publish: number | null;
  auto_publish_date: Date | null;
  created_at: Date;
  updated_at: Date | null;
  created_by: number;
  updated_by: number | null;
  trash: number | null;
  order: {
    id: number;
    code: string;
    order_status: string;
    priority: string | null;
    customer?: {
      id: number;
      code: string;
      customer_name: string;
      special_customer?: number | null;
    } | null;
  };
  standart?: {
    id: number;
    code: string;
    name: string;
  } | null;
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
  'ECOA Draft Sent': 8,
  'COA Released': 9,
};

// ===== NEW INTERFACES FOR WORKFLOW OPERATIONS =====

/**
 * Sample Approval Options
 */
export interface ApproveSampleOptions {
  publishCoa?: boolean;
  sendEmail?: boolean;
  resultSummary?: string | null;
}

/**
 * Sample Approval Result
 */
export interface SampleApprovalResult {
  sample: SampleWithRelations;
  coaCreated: boolean;
  coaCode?: string;
  coaId?: number;
  autoPublishDate?: Date;
  orderStatusUpdated: boolean;
}

/**
 * Sample Cancellation Result
 */
export interface SampleCancellationResult {
  sample: SampleWithRelations;
  worksheetsCancelled: number;
  orderTrashed: boolean;
}

/**
 * Receive Sample DTO
 */
export interface ReceiveSampleDTO {
  receivedDate: Date;
  dueDate: Date;
  coaReleaseDueDate: Date;
  name?: string;
  description?: string | null;
  quantity?: number;
}

/**
 * Dashboard Filter for SampleTest endpoints
 */
export interface SampleDashboardFilter extends SampleFilter {
  /** Filter by due date status */
  dueDateStatus?: 'delayed' | 'today' | 'upcoming';
  /** Filter by retest type */
  retestStatus?: 'internal' | 'customer';
  /** Filter for samples waiting payment */
  waitingPayment?: boolean;
  /** Filter by analyst type */
  analystTypeId?: number;
  /** Filter by booking status: null=unbooked, notnull=booked, number=specific user */
  bookedBy?: number | 'null' | 'notnull';
  /** Include COA information */
  includeCoa?: boolean;
  /** Include customer details */
  includeCustomer?: boolean;
  /** Sort field */
  orderBy?: string;
  /** Sort direction */
  sortDir?: 'asc' | 'desc';
}

/**
 * Report Filter
 */
export interface SampleReportFilter {
  dateFrom: Date;
  dateTo: Date;
  customerId?: number;
  status?: string[];
  includeTrash?: boolean;
}

/**
 * Sample Report Data
 */
export interface SampleReportData {
  id: number;
  code: string;
  name: string;
  status: string;
  priority: string;
  receivedDate: Date | null;
  dueDate: Date | null;
  coaReleaseDueDate: Date | null;
  coaReleasedDate: Date | null;
  analysisFinishedDate: Date | null;
  leadTime: string | null;
  orderCode: string;
  orderStatus: string;
  customerCode: string;
  customerName: string;
  worksheetCount: number;
  worksheetApprovedCount: number;
  createdAt: Date;
}

/**
 * Sample with extended relations for dashboard
 */
export interface SampleDashboardItem extends SampleWithRelations {
  /** COA information if included */
  coa?: {
    id: number;
    code: string | null;
    status: string;
    publishedDate: Date | null;
  } | null;
  /** Remaining time until due */
  remainingTime?: string;
  /** Is sample overdue */
  isOverdue?: boolean;
  /** Analyst booking info */
  analyst?: {
    id: number;
    displayName: string;
  } | null;
  /** Whether sample is available for booking (for Analyst role) */
  available?: boolean;
}

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

  // ===== Workflow Operations =====

  /**
   * Approve sample (TM approval)
   * - Updates sample status to 'Approved by TM' or 'ECOA Draft Sent'
   * - Updates worksheets to 'Approved by TM'
   * - Creates/updates COA record if applicable
   * - Sets auto_publish_date for COA
   */
  approveSample(
    id: number,
    userId: number,
    options?: ApproveSampleOptions
  ): Promise<RepositoryResult<SampleApprovalResult>>;

  /**
   * Verify sample (QC verification)
   * - Verifies worksheets matching user's analyst type authorization
   * - Updates verification_status_micro or verification_status_chem
   * - Updates sample status to 'Verified by QC' if all worksheets verified
   */
  verifySample(
    id: number,
    userId: number,
    analystTypeIds: number[]
  ): Promise<RepositoryResult<SampleWithRelations>>;

  /**
   * Cancel sample with cascade
   * - Updates sample status to 'Cancel'
   * - Cancels all associated worksheets
   * - Trashes order if all samples are cancelled
   */
  cancelSample(
    id: number,
    userId: number,
    reason?: string
  ): Promise<RepositoryResult<SampleCancellationResult>>;

  /**
   * Receive sample
   * - Updates received_date, due_date, coa_release_due_date
   * - Optionally updates name, description, quantity
   */
  receiveSample(
    id: number,
    data: ReceiveSampleDTO,
    userId: number
  ): Promise<RepositoryResult<SampleWithRelations>>;

  // ===== Dashboard Queries =====

  /**
   * Find delayed samples (past COA release due date)
   */
  findDelayedSamples(
    filter: SampleDashboardFilter
  ): Promise<RepositoryResult<PaginatedData<SampleDashboardItem>>>;

  /**
   * Find samples due today
   */
  findSamplesDueToday(
    filter: SampleDashboardFilter
  ): Promise<RepositoryResult<PaginatedData<SampleDashboardItem>>>;

  /**
   * Find samples in retest status
   */
  findRetestSamples(
    filter: SampleDashboardFilter
  ): Promise<RepositoryResult<PaginatedData<SampleDashboardItem>>>;

  /**
   * Find samples needing revision
   */
  findRevisionSamples(
    filter: SampleDashboardFilter
  ): Promise<RepositoryResult<PaginatedData<SampleDashboardItem>>>;

  /**
   * Find samples waiting for payment
   */
  findWaitingPaymentSamples(
    filter: SampleDashboardFilter
  ): Promise<RepositoryResult<PaginatedData<SampleDashboardItem>>>;

  // ===== Report Operations =====

  /**
   * Find samples for report export
   */
  findForReport(
    filter: SampleReportFilter
  ): Promise<RepositoryResult<SampleReportData[]>>;
}
