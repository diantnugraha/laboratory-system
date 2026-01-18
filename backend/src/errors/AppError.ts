/**
 * Error classes for the laboratory system
 * Provides typed error handling with consistent status codes and error codes
 */

/**
 * Error codes for categorizing errors programmatically
 */
export enum ErrorCode {
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Authentication
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // Authorization
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  FORBIDDEN = 'FORBIDDEN',

  // Resource
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Business Logic
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  INVALID_OPERATION = 'INVALID_OPERATION',
  INVALID_STATUS = 'INVALID_STATUS',

  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // File
  FILE_ERROR = 'FILE_ERROR',
  UPLOAD_ERROR = 'UPLOAD_ERROR',

  // External
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Generic
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    isOperational = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - 400 Bad Request
 * Use when request data fails validation
 */
export class ValidationError extends AppError {
  public readonly errors?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    errors?: Array<{ field: string; message: string }>
  ) {
    super(400, message, ErrorCode.VALIDATION_ERROR);
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error - 401 Unauthorized
 * Use when authentication fails or token is invalid/expired
 */
export class AuthenticationError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.AUTHENTICATION_ERROR) {
    super(401, message, code);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error - 403 Forbidden
 * Use when user lacks permission for the requested action
 */
export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(403, message, ErrorCode.AUTHORIZATION_ERROR);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error - 404 Not Found
 * Use when requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, ErrorCode.NOT_FOUND);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error - 409 Conflict
 * Use when there's a conflict with existing data (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, ErrorCode.CONFLICT);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Business logic error - 400 or custom status
 * Use for business rule violations
 */
export class BusinessError extends AppError {
  constructor(message: string, statusCode = 400, code: ErrorCode = ErrorCode.BUSINESS_ERROR) {
    super(statusCode, message, code);
    Object.setPrototypeOf(this, BusinessError.prototype);
  }
}

/**
 * Database error - 500 Internal Server Error
 * Use for database-related failures
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(500, message, ErrorCode.DATABASE_ERROR, true, {
      originalMessage: originalError?.message,
    });
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * File error - 400 or 500
 * Use for file upload/processing failures
 */
export class FileError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, message, ErrorCode.FILE_ERROR);
    Object.setPrototypeOf(this, FileError.prototype);
  }
}
