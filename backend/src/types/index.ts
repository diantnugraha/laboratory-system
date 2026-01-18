import type { FastifyRequest, FastifyReply } from 'fastify';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper type for Fastify handler
export type FastifyHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<any> | any;

// Type guard for ID validation
export function parseId(id: string | undefined): number | null {
  if (!id) return null;
  const num = parseInt(id, 10);
  return isNaN(num) ? null : num;
}

// Type guard for query parameter parsing
export function parseQueryParam(
  param: string | string[] | number | undefined,
  defaultValue: number
): number {
  if (param === undefined || param === null) return defaultValue;
  if (typeof param === 'number') return param;
  const str = Array.isArray(param) ? String(param[0]) : String(param);
  const num = parseInt(str, 10);
  return isNaN(num) ? defaultValue : num;
}

// Type guard for boolean query parameters
export function parseBooleanParam(
  param: string | string[] | undefined,
  defaultValue: boolean = false
): boolean {
  if (!param) return defaultValue;
  const str = Array.isArray(param) ? param[0] : param;
  return str.toLowerCase() === 'true' || str === '1';
}

/**
 * Safe integer parsing with validation - throws error for invalid values
 * Use when the value is required and must be a valid integer
 */
export function safeParseInt(value: unknown, fieldName: string): number {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }
  const num = parseInt(String(value), 10);
  if (isNaN(num)) {
    throw new Error(`Invalid ${fieldName}: must be a valid integer`);
  }
  return num;
}

/**
 * Safe float parsing with validation - throws error for invalid values
 * Use when the value is required and must be a valid number
 */
export function safeParseFloat(value: unknown, fieldName: string): number {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }
  const num = parseFloat(String(value));
  if (isNaN(num)) {
    throw new Error(`Invalid ${fieldName}: must be a valid number`);
  }
  return num;
}

/**
 * Safe optional integer parsing with default value
 * Use when the value is optional and should return default if invalid/missing
 */
export function safeParseIntOptional(value: unknown, defaultValue: number): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const num = parseInt(String(value), 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Safe optional float parsing with default value
 * Use when the value is optional and should return default if invalid/missing
 */
export function safeParseFloatOptional(value: unknown, defaultValue: number): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const num = parseFloat(String(value));
  return isNaN(num) ? defaultValue : num;
}
