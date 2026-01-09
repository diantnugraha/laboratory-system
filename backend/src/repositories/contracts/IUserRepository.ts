import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * User Filter Options
 */
export interface UserFilter {
  search?: string;
  page?: number;
  limit?: number;
  offset?: number;
  roles?: number[]; // Filter by role IDs (for findForDataTable)
  customer_id?: number; // Filter by customer ID
  excludeRole?: number; // DEPRECATED: Exclude single role (use excludeRoles instead)
  excludeRoles?: number[]; // Exclude multiple role IDs (for Internal tab: [16, 28])
  includeRoles?: number[]; // Include only specific role IDs (for External tab: [16, 28])
  filterIds?: number[]; // Filter by specific user IDs
  orderBy?: string; // Order by field
}

/**
 * Create User DTO
 */
export interface CreateUserDTO {
  username: string;
  email: string;
  display_name: string;
  role_id: number;
  customer_id?: number | null;
  contact_id?: number | null;
  department?: string | null;
  password: string; // Already hashed
  created_by: number;
  analyst_type_id?: number; // For Analyst role (8)
}

/**
 * Update User DTO
 */
export interface UpdateUserDTO {
  username?: string;
  email?: string;
  display_name?: string;
  role_id?: number;
  customer_id?: number | null;
  contact_id?: number | null;
  department?: string | null;
  password?: string; // Already hashed
  updated_by?: number | null;
  analyst_type_id?: number; // For Analyst role (8) management
}

/**
 * User Repository Interface (The Contract)
 * Defines all data access operations for User entity
 */
export interface IUserRepository {
  /**
   * Get all users with pagination and search
   * Supports offset-based pagination
   */
  findAll(filter: UserFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get user by ID (without password)
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find user by username (for duplicate check)
   */
  findByUsername(username: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Find user by email (for duplicate check)
   */
  findByEmail(email: string, excludeId?: number): Promise<RepositoryResult<any | null>>;

  /**
   * Get users for autocomplete/dropdown (JSON format)
   * Supports filtering by role exclusion and specific IDs
   */
  findForAutocomplete(filter: UserFilter): Promise<RepositoryResult<any>>;

  /**
   * Get users for DataTable with advanced filters
   * Supports role filtering, customer filtering, custom ordering
   */
  findForDataTable(filter: UserFilter): Promise<RepositoryResult<any>>;

  /**
   * Validate if role exists
   */
  validateRoleExists(roleId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Validate if customer exists
   */
  validateCustomerExists(customerId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Validate if analyst type exists
   */
  validateAnalystTypeExists(analystTypeId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Create new user (with optional AnalystRules creation in transaction)
   * Handles transaction for user + AnalystRules if role_id = 8
   */
  create(data: CreateUserDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing user (with AnalystRules management in transaction)
   * Handles:
   * - Role change to Analyst (8): creates AnalystRules
   * - Role change from Analyst (8): soft-deletes AnalystRules
   */
  update(id: number, data: UpdateUserDTO, existingRoleId: number): Promise<RepositoryResult<any>>;

  /**
   * Soft delete user
   * Note: Users cannot delete themselves (enforced in controller)
   */
  delete(id: number, deletedBy?: number | null): Promise<RepositoryResult<boolean>>;

  /**
   * Hash password using bcrypt
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Update password and return new hashed password
   * For resend welcome email functionality
   */
  updatePasswordAndGet(userId: number, password: string): Promise<RepositoryResult<string>>;
}
