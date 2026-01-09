import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Parameter Filter Options
 */
export interface ParameterFilter {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Parameter DTO
 */
export interface CreateParameterDTO {
  name: string;
  lab_id: number;
}

/**
 * Update Parameter DTO
 */
export interface UpdateParameterDTO {
  name?: string;
  lab_id?: number;
}

/**
 * Parameter Repository Interface (The Contract)
 * Defines all data access operations for Parameter entity
 */
export interface IParameterRepository {
  /**
   * Get all parameters with pagination and filters (includes Lab relation)
   */
  findAll(filter: ParameterFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get parameter by ID (includes Lab relation)
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find parameter by name (for duplicate check)
   */
  findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get parameters for autocomplete/dropdown (JSON format, includes Lab relation)
   */
  findForAutocomplete(search?: string, dataTable?: boolean): Promise<RepositoryResult<any>>;

  /**
   * Get all parameters for CSV report (includes Lab relation)
   */
  findAllForReport(): Promise<RepositoryResult<any[]>>;

  /**
   * Validate that lab exists
   */
  validateLabExists(labId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Create new parameter
   */
  create(data: CreateParameterDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing parameter
   */
  update(id: number, data: UpdateParameterDTO): Promise<RepositoryResult<any>>;

  /**
   * Soft delete parameter
   */
  delete(id: number): Promise<RepositoryResult<boolean>>;
}
