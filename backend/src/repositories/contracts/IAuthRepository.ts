import { RepositoryResult } from '../results/RepositoryResult';

/**
 * Create Auth User DTO (for registration)
 */
export interface CreateAuthUserDTO {
  email: string;
  username: string;
  display_name: string;
  role_id: number;
  password: string; // Already hashed
  created_by: number;
}

/**
 * Auth Repository Interface (The Contract)
 * Defines authentication and user management operations
 *
 * Note: This is NOT a standard CRUD repository
 * It's designed around authentication workflows
 */
export interface IAuthRepository {
  /**
   * Find user by email (for login and duplicate check)
   * Returns user with role relationship
   */
  findByEmail(email: string): Promise<RepositoryResult<any | null>>;

  /**
   * Find user by username (for duplicate check)
   */
  findByUsername(username: string): Promise<RepositoryResult<any | null>>;

  /**
   * Find user by ID for profile retrieval
   * Returns user with role relationship (excludes password)
   */
  findById(id: number): Promise<RepositoryResult<any | null>>;

  /**
   * Find user by ID with password (for password change)
   * Returns user including password field
   */
  findByIdWithPassword(id: number): Promise<RepositoryResult<any | null>>;

  /**
   * Validate if role exists
   */
  validateRoleExists(roleId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Create new user (for registration)
   */
  createUser(data: CreateAuthUserDTO): Promise<RepositoryResult<any>>;

  /**
   * Update password for a user
   */
  updatePassword(userId: number, hashedPassword: string): Promise<RepositoryResult<boolean>>;

  /**
   * Update last_login timestamp
   */
  updateLastLogin(userId: number): Promise<RepositoryResult<boolean>>;

  /**
   * Hash password using bcrypt
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Compare password with hash using bcrypt
   */
  comparePassword(password: string, hash: string): Promise<boolean>;
}
