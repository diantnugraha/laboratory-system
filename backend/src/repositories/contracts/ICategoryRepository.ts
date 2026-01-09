import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Category Filter Options
 */
export interface CategoryFilter {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Category DTO
 */
export interface CreateCategoryDTO {
  name: string;
}

/**
 * Update Category DTO
 */
export interface UpdateCategoryDTO {
  name: string;
}

/**
 * Category Repository Interface (The Contract)
 * Defines all data access operations for Category entity
 */
export interface ICategoryRepository {
  /**
   * Get all categories with pagination and filters
   */
  findAll(filter: CategoryFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get category by ID
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find category by name (for duplicate check)
   */
  findByName(name: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Create new category
   */
  create(data: CreateCategoryDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing category
   */
  update(id: number, data: UpdateCategoryDTO): Promise<RepositoryResult<any>>;

  /**
   * Soft delete category
   */
  delete(id: number): Promise<RepositoryResult<boolean>>;
}
