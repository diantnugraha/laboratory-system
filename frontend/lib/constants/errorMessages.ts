/**
 * Frontend error and success messages
 * Primary language: English
 * Matches backend error messages for consistency
 */

// ============================================
// HTTP STATUS ERROR MESSAGES
// ============================================
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
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
// NETWORK ERROR MESSAGES
// ============================================
export const NETWORK_ERROR_MESSAGES = {
  NO_INTERNET: 'No internet connection. Check your connection',
  TIMEOUT: 'Request timeout. Please try again',
  DNS_ERROR: 'Unable to reach the server',
  CONNECTION_REFUSED: 'Server is unreachable',
  UNKNOWN: 'A network error occurred',
} as const;

// ============================================
// SUCCESS MESSAGES
// ============================================
export const SUCCESS_MESSAGES = {
  // Generic CRUD
  CREATED: (item: string) => `${item} created successfully`,
  UPDATED: (item: string) => `${item} updated successfully`,
  DELETED: (item: string) => `${item} deleted successfully`,
  SAVED: (item: string) => `${item} saved successfully`,

  // Auth
  LOGIN: 'Login successful',
  LOGOUT: 'Logout successful',
  PASSWORD_CHANGED: 'Password changed successfully',
  PASSWORD_RESET_SENT: 'Password reset link has been sent to your email',

  // Operations
  APPROVED: 'Approved successfully',
  REJECTED: 'Rejected successfully',
  VERIFIED: 'Verified successfully',
  SUBMITTED: 'Submitted successfully',

  // File
  UPLOADED: 'File uploaded successfully',
  DOWNLOADED: 'File downloaded successfully',
  EXPORTED: 'Data exported successfully',
} as const;

// ============================================
// FALLBACK ERROR MESSAGES BY OPERATION
// ============================================
export const OPERATION_ERROR_MESSAGES = {
  FETCH: (item: string) => `Failed to fetch ${item}`,
  CREATE: (item: string) => `Failed to create ${item}`,
  UPDATE: (item: string) => `Failed to update ${item}`,
  DELETE: (item: string) => `Failed to delete ${item}`,
  UPLOAD: 'Failed to upload file',
  DOWNLOAD: 'Failed to download file',
  EXPORT: 'Failed to export data',
  LOGIN: 'Login failed',
  DEFAULT: 'An error occurred',
} as const;

// ============================================
// VALIDATION ERROR MESSAGES (Client-side)
// ============================================
export const VALIDATION_ERROR_MESSAGES = {
  REQUIRED: (field: string) => `${field} is required`,
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PHONE: 'Invalid phone number format',
  MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters`,
  MAX_LENGTH: (field: string, max: number) => `${field} must be at most ${max} characters`,
  PASSWORD_MISMATCH: 'Passwords do not match',
} as const;
