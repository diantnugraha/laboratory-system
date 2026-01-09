import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Subcontractor Filter Options
 */
export interface SubcontractorFilter {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Subcontractor DTO
 */
export interface CreateSubcontractorDTO {
  lab_name: string;
  address_name: string;
  phone: string;
  fax: string;
  contact: string;
  email: string;
}

/**
 * Update Subcontractor DTO
 * Allows partial updates with nullable fields
 */
export interface UpdateSubcontractorDTO {
  lab_name?: string;
  address_name?: string | null;
  phone?: string | null;
  fax?: string | null;
  contact?: string | null;
  email?: string | null;
}

/**
 * Subcontractor Repository Interface (The Contract)
 * Defines all data access operations for Subcontractor entity
 */
export interface ISubcontractorRepository {
  /**
   * Get all subcontractors with pagination and search
   * Searches on lab_name field
   */
  findAll(filter: SubcontractorFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get subcontractor by ID
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find subcontractor by lab_name (for duplicate check)
   */
  findByLabName(labName: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get subcontractors for autocomplete/dropdown (JSON format)
   * Returns total_count, incomplete_results, items
   */
  findForAutocomplete(search?: string): Promise<RepositoryResult<any>>;

  /**
   * Create new subcontractor
   */
  create(data: CreateSubcontractorDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing subcontractor
   */
  update(id: number, data: UpdateSubcontractorDTO): Promise<RepositoryResult<any>>;

  /**
   * Soft delete subcontractor
   */
  delete(id: number): Promise<RepositoryResult<boolean>>;
}
