import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Service Filter Options
 */
export interface ServiceFilter {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  user?: number; // Lab type: 1=CTS, 2=Non-CTS, 3=Both
  method?: string;
  name?: string;
}

/**
 * Create Service DTO
 */
export interface CreateServiceDTO {
  code: string;
  name: string;
  category_id: number;
  parameter_id: number;
  method_id: number;
  subcontractor_id?: number | null;
  analyst_type_id?: number | null;
  accreditation?: string | null;
  accreditation_valid_date?: string | null;
  unit?: string | null;
  published_date?: Date | null;
  lod?: string | null;
  loq?: string | null;
  proficiency_test?: string | null;
  description?: string | null;
  price: number;
  user?: number;
  use_pc?: number;
  status?: string | null;
}

/**
 * Update Service DTO
 */
export interface UpdateServiceDTO {
  code?: string;
  name?: string;
  category_id?: number;
  parameter_id?: number;
  method_id?: number;
  subcontractor_id?: number | null;
  analyst_type_id?: number | null;
  accreditation?: string | null;
  accreditation_valid_date?: string | null;
  unit?: string | null;
  published_date?: Date | null;
  lod?: string | null;
  loq?: string | null;
  proficiency_test?: string | null;
  description?: string | null;
  price?: number;
  user?: number;
  use_pc?: number;
  status?: string | null;
}

/**
 * Service Repository Interface (The Contract)
 * Defines all data access operations for Service entity
 *
 * Note: Complex business logic (contract pricing, analyst counting, statistics)
 * is handled in the controller due to dependencies on models that may not exist
 */
export interface IServiceRepository {
  /**
   * Get all services with pagination and filters
   * Includes Category, Parameter, and Method (with Matrix) relations
   */
  findAll(filter: ServiceFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get service by ID
   * Includes Category, Parameter, Method, Subcontractor, and AnalystType relations
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find service by code (for duplicate check)
   */
  findByCode(code: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get services for JSON API with complex filters
   * @param labType 'cts' (user IN (1,3)), 'env' (user IN (2,3)), or 'all'
   * @param product Filter for products (parameter_id = 0)
   * @param nonparameter Include all parameters
   * @param excludeInactive Exclude inactive status
   * @param search Multi-field search on name and code
   * @param limit Page size
   */
  findForJson(
    labType: 'cts' | 'env' | 'all',
    product: boolean,
    nonparameter: boolean,
    excludeInactive: boolean,
    search?: string,
    limit?: number
  ): Promise<RepositoryResult<any[]>>;

  /**
   * Get services for fetch API with advanced filters
   * @param filter Complex filter options
   * @param orderBy Order clause
   */
  findForFetch(filter: ServiceFilter, orderBy: any): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get all services for CSV report with date filtering
   */
  findAllForReport(startDate?: string, endDate?: string): Promise<RepositoryResult<any[]>>;

  /**
   * Validate that category exists (for category_id FK)
   */
  validateCategoryExists(categoryId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Validate that parameter exists (for parameter_id FK)
   */
  validateParameterExists(parameterId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Validate that method exists (for method_id FK)
   */
  validateMethodExists(methodId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Validate that subcontractor exists (for optional subcontractor_id FK)
   */
  validateSubcontractorExists(subcontractorId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Validate that analyst type exists (for optional analyst_type_id FK)
   */
  validateAnalystTypeExists(analystTypeId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Create new service with price history tracking
   * @param data Service data
   * @param createdBy User ID
   * @returns Created service with relations
   */
  create(data: CreateServiceDTO, createdBy: number): Promise<RepositoryResult<any>>;

  /**
   * Update existing service with price history tracking
   * @param id Service ID
   * @param data Update data
   * @param updatedBy User ID
   * @param trackPriceHistory Whether to track price change in history
   * @returns Updated service with relations
   */
  update(
    id: number,
    data: UpdateServiceDTO,
    updatedBy: number,
    trackPriceHistory: boolean
  ): Promise<RepositoryResult<any>>;

  /**
   * Soft delete service
   */
  delete(id: number, updatedBy: number): Promise<RepositoryResult<boolean>>;
}
