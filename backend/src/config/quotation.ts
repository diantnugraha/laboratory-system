/**
 * Quotation Module Configuration Constants
 * Based on quotationFinal-spec.md specification
 */
export const QUOTATION_CONFIG = {
  // Pagination defaults
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,

  // Export limits
  MAX_EXPORT_LIMIT: 10000,

  // DataTable limit (for autocomplete with full data)
  DATATABLE_MAX_LIMIT: 10000,

  // Pagination constraints
  MIN_PAGE: 1,
  MAX_PAGE: 10000,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,

  // Business rules
  MIN_TOTAL: 200000, // Minimum quotation total IDR 200,000

  // Valid date calculation (months to add)
  VALID_DATE_MONTHS: 1,

  // Default VAT percentage
  DEFAULT_VAT_PERCENT: 11,

  // Default discount
  DEFAULT_DISCOUNT: 0,
} as const;

/**
 * Domains to skip in search queries
 * These are system domains that shouldn't trigger search
 */
export const SKIP_SEARCH_DOMAINS = [
  'lab.tuv-nord.co.id',
  'dev.tuv-nord.co.id',
] as const;

/**
 * Quotation status values
 */
export const QUOTATION_STATUS = {
  CREATED: 'Created',
  ORDER: 'Order',
} as const;

/**
 * Lab type values
 */
export const LAB_TYPE = {
  STANDARD: '1',
  ENVIRONMENTAL: '2',
} as const;

/**
 * Quotation priority values
 */
export const QUOTATION_PRIORITY = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  VERY_URGENT: 'very urgent',
} as const;

/**
 * Code format prefixes
 */
export const QUOTATION_CODE_PREFIX = {
  STANDARD: 'QT.',
  ENVIRONMENTAL: 'QT.E.',
} as const;

/**
 * Environmental lab user IDs (users who create environmental quotations)
 * Note: In the original system, this was hardcoded as user ID 1625
 * This should be moved to environment config or database in production
 */
export const ENVIRONMENTAL_LAB_USER_IDS: number[] = [];

export type QuotationStatus = (typeof QUOTATION_STATUS)[keyof typeof QUOTATION_STATUS];
export type LabType = (typeof LAB_TYPE)[keyof typeof LAB_TYPE];
export type QuotationPriority = (typeof QUOTATION_PRIORITY)[keyof typeof QUOTATION_PRIORITY];
