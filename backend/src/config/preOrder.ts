/**
 * PreOrder Module Configuration Constants
 * Centralized configuration to eliminate magic numbers
 */
export const PREORDER_CONFIG = {
  // Pagination defaults
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,

  // Pagination constraints
  MIN_PAGE: 1,
  MAX_PAGE: 10000,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,

  // DataTables max limit
  DATATABLE_MAX_LIMIT: 500,

  // Outstanding thresholds
  STANDARD_OUTSTANDING_DAYS: 63, // 60 days + 3 grace days
  WHITELIST_EXTRA_DAYS: 3,

  // Export limits
  MAX_EXPORT_LIMIT: 10000,
} as const;

/**
 * PreOrder code prefixes
 */
export const PREORDER_CODE_PREFIX = {
  STANDARD: 'POD.',
  ENVIRONMENTAL: 'POD.E.',
} as const;

/**
 * PreSample code prefix
 */
export const PRESAMPLE_CODE_PREFIX = 'PSC.' as const;

/**
 * Lab type values
 */
export const LAB_TYPE = {
  STANDARD: 1,
  ENVIRONMENTAL: 2,
} as const;

/**
 * PreOrder priority values
 */
export const PREORDER_PRIORITY = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  VERY_URGENT: 'very-urgent',
} as const;

/**
 * PreOrder characteristic values
 */
export const PREORDER_CHARACTERISTIC = {
  PERISHABLE: 1,
  NOT_PERISHABLE: 2,
} as const;

export type LabType = typeof LAB_TYPE[keyof typeof LAB_TYPE];
export type PreOrderPriority = typeof PREORDER_PRIORITY[keyof typeof PREORDER_PRIORITY];
export type PreOrderCharacteristic = typeof PREORDER_CHARACTERISTIC[keyof typeof PREORDER_CHARACTERISTIC];
