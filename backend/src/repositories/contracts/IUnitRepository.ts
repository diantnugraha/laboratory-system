import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Unit Filter Options
 */
export interface UnitFilter {
  search?: string;
  page?: number;
  limit?: number;
  lab_id?: number;
}

/**
 * Create Unit DTO
 */
export interface CreateUnitDTO {
  name: string;
  description: string;
  lab_id?: number | null;
}

/**
 * Update Unit DTO
 */
export interface UpdateUnitDTO {
  name?: string;
  description?: string;
  lab_id?: number | null;
}

/**
 * Unit Repository Interface (The Contract)
 * Defines all data access operations for Unit entity
 *
 * NOTE: Unit model does NOT have trash field - uses hard delete
 */
export interface IUnitRepository {
  /**
   * Get all units with pagination and filters (includes Lab relation)
   * NOTE: No trash filter - Unit doesn't have soft delete
   */
  findAll(filter: UnitFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get unit by ID (includes Lab relation)
   * NOTE: No trash filter - Unit doesn't have soft delete
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find unit by name (for duplicate check)
   * NOTE: No trash filter - Unit doesn't have soft delete
   */
  findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get units for autocomplete/dropdown (JSON format)
   * Supports filtering by lab_id
   */
  findForAutocomplete(search?: string, labId?: number, dataTable?: boolean): Promise<RepositoryResult<any>>;

  /**
   * Get all units for CSV report
   */
  findAllForReport(): Promise<RepositoryResult<any[]>>;

  /**
   * Validate that lab exists (for optional lab_id FK)
   */
  validateLabExists(labId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Create new unit
   */
  create(data: CreateUnitDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing unit
   */
  update(id: number, data: UpdateUnitDTO): Promise<RepositoryResult<any>>;

  /**
   * Hard delete unit
   * NOTE: Unit model doesn't have trash field - this performs HARD DELETE
   */
  delete(id: number): Promise<RepositoryResult<boolean>>;
}
