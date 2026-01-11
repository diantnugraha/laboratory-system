import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Contract Filter Options
 */
export interface ContractFilter {
  search?: string;
  customerId?: number;
  periodToStart?: Date;
  periodToEnd?: Date;
  priority?: number;
  offset?: number;
  limit?: number;
  userRole?: number;
  userCustomerId?: number;
}

/**
 * Create Contract DTO
 */
export interface CreateContractDTO {
  code: string;
  customerId: number;
  period: string;
  periodFrom: Date;
  periodTo: Date;
  periodAlias?: string | null;
  normalDay: number;
  urgentDay: number;
  veryUrgentDay: number;
  statusService: string;
  discount?: number;
  discountUrgent?: number;
  discountVeryUrgent?: number;
  promotionId?: number | null;
  remarks?: string | null;
  documents?: string | null;
  createdBy: number;
}

/**
 * Contract Detail DTO (for services/packages)
 */
export interface ContractDetailDTO {
  id?: number;
  serviceId?: number | null;
  packageId?: number | null;
  discountNormal: number;
  discountUrgent: number;
  discountVeryUrgent: number;
}

/**
 * Update Contract DTO
 */
export interface UpdateContractDTO {
  code?: string;
  customerId?: number;
  period?: string;
  periodFrom?: Date;
  periodTo?: Date;
  periodAlias?: string | null;
  normalDay?: number;
  urgentDay?: number;
  veryUrgentDay?: number;
  statusService?: string;
  discount?: number;
  discountUrgent?: number;
  discountVeryUrgent?: number;
  promotionId?: number | null;
  remarks?: string | null;
  documents?: string | null;
  updatedBy: number;
}

/**
 * Contract with details response
 */
export interface ContractWithDetails {
  id: number;
  code: string;
  customerId: number;
  period: string;
  periodFrom: Date;
  periodTo: Date;
  periodAlias: string | null;
  documents: any;
  normalDay: number;
  urgentDay: number;
  veryUrgentDay: number;
  statusService: string;
  discount: number | null;
  discountUrgent: number | null;
  discountVeryUrgent: number | null;
  promotionId: number | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  customer: {
    id: number;
    code: string;
    customer_name: string;
    special_customer: number;
    top: number;
  };
  details: ContractDetailDTO[];
}

/**
 * Overlap check result
 */
export interface OverlapCheckResult {
  hasOverlap: boolean;
  overlappingContract?: {
    id: number;
    code: string;
    periodFrom: Date;
    periodTo: Date;
  };
}

/**
 * Contract Repository Interface
 * Defines all data access operations for Contract entity
 */
export interface IContractRepository {
  // ===== Read Operations =====

  /**
   * Get all contracts with pagination and filters
   */
  findAll(filter: ContractFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get contract by ID with customer and details
   */
  findById(id: number): Promise<RepositoryResult<ContractWithDetails | null>>;

  /**
   * Get active contract for customer at specific date
   */
  findByCustomerId(customerId: number, date?: Date): Promise<RepositoryResult<ContractWithDetails | null>>;

  /**
   * Find contract by code (for duplicate check)
   */
  findByCode(code: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get contracts for autocomplete/dropdown (JSON format)
   */
  findForAutocomplete(search?: string, dataTable?: boolean): Promise<RepositoryResult<any[]>>;

  /**
   * Get contracts with fetch filters
   */
  findWithFilters(filter: ContractFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  // ===== Validation Operations =====

  /**
   * Check if there's overlapping contract for same customer
   */
  checkOverlap(
    customerId: number,
    periodFrom: Date,
    periodTo: Date,
    excludeId?: number
  ): Promise<RepositoryResult<OverlapCheckResult>>;

  // ===== Write Operations =====

  /**
   * Create new contract with optional details
   */
  create(
    data: CreateContractDTO,
    serviceDetails?: ContractDetailDTO[],
    packageDetails?: ContractDetailDTO[]
  ): Promise<RepositoryResult<ContractWithDetails>>;

  /**
   * Update existing contract with optional details
   */
  update(
    id: number,
    data: UpdateContractDTO,
    serviceDetails?: ContractDetailDTO[],
    packageDetails?: ContractDetailDTO[]
  ): Promise<RepositoryResult<ContractWithDetails>>;

  /**
   * Soft delete contract
   */
  delete(id: number, userId: number): Promise<RepositoryResult<boolean>>;
}
