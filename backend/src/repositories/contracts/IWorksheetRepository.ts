import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Worksheet Status Constants
 */
export const WorksheetStatus = {
  PROCESS: 'Process',
  TO_BE_VERIFIED: 'To Be Verified',
  NEED_TO_REVISED: 'Need to Revised',
  INTERNAL_RETEST: 'Internal Retest',
  CUSTOMER_RETEST: 'Customer Retest',
  VERIFIED_BY_QC: 'Verified by QC',
  APPROVED_BY_TM: 'Approved by TM',
  CANCEL: 'Cancel',
} as const;

export type WorksheetStatusType = typeof WorksheetStatus[keyof typeof WorksheetStatus];

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
 * Worksheet Filter Options
 */
export interface WorksheetFilter {
  search?: string;
  sampleId?: number;
  orderId?: number;
  serviceId?: number;
  analystId?: number;
  analystTypeId?: number;
  customerId?: number;
  status?: string | string[];
  isSubcontract?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  priority?: string;
  page?: number;
  limit?: number;
  offset?: number;
  userRole?: number;
  userCustomerId?: number;
  userAnalystTypeIds?: number[];
}

/**
 * Create Worksheet DTO
 */
export interface CreateWorksheetDTO {
  code: string;
  sampleId: number;
  serviceId: number;
  packageId?: number | null;
  standartId?: number | null;
  status?: string;
  discount?: number | null;
  indexArray?: number | null;
  createdBy: number;
}

/**
 * Update Worksheet Result DTO (Analyst submitting result)
 */
export interface UpdateWorksheetResultDTO {
  result?: string | null;
  nResult?: string | null;
  unit?: string | null;
  remarks?: string | null;
  document?: string | null;
  updatedBy: number;
}

/**
 * Verify Worksheet DTO (QC action)
 */
export interface VerifyWorksheetDTO {
  verifiedBy: number;
  message?: string;
}

/**
 * Approve Worksheet DTO (TM action)
 */
export interface ApproveWorksheetDTO {
  approvedBy: number;
  message?: string;
}

/**
 * Revision Request DTO (QC action)
 */
export interface RevisionRequestDTO {
  requestedBy: number;
  message: string;
}

/**
 * Retest Request DTO (QC/Customer action)
 */
export interface RetestRequestDTO {
  requestedBy: number;
  message: string;
  isCustomerRetest: boolean;
}

/**
 * Subcontract Update DTO
 */
export interface SubcontractUpdateDTO {
  airWayBill?: string | null;
  subconSendDate?: Date | null;
  subconReceivedDate?: Date | null;
  subconEndDate?: Date | null;
  updatedBy: number;
}

/**
 * Worksheet with relations response
 */
export interface WorksheetWithRelations {
  id: number;
  code: string;
  sampleId: number;
  serviceId: number;
  packageId: number | null;
  standartId: number | null;
  status: string;
  result: string | null;
  nResult: string | null;
  resultHistory: string | null;
  unit: string | null;
  remarks: string | null;
  document: string | null;
  analystId: number | null;
  worksheetDate: Date | null;
  finishDate: Date | null;
  supervisorId: number | null;
  qcId: number | null;
  verifyQcDate: Date | null;
  managerId: number | null;
  airWayBill: string | null;
  subconSendDate: Date | null;
  subconReceivedDate: Date | null;
  subconEndDate: Date | null;
  totalRetest: number;
  totalRevision: number;
  totalCustomerRetest: number;
  discount: number | null;
  indexArray: number | null;
  nonParameter: number | null;
  createdAt: Date;
  updatedAt: Date | null;
  sample: {
    id: number;
    code: string;
    name: string;
    status: string;
    dueDate: Date | null;
    receivedDate: Date | null;
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
  };
  service: {
    id: number;
    code: string;
    name: string;
    unit: string | null;
    status: string | null;
    price: number;
    analystType: {
      id: number;
      name: string;
    } | null;
    subcontractor: {
      id: number;
      lab_name: string;
    } | null;
    parameter: {
      id: number;
      name: string;
    };
    method: {
      id: number;
      name: string;
    };
  };
  analyst?: {
    id: number;
    display_name: string;
  } | null;
  qc?: {
    id: number;
    display_name: string;
  } | null;
  manager?: {
    id: number;
    display_name: string;
  } | null;
}

/**
 * Status Update Result
 */
export interface StatusUpdateResult {
  worksheet: WorksheetWithRelations;
  sampleStatusChanged: boolean;
  orderStatusChanged: boolean;
  newSampleStatus?: string;
  newOrderStatus?: string;
}

/**
 * Analyst Authorization Check
 */
export interface AnalystAuthorizationCheck {
  isAuthorized: boolean;
  reason?: string;
}

/**
 * DataTables Response Format (for legacy API compatibility)
 */
export interface DataTablesResponse {
  sEcho: number;
  iTotalRecords: number;
  iTotalDisplayRecords: number;
  aaData: any[][];
}

/**
 * Worksheet Repository Interface
 * Defines all data access operations for Worksheet entity
 */
export interface IWorksheetRepository {
  // ===== Read Operations =====

  /**
   * Get all worksheets with pagination and filters
   * Supports analyst type filtering for authorization
   */
  findAll(filter: WorksheetFilter): Promise<RepositoryResult<PaginatedData<WorksheetWithRelations>>>;

  /**
   * Get worksheet by ID with all relations
   */
  findById(id: number): Promise<RepositoryResult<WorksheetWithRelations | null>>;

  /**
   * Get worksheet by code
   */
  findByCode(code: string): Promise<RepositoryResult<WorksheetWithRelations | null>>;

  /**
   * Get worksheets for DataTables format (legacy API support)
   */
  findForDataTables(
    filter: WorksheetFilter,
    sEcho: number,
    iDisplayStart: number,
    iDisplayLength: number,
    sSearch?: string
  ): Promise<RepositoryResult<DataTablesResponse>>;

  /**
   * Get worksheets for autocomplete/dropdown (JSON format)
   */
  findForAutocomplete(search?: string, sampleId?: number, limit?: number): Promise<RepositoryResult<any[]>>;

  /**
   * Get worksheets by sample ID
   */
  findBySampleId(sampleId: number): Promise<RepositoryResult<WorksheetWithRelations[]>>;

  /**
   * Get worksheets by order ID (through sample)
   */
  findByOrderId(orderId: number): Promise<RepositoryResult<WorksheetWithRelations[]>>;

  // ===== Authorization Operations =====

  /**
   * Check if analyst is authorized to access worksheet
   * Based on service.analyst_type_id matching user's analyst_rules
   */
  checkAnalystAuthorization(worksheetId: number, userId: number): Promise<RepositoryResult<AnalystAuthorizationCheck>>;

  /**
   * Get user's authorized analyst type IDs
   */
  getUserAnalystTypeIds(userId: number): Promise<RepositoryResult<number[]>>;

  // ===== Validation Operations =====

  /**
   * Check if order status allows worksheet updates
   * Order must be >= "Reviewed" status
   */
  checkOrderStatusForUpdate(worksheetId: number): Promise<RepositoryResult<{
    canUpdate: boolean;
    orderStatus: string;
    reason?: string;
  }>>;

  /**
   * Validate worksheet status transition
   */
  validateStatusTransition(
    currentStatus: string,
    targetStatus: string,
    userRole: number
  ): Promise<RepositoryResult<{ isValid: boolean; reason?: string }>>;

  // ===== Write Operations =====

  /**
   * Create new worksheet
   */
  create(data: CreateWorksheetDTO): Promise<RepositoryResult<WorksheetWithRelations>>;

  /**
   * Bulk create worksheets (for sample creation)
   */
  createMany(worksheets: CreateWorksheetDTO[]): Promise<RepositoryResult<number>>;

  /**
   * Update worksheet result (Analyst submitting result)
   * Changes status to "To Be Verified"
   */
  updateResult(id: number, data: UpdateWorksheetResultDTO, userId: number, userRole: number): Promise<RepositoryResult<StatusUpdateResult>>;

  /**
   * Verify worksheet (QC action)
   * Changes status to "Verified by QC"
   */
  verify(id: number, data: VerifyWorksheetDTO): Promise<RepositoryResult<StatusUpdateResult>>;

  /**
   * Approve worksheet (Technical Manager action)
   * Changes status to "Approved by TM"
   */
  approve(id: number, data: ApproveWorksheetDTO): Promise<RepositoryResult<StatusUpdateResult>>;

  /**
   * Request revision (QC action)
   * Changes status to "Need to Revised"
   */
  requestRevision(id: number, data: RevisionRequestDTO): Promise<RepositoryResult<StatusUpdateResult>>;

  /**
   * Request internal retest (QC action)
   * Changes status to "Internal Retest"
   */
  requestInternalRetest(id: number, data: RetestRequestDTO): Promise<RepositoryResult<StatusUpdateResult>>;

  /**
   * Request customer retest
   * Changes status to "Customer Retest"
   */
  requestCustomerRetest(id: number, data: RetestRequestDTO): Promise<RepositoryResult<StatusUpdateResult>>;

  /**
   * Cancel worksheet
   */
  cancel(id: number, userId: number, reason?: string): Promise<RepositoryResult<StatusUpdateResult>>;

  /**
   * Quick submit result (simplified result entry)
   */
  quickSubmit(id: number, result: string, unit: string | undefined, nResult: string | undefined, userId: number, userRole: number): Promise<RepositoryResult<WorksheetWithRelations>>;

  /**
   * Update subcontract fields
   */
  updateSubcontract(id: number, data: SubcontractUpdateDTO): Promise<RepositoryResult<WorksheetWithRelations>>;

  /**
   * Soft delete worksheet
   */
  delete(id: number, userId: number): Promise<RepositoryResult<boolean>>;

  // ===== Status Cascade Operations =====

  /**
   * Recalculate sample status based on its worksheets
   * Returns worst status among worksheets
   */
  recalculateSampleStatus(sampleId: number): Promise<RepositoryResult<string>>;

  /**
   * Update order to Under Process if needed
   */
  updateOrderToUnderProcess(sampleId: number): Promise<RepositoryResult<boolean>>;

  // ===== Code Generation =====

  /**
   * Generate next worksheet code
   * Format: WS{YY}{MM}{0000000}
   */
  generateCode(): Promise<RepositoryResult<string>>;
}
