import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Matrix Filter Options
 */
export interface MatrixFilter {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Matrix DTO
 */
export interface CreateMatrixDTO {
  name: string;
}

/**
 * Update Matrix DTO
 */
export interface UpdateMatrixDTO {
  name?: string;
}

/**
 * Matrix Repository Interface (The Contract)
 * Defines all data access operations for Matrix entity
 */
export interface IMatrixRepository {
  /**
   * Get all matrices with pagination and filters
   */
  findAll(filter: MatrixFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get matrix by ID
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find matrix by name (for duplicate check)
   */
  findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get matrices for autocomplete/dropdown (JSON format)
   */
  findForAutocomplete(search?: string, dataTable?: boolean): Promise<RepositoryResult<any>>;

  /**
   * Create new matrix
   */
  create(data: CreateMatrixDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing matrix
   */
  update(id: number, data: UpdateMatrixDTO): Promise<RepositoryResult<any>>;

  /**
   * Soft delete matrix
   */
  delete(id: number): Promise<RepositoryResult<boolean>>;
}
