import { AxiosError } from 'axios';
import { HTTP_ERROR_MESSAGES, NETWORK_ERROR_MESSAGES } from '../constants/errorMessages';

/**
 * API Error Response type from backend
 */
interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Patterns that indicate a technical/database error message
 * These should NOT be shown to users
 */
const TECHNICAL_ERROR_PATTERNS = [
  /prisma/i,
  /invocation/i,
  /findmany/i,
  /findunique/i,
  /findFirst/i,
  /create\(\)/i,
  /update\(\)/i,
  /delete\(\)/i,
  /unknown field/i,
  /invalid.*`.*`/i,
  /argument.*missing/i,
  /constraint failed/i,
  /foreign key/i,
  /unique constraint/i,
  /relation.*does not exist/i,
  /column.*does not exist/i,
  /table.*does not exist/i,
  /syntax error/i,
  /cannot read property/i,
  /undefined is not/i,
  /null is not/i,
  /typeerror/i,
  /referenceerror/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /repository/i,
  /\.ts:\d+/i,  // Stack trace file references like "file.ts:47"
  /at\s+\w+\s+\(/i,  // Stack trace patterns
];

/**
 * Check if error message appears to be a technical/database error
 * that should not be shown to end users
 */
const isTechnicalErrorMessage = (message: string): boolean => {
  return TECHNICAL_ERROR_PATTERNS.some(pattern => pattern.test(message));
};

/**
 * Parsed error result with all relevant information
 */
export interface ParsedError {
  message: string;
  status?: number;
  code?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
  isNetworkError: boolean;
  isAuthError: boolean;
}

/**
 * Check if error is a network error (no response from server)
 */
const isNetworkError = (error: AxiosError): boolean => {
  return !error.response && (
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.message.includes('Network Error') ||
    error.message.includes('timeout')
  );
};

/**
 * Get network error message based on error type
 */
const getNetworkErrorMessage = (error: AxiosError): string => {
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return NETWORK_ERROR_MESSAGES.TIMEOUT;
  }
  if (error.message.includes('Network Error')) {
    // Check if browser is online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return NETWORK_ERROR_MESSAGES.NO_INTERNET;
    }
    return NETWORK_ERROR_MESSAGES.CONNECTION_REFUSED;
  }
  return NETWORK_ERROR_MESSAGES.UNKNOWN;
};

/**
 * Parse API error and return structured error information
 * Maintains console.error logging for tracking/debugging
 *
 * @param error - The error object (typically from axios)
 * @param fallbackMessage - Default message if no specific error message found
 * @returns ParsedError object with message and metadata
 *
 * @example
 * ```ts
 * try {
 *   await api.post('/users', data);
 * } catch (error) {
 *   const parsed = parseApiError(error, 'Gagal membuat user');
 *   toast.error(parsed.message);
 * }
 * ```
 */
export const parseApiError = (
  error: unknown,
  fallbackMessage = 'Terjadi kesalahan'
): ParsedError => {
  // Always log for debugging/tracking
  console.error('API Error:', error);

  // Default result
  const result: ParsedError = {
    message: fallbackMessage,
    isNetworkError: false,
    isAuthError: false,
  };

  // Handle Axios errors
  if (error instanceof AxiosError) {
    // Check for network errors first
    if (isNetworkError(error)) {
      result.message = getNetworkErrorMessage(error);
      result.isNetworkError = true;
      return result;
    }

    const status = error.response?.status;
    result.status = status;

    // Check for auth error (401)
    if (status === 401) {
      result.isAuthError = true;
      // Note: Redirect is handled by API interceptor
    }

    // Try to get message from response data
    const data = error.response?.data as ApiErrorResponse | undefined;

    if (data?.message) {
      // Check if the message is a technical error that shouldn't be shown to users
      if (isTechnicalErrorMessage(data.message)) {
        // Use HTTP status message or fallback, but NOT the technical error
        result.message = (status && HTTP_ERROR_MESSAGES[status]) || fallbackMessage;
      } else {
        // Safe to show this message to users
        result.message = data.message;
      }
      result.code = data.code;
      result.fieldErrors = data.errors;
    } else if (status && HTTP_ERROR_MESSAGES[status]) {
      // Use standard HTTP error message as fallback
      result.message = HTTP_ERROR_MESSAGES[status];
    }

    return result;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Check if the error message is technical
    if (isTechnicalErrorMessage(error.message)) {
      result.message = fallbackMessage;
    } else {
      result.message = error.message || fallbackMessage;
    }
  }

  return result;
};

/**
 * Get toast-ready error message (simple string)
 * Convenience wrapper around parseApiError
 *
 * @param error - The error object
 * @param fallbackMessage - Default message if no specific error message found
 * @returns Error message string suitable for toast notification
 *
 * @example
 * ```ts
 * catch (error) {
 *   toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.CREATE('user')));
 * }
 * ```
 */
export const getErrorMessage = (
  error: unknown,
  fallbackMessage = 'Terjadi kesalahan'
): string => {
  return parseApiError(error, fallbackMessage).message;
};

/**
 * Check if error is an authentication error (401)
 *
 * @param error - The error object
 * @returns true if error is a 401 authentication error
 */
export const isAuthenticationError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  return false;
};

/**
 * Check if error contains field-level validation errors
 *
 * @param error - The error object
 * @returns true if error has field-specific validation errors
 */
export const hasFieldErrors = (
  error: unknown
): error is AxiosError & { response: { data: ApiErrorResponse } } => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return Array.isArray(data?.errors) && data.errors.length > 0;
  }
  return false;
};

/**
 * Extract field-level errors for form validation
 * Returns a record suitable for react-hook-form setError
 *
 * @param error - The error object
 * @returns Record mapping field names to error messages
 *
 * @example
 * ```ts
 * catch (error) {
 *   const fieldErrors = getFieldErrors(error);
 *   Object.entries(fieldErrors).forEach(([field, message]) => {
 *     form.setError(field, { message });
 *   });
 * }
 * ```
 */
export const getFieldErrors = (
  error: unknown
): Record<string, string> => {
  if (hasFieldErrors(error)) {
    const errors = error.response.data.errors;
    return errors.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {} as Record<string, string>);
  }
  return {};
};
