import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Role Filter Options
 * Note: Uses offset-based pagination instead of page-based
 */
export interface RoleFilter {
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Role Repository Interface (The Contract)
 * Defines data access operations for Role entity
 *
 * NOTE: Role is READ-ONLY - no create, update, or delete operations
 * This is a data source from simlab_dev.roles table
 */
export interface IRoleRepository {
  /**
   * Get all roles with offset-based pagination and search
   * Uses offset/limit instead of page/limit
   */
  findAll(filter: RoleFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get role by ID
   */
  findById(id: number): Promise<RepositoryResult<any>>;
}
