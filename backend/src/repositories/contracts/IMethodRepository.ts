import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Method Filter Options
 */
export interface MethodFilter {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Method DTO
 */
export interface CreateMethodDTO {
  code: string;
  name: string;
  matrix_id: number;
  category_name?: string | null;
  status?: string;
  description?: string | null;
  instruction?: string | null;
  method_document?: string | null;
}

/**
 * Update Method DTO
 */
export interface UpdateMethodDTO {
  code?: string;
  name?: string;
  matrix_id?: number;
  category_name?: string | null;
  status?: string;
  description?: string | null;
  instruction?: string | null;
  method_document?: string | null;
}

/**
 * Method Repository Interface (The Contract)
 * Defines all data access operations for Method entity
 */
export interface IMethodRepository {
  /**
   * Get all methods with pagination and filters (includes Matrix relation)
   * Supports multi-field search on name and code
   */
  findAll(filter: MethodFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get method by ID (includes Matrix relation)
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find method by name (for duplicate check)
   */
  findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Find method by code (for duplicate check)
   */
  findByCode(code: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get methods for autocomplete/dropdown (JSON format, includes Matrix relation)
   */
  findForAutocomplete(search?: string, dataTable?: boolean): Promise<RepositoryResult<any>>;

  /**
   * Get all methods for CSV report with date filtering
   */
  findAllForReport(startDate?: string, endDate?: string): Promise<RepositoryResult<any[]>>;

  /**
   * Generate next sequential method code (MTD.XXXXX format)
   */
  generateNextCode(): Promise<RepositoryResult<string>>;

  /**
   * Handle document management (;; delimited strings)
   * @param existingDocuments Current documents string
   * @param documentsToRemove Documents to remove (;; delimited)
   * @param newDocument New document to add
   */
  handleDocuments(
    existingDocuments: string | null,
    documentsToRemove: string | null,
    newDocument: string | null
  ): string | null;

  /**
   * Validate that matrix exists (for matrix_id FK)
   */
  validateMatrixExists(matrixId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Create new method
   */
  create(data: CreateMethodDTO, createdBy?: number): Promise<RepositoryResult<any>>;

  /**
   * Update existing method
   */
  update(id: number, data: UpdateMethodDTO, updatedBy?: number): Promise<RepositoryResult<any>>;

  /**
   * Soft delete method
   */
  delete(id: number, updatedBy?: number): Promise<RepositoryResult<boolean>>;
}
