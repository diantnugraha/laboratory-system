import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Analyst Type Filter Options
 */
export interface AnalystTypeFilter {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Analyst Type DTO
 */
export interface CreateAnalystTypeDTO {
  name: string;
  list_service?: string | null;
  created_by?: number;
}

/**
 * Update Analyst Type DTO
 */
export interface UpdateAnalystTypeDTO {
  name?: string;
  list_service?: string | null;
  updated_by?: number | null;
}

/**
 * Dependency Check Result
 */
export interface DependencyCheckResult {
  analystCount: number;
  serviceCount: number;
  hasDependencies: boolean;
}

/**
 * Reverse Migration Result
 */
export interface ReverseMigrationResult {
  results: string[];
  totalProcessed: number;
}

/**
 * Analyst Type Repository Interface (The Contract)
 * Defines all data access operations for AnalystType entity
 */
export interface IAnalystTypeRepository {
  /**
   * Get all analyst types with pagination and search
   * Returns data with _count for analystRules and services
   */
  findAll(filter: AnalystTypeFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get analyst type by ID with counts
   * Includes _count for analystRules and services
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find analyst type by name (for duplicate check)
   */
  findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get analyst types for autocomplete/dropdown (JSON format)
   * Returns total_count, incomplete_results, items/data
   */
  findForAutocomplete(search?: string, dataTable?: boolean): Promise<RepositoryResult<any>>;

  /**
   * Check dependencies before deletion
   * Returns counts of linked analysts and services
   */
  checkDependencies(id: number): Promise<RepositoryResult<DependencyCheckResult>>;

  /**
   * Create new analyst type
   */
  create(data: CreateAnalystTypeDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing analyst type
   */
  update(id: number, data: UpdateAnalystTypeDTO): Promise<RepositoryResult<any>>;

  /**
   * Soft delete analyst type
   */
  delete(id: number): Promise<RepositoryResult<boolean>>;

  /**
   * Reverse migration: Parse list_service and update Service.analyst_type_id
   * Returns list of updated service IDs and total count
   */
  performReverseMigration(): Promise<RepositoryResult<ReverseMigrationResult>>;
}
