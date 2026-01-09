import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Package Filter Options
 */
export interface PackageFilter {
  search?: string;
  page?: number;
  limit?: number;
  select?: boolean; // Simplified data for dropdown/select
  groupOnly?: boolean; // Filter only group packages
}

/**
 * Create Package DTO
 */
export interface CreatePackageDTO {
  code: string;
  name: string;
  description?: string | null;
  totalPrice: number;
  promotionFrom?: Date | null;
  promotionTo?: Date | null;
  percentDiscount?: number;
  listService: string; // Comma-separated format: ",1,2,3,"
  customerId?: number | null;
  group: number; // 0 = auto-calculate, 1 = manual price
  createdBy?: number | null;
}

/**
 * Update Package DTO
 */
export interface UpdatePackageDTO {
  code?: string;
  name?: string;
  description?: string | null;
  totalPrice?: number;
  promotionFrom?: Date | null;
  promotionTo?: Date | null;
  percentDiscount?: number;
  listService?: string;
  customerId?: number | null;
  group?: number;
  updatedBy?: number | null;
}

/**
 * Package Repository Interface (The Contract)
 * Defines all data access operations for Package entity
 */
export interface IPackageRepository {
  /**
   * Get all packages with pagination and search
   * Supports select mode for dropdown (simplified data)
   */
  findAll(filter: PackageFilter): Promise<RepositoryResult<PaginatedData<any> | any>>;

  /**
   * Get package by ID with customer relationship
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find package by code (for duplicate check)
   */
  findByCode(code: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Find package by name (for duplicate check)
   */
  findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get packages for JSON API (without contract pricing)
   * Returns packages with customer relationship
   */
  findForJson(filter: PackageFilter): Promise<RepositoryResult<any[]>>;

  /**
   * Create new package
   */
  create(data: CreatePackageDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing package
   */
  update(id: number, data: UpdatePackageDTO): Promise<RepositoryResult<any>>;

  /**
   * Soft delete package
   */
  delete(id: number): Promise<RepositoryResult<boolean>>;
}
