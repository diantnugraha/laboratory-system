import { z } from 'zod';

// ============================================
// ID Parameter Validation
// ============================================

/**
 * Validates ID from URL params (string -> number)
 */
export const idParamSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'ID must be a number')
    .transform(Number)
});

export type IdParam = z.infer<typeof idParamSchema>;

// ============================================
// Pagination & Search Query Validation
// ============================================

/**
 * Standard pagination query params
 */
export const paginationSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .optional(),
  search: z.string().optional()
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

/**
 * Offset-based pagination (for legacy endpoints)
 */
export const offsetPaginationSchema = z.object({
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .optional(),
  offset: z.string()
    .regex(/^\d+$/, 'Offset must be a number')
    .transform(Number)
    .optional(),
  search: z.string().optional()
});

export type OffsetPaginationQuery = z.infer<typeof offsetPaginationSchema>;

// ============================================
// Date Validation
// ============================================

/**
 * Date format YYYY-MM-DD
 */
export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD');

/**
 * Flexible date format (YYYY-MM-DD or DD-MM-YYYY)
 */
export const flexibleDateSchema = z.string()
  .regex(/^(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/, 'Date format must be YYYY-MM-DD or DD-MM-YYYY');

// ============================================
// Common String Validators
// ============================================

/**
 * Required non-empty trimmed string
 */
export const requiredString = (fieldName: string) =>
  z.string()
    .min(1, `${fieldName} is required`)
    .trim();

/**
 * Required string with max length
 */
export const requiredStringMax = (fieldName: string, maxLength: number) =>
  z.string()
    .min(1, `${fieldName} is required`)
    .max(maxLength, `${fieldName} must be at most ${maxLength} characters`)
    .trim();

/**
 * Optional trimmed string
 */
export const optionalString = () =>
  z.string().trim().optional();

/**
 * Optional string that can be null
 */
export const nullableString = () =>
  z.string().trim().nullable().optional();

// ============================================
// Number Validators
// ============================================

/**
 * String to number transform (for query params)
 */
export const stringToNumber = (fieldName: string) =>
  z.string()
    .regex(/^\d+$/, `${fieldName} must be a number`)
    .transform(Number);

/**
 * Optional string to number transform
 */
export const optionalStringToNumber = () =>
  z.string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional();

// ============================================
// Autocomplete Query Validation
// ============================================

/**
 * Standard autocomplete/JSON endpoint query
 */
export const autocompleteQuerySchema = z.object({
  q: z.string().optional(),
  dataTable: z.string().optional()
});

export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>;
