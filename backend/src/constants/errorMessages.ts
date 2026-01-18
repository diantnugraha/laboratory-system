/**
 * Centralized error and success messages for the laboratory system
 * Primary language: English
 */

// ============================================
// HTTP STATUS ERRORS
// ============================================
export const HTTP_ERRORS: Record<number, string> = {
  400: 'Invalid request',
  401: 'Your session has expired. Please login again',
  403: 'You do not have permission to perform this action',
  404: 'Data not found',
  408: 'Request timeout. Please try again',
  409: 'Data already exists or conflict occurred',
  422: 'Data cannot be processed. Please check your input',
  429: 'Too many requests. Please wait a moment',
  500: 'Server error occurred',
  502: 'Server is unreachable',
  503: 'Service is currently unavailable. Please try again later',
  504: 'Server is not responding. Please try again',
};

// ============================================
// AUTHENTICATION ERRORS
// ============================================
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Session has expired. Please login again',
  TOKEN_INVALID: 'Invalid token',
  TOKEN_REQUIRED: 'Authentication required',
  ACCOUNT_LOCKED: 'Your account has been locked. Contact administrator',
  ACCOUNT_INACTIVE: 'Your account is inactive',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_MISMATCH: 'Passwords do not match',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  OLD_PASSWORD_INVALID: 'Old password is invalid',
  RESET_TOKEN_INVALID: 'Password reset link is invalid or expired',
  SETUP_TOKEN_INVALID: 'Password setup link is invalid or expired',
  EMAIL_PASSWORD_REQUIRED: 'Email and password are required',
  USER_NOT_FOUND: 'User not found',
} as const;

// ============================================
// VALIDATION ERRORS
// ============================================
export const VALIDATION_ERRORS = {
  REQUIRED: (field: string) => `${field} is required`,
  MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters`,
  MAX_LENGTH: (field: string, max: number) => `${field} must be at most ${max} characters`,
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PHONE: 'Invalid phone number format',
  INVALID_DATE: 'Invalid date format',
  INVALID_NUMBER: (field: string) => `${field} must be a number`,
  INVALID_ID: 'Invalid ID',
  INVALID_FORMAT: 'Invalid format',
  OUT_OF_RANGE: (field: string, min: number, max: number) => `${field} must be between ${min} and ${max}`,
  VALIDATION_FAILED: 'Validation failed',
  INVALID_INPUT: 'Invalid input',
} as const;

// ============================================
// RESOURCE ERRORS (CRUD Operations)
// ============================================
export const RESOURCE_ERRORS = {
  // Generic
  NOT_FOUND: (resource: string) => `${resource} not found`,
  ALREADY_EXISTS: (resource: string) => `${resource} already exists`,
  CREATE_FAILED: (resource: string) => `Failed to create ${resource}`,
  UPDATE_FAILED: (resource: string) => `Failed to update ${resource}`,
  DELETE_FAILED: (resource: string) => `Failed to delete ${resource}`,
  FETCH_FAILED: (resource: string) => `Failed to fetch ${resource}`,

  // Specific entities
  CUSTOMER_NOT_FOUND: 'Customer not found',
  CUSTOMER_CODE_EXISTS: 'Customer code already exists',
  ORDER_NOT_FOUND: 'Order not found',
  SAMPLE_NOT_FOUND: 'Sample not found',
  WORKSHEET_NOT_FOUND: 'Worksheet not found',
  CONTRACT_NOT_FOUND: 'Contract not found',
  USER_NOT_FOUND: 'User not found',
  ROLE_NOT_FOUND: 'Role not found',
  SERVICE_NOT_FOUND: 'Service not found',
  PARAMETER_NOT_FOUND: 'Parameter not found',
  METHOD_NOT_FOUND: 'Method not found',
  PACKAGE_NOT_FOUND: 'Package not found',
  INVOICE_NOT_FOUND: 'Invoice not found',
  CATEGORY_NOT_FOUND: 'Category not found',
  UNIT_NOT_FOUND: 'Unit not found',
  MATRIX_NOT_FOUND: 'Matrix not found',
  STANDART_NOT_FOUND: 'Standard not found',
  LAB_NOT_FOUND: 'Laboratory not found',
  ANALYST_TYPE_NOT_FOUND: 'Analyst type not found',
  SUBCONTRACTOR_NOT_FOUND: 'Subcontractor not found',

  // Duplicate entries
  EMAIL_EXISTS: 'Email already registered',
  USERNAME_EXISTS: 'Username already taken',
  CODE_EXISTS: 'Code already exists',
  NAME_EXISTS: 'Name already exists',
} as const;

// ============================================
// AUTHORIZATION ERRORS
// ============================================
export const AUTHORIZATION_ERRORS = {
  FORBIDDEN: 'You do not have permission to perform this action',
  ADMIN_ONLY: 'Only SuperAdmin and Admin can perform this action',
  OWNER_ONLY: 'You can only access your own data',
  CUSTOMER_ACCESS_DENIED: 'You cannot access other customer data',
  ANALYST_ACCESS_DENIED: 'You do not have access to this worksheet',
  SUBCONTRACT_ONLY: 'This worksheet is not subcontracted',
  ROLE_REQUIRED: 'Invalid role for this operation',
} as const;

// ============================================
// BUSINESS LOGIC ERRORS
// ============================================
export const BUSINESS_ERRORS = {
  // Order/Worksheet status
  ORDER_STATUS_INVALID: 'Order status is invalid for this operation',
  ORDER_ALREADY_APPROVED: 'Order has already been approved',
  ORDER_ALREADY_REJECTED: 'Order has already been rejected',
  ORDER_LOCKED: 'Order is locked and cannot be modified',
  WORKSHEET_STATUS_INVALID: 'Worksheet status is invalid for this operation',
  WORKSHEET_NO_RESULT: 'Worksheet result has not been filled',
  WORKSHEET_ALREADY_VERIFIED: 'Worksheet has already been verified',

  // Payment
  PAYMENT_REQUIRED: 'Payment is required',
  PAYMENT_ALREADY_CONFIRMED: 'Payment has already been confirmed',

  // Contract
  CONTRACT_EXPIRED: 'Contract has expired',
  CONTRACT_NOT_ACTIVE: 'Contract is not active',

  // Revision/Retest
  REVISION_MESSAGE_REQUIRED: 'Revision message is required',
  RETEST_MESSAGE_REQUIRED: 'Retest message is required',

  // Sample
  SAMPLE_NO_SERVICES: 'Sample must have at least 1 service',

  // General
  OPERATION_NOT_ALLOWED: 'Operation not allowed',
  INVALID_STATUS_TRANSITION: 'Invalid status transition',
} as const;

// ============================================
// PRISMA/DATABASE ERRORS
// ============================================
export const DATABASE_ERRORS: Record<string, string> = {
  P2002: 'Duplicate data found',
  P2003: 'Operation failed due to related data',
  P2014: 'Operation would violate required relation',
  P2025: 'Data not found',
  CONNECTION_FAILED: 'Failed to connect to database',
  TIMEOUT: 'Database is not responding',
};

// ============================================
// FILE/UPLOAD ERRORS
// ============================================
export const FILE_ERRORS = {
  UPLOAD_FAILED: 'Failed to upload file',
  FILE_TOO_LARGE: (maxSize: string) => `File size must not exceed ${maxSize}`,
  INVALID_FILE_TYPE: (formats: string) => `Invalid file format. Use ${formats}`,
  FILE_NOT_FOUND: 'File not found',
  EXPORT_FAILED: 'Failed to export data',
  PDF_GENERATION_FAILED: 'Failed to generate PDF document',
  TOO_MANY_FILES: (max: number) => `Maximum ${max} files allowed`,
} as const;

// ============================================
// SUCCESS MESSAGES
// ============================================
export const SUCCESS_MESSAGES = {
  // CRUD
  CREATE_SUCCESS: (resource: string) => `${resource} created successfully`,
  UPDATE_SUCCESS: (resource: string) => `${resource} updated successfully`,
  DELETE_SUCCESS: (resource: string) => `${resource} deleted successfully`,
  FETCH_SUCCESS: (resource: string) => `${resource} data fetched successfully`,

  // Auth
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  PASSWORD_CHANGED: 'Password changed successfully',
  PASSWORD_RESET_SENT: 'If the email is registered, a password reset link has been sent',
  PASSWORD_SETUP_SUCCESS: 'Password set successfully. Please login',

  // Operations
  APPROVED: 'Approved successfully',
  REJECTED: 'Rejected successfully',
  VERIFIED: 'Verified successfully',
  SUBMITTED: 'Submitted successfully',

  // File
  UPLOADED: 'File uploaded successfully',
  EXPORTED: 'Data exported successfully',
} as const;

// Type exports for type-safe usage
export type HttpErrorCode = keyof typeof HTTP_ERRORS;
export type AuthErrorKey = keyof typeof AUTH_ERRORS;
export type DatabaseErrorCode = keyof typeof DATABASE_ERRORS;
