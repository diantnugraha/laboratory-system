import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Standart Filter Options
 */
export interface StandartFilter {
  search?: string;
  page?: number;
  limit?: number;
  select?: boolean; // Simplified data for dropdown/select
  customer_id?: number; // Customer role filtering
}

/**
 * Standart Detail DTO
 */
export interface StandartDetailDTO {
  service_id: number;
  min: string;
  max: string;
  unit: string;
}

/**
 * Create Standart DTO
 */
export interface CreateStandartDTO {
  code: string;
  name: string;
  category_id?: number | null;
  customer_id?: number | null;
  created_by?: number;
  standartDetails: StandartDetailDTO[];
}

/**
 * Update Standart DTO
 */
export interface UpdateStandartDTO {
  code?: string;
  name?: string;
  category_id?: number | null;
  customer_id?: number | null;
  updated_by?: number | null;
  standartDetails?: StandartDetailDTO[];
}

/**
 * Fetch JSON Filter
 */
export interface FetchJsonFilter {
  search?: string;
  perPage?: number;
  page?: number;
  orderBy?: string;
}

/**
 * Standart Repository Interface (The Contract)
 * Defines all data access operations for Standart entity
 */
export interface IStandartRepository {
  /**
   * Get all standards with pagination and search
   * Supports select mode for dropdown (simplified data)
   * Includes nested standartDetails
   */
  findAll(filter: StandartFilter): Promise<RepositoryResult<PaginatedData<any> | any>>;

  /**
   * Get standard by ID with all relationships
   * Includes category, customer, and standartDetails
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find standard by code (for duplicate check)
   */
  findByCode(code: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Find standard by name (for duplicate check)
   */
  findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get standards for JSON API with customer filtering
   * Returns standards with optional customer role filtering
   */
  findForJson(filter: StandartFilter, dataTable?: boolean): Promise<RepositoryResult<any>>;

  /**
   * Get standards for fetch JSON with pagination
   * Returns standards with pagination for DataTable
   */
  findForFetchJson(filter: FetchJsonFilter): Promise<RepositoryResult<any>>;

  /**
   * Validate that category exists
   */
  validateCategoryExists(categoryId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Validate that customer exists
   */
  validateCustomerExists(customerId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Validate that service exists
   */
  validateServiceExists(serviceId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Create new standard with nested standartDetails
   * Uses transaction to ensure atomicity
   */
  create(data: CreateStandartDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing standard
   * Deletes all existing standartDetails and creates new ones
   * Uses transaction to ensure atomicity
   */
  update(id: number, data: UpdateStandartDTO): Promise<RepositoryResult<any>>;

  /**
   * Soft delete standard
   */
  delete(id: number): Promise<RepositoryResult<boolean>>;
}
