/**
 * Order Module Configuration Constants
 * Centralized configuration to eliminate magic numbers
 */
export const ORDER_CONFIG = {
  // Pagination defaults
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,

  // Export limits
  MAX_EXPORT_LIMIT: 10000,

  // Pagination constraints
  MIN_PAGE: 1,
  MAX_PAGE: 10000,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
} as const;

/**
 * Order status values
 */
export const ORDER_STATUS = {
  CREATED: 'Created',
  REVIEWED: 'Reviewed',
  TO_BE_VERIFIED: 'To Be Verified',
  WAITING_PAYMENT: 'Waiting Payment',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancel',
} as const;

/**
 * Order priority values
 */
export const ORDER_PRIORITY = {
  NORMAL: 'Normal',
  URGENT: 'Urgent',
  EXPRESS: 'Express',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export type OrderPriority = typeof ORDER_PRIORITY[keyof typeof ORDER_PRIORITY];
