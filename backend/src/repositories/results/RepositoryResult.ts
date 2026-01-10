/**
 * Repository Result Pattern
 * Standardized response wrapper for all repository operations
 */

export class RepositoryResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly metadata?: Record<string, any>;

  private constructor(
    success: boolean,
    data?: T,
    error?: string,
    metadata?: Record<string, any>
  ) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.metadata = metadata;
  }

  /**
   * Create a successful result
   */
  static ok<T>(data: T, metadata?: Record<string, any>): RepositoryResult<T> {
    return new RepositoryResult(true, data, undefined, metadata);
  }

  /**
   * Create a failed result
   */
  static fail<T>(error: string): RepositoryResult<T> {
    return new RepositoryResult<T>(false, undefined, error);
  }

  /**
   * Check if operation was successful
   */
  isSuccess(): boolean {
    return this.success;
  }

  /**
   * Check if operation failed
   */
  isFailure(): boolean {
    return !this.success;
  }

  /**
   * Get data or throw error
   * Note: null is a valid value for successful operations (e.g., findByUsername returns null if not found)
   */
  getValue(): T {
    if (!this.success) {
      throw new Error(this.error || 'Operation failed');
    }
    return this.data as T;
  }

  /**
   * Get data or return default value
   */
  getValueOr(defaultValue: T): T {
    return this.success && this.data ? this.data : defaultValue;
  }
}

/**
 * Paginated Result for list operations
 */
export interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Type alias for paginated repository result
 */
export type PaginatedRepositoryResult<T> = RepositoryResult<PaginatedData<T>>;
