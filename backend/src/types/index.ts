import { Request, Response } from 'express';
import { ParsedQs } from 'qs';

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

// Helper type for Express handler
export type ExpressHandler = (req: Request, res: Response) => Promise<void> | void;

// Type guard for ID validation
export function parseId(id: string | undefined): number | null {
  if (!id) return null;
  const num = parseInt(id, 10);
  return isNaN(num) ? null : num;
}

// Type guard for query parameter parsing
export function parseQueryParam(
  param: string | ParsedQs | (string | ParsedQs)[] | undefined,
  defaultValue: number
): number {
  if (!param) return defaultValue;
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

