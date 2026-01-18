import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Lab Filter Options
 */
export interface LabFilter {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Lab DTO
 */
export interface CreateLabDTO {
  name: string;
}

/**
 * Update Lab DTO
 */
export interface UpdateLabDTO {
  name: string;
}

/**
 * Dependency Check Result
 */
export interface LabDependencyCheckResult {
  parameterCount: number;
  unitCount: number;
  hasDependencies: boolean;
}

/**
 * Lab Repository Interface (The Contract)
 * Defines all data access operations for Lab entity
 */
export interface ILabRepository {
  /**
   * Get all labs with pagination and filters
   */
  findAll(filter: LabFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get lab by ID
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find lab by name (for duplicate check)
   */
  findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get labs for autocomplete/dropdown (JSON format)
   */
  findForAutocomplete(search?: string, dataTable?: boolean): Promise<RepositoryResult<any>>;

  /**
   * Create new lab
   */
  create(data: CreateLabDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing lab
   */
  update(id: number, data: UpdateLabDTO): Promise<RepositoryResult<any>>;

  /**
   * Soft delete lab
   */
  delete(id: number): Promise<RepositoryResult<boolean>>;

  /**
   * Check if lab has dependencies (parameters, units)
   */
  checkDependencies(id: number): Promise<RepositoryResult<LabDependencyCheckResult>>;
}
