/**
 * Sample-specific configuration constants
 * Based on legacy PHP implementation business rules
 */

/**
 * Sample Configuration
 */
export const SAMPLE_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_EXPORT_LIMIT: 10000,
  MIN_PAGE: 1,
  MAX_PAGE: 10000,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
} as const;

/**
 * Sample Priority Types
 */
export type SamplePriority = 'Normal' | 'Urgent' | 'Very Urgent' | 'Subcontracted';

/**
 * Due Date Offsets by Priority (in business days)
 * - dueDate: Analysis completion deadline
 * - coaRelease: COA release deadline
 */
export const SAMPLE_DUE_DATE_OFFSETS: Record<SamplePriority, { dueDate: number; coaRelease: number }> = {
  'Normal': { dueDate: 7, coaRelease: 9 },
  'Urgent': { dueDate: 4, coaRelease: 6 },
  'Very Urgent': { dueDate: 2, coaRelease: 4 },
  'Subcontracted': { dueDate: 12, coaRelease: 14 },
};

/**
 * Payment Verification Constants
 */
export const PAYMENT_VERIFICATION = {
  /** Special customer (whitelist) grace period: TOP + this value */
  SPECIAL_CUSTOMER_GRACE_DAYS: 3,
  /** Regular customer maximum outstanding days (60 + 3) */
  REGULAR_CUSTOMER_MAX_DAYS: 63,
  /** Default Terms of Payment if not set */
  DEFAULT_TOP_DAYS: 0,
} as const;

/**
 * Sample Status Constants (Extended)
 */
export const SAMPLE_STATUS = {
  PROCESS: 'Process',
  TO_BE_VERIFIED: 'To Be Verified',
  NEED_TO_REVISED: 'Need to Revised',
  INTERNAL_RETEST: 'Internal Retest',
  CUSTOMER_RETEST: 'Customer Retest',
  VERIFIED_BY_QC: 'Verified by QC',
  APPROVED_BY_TM: 'Approved by TM',
  ECOA_DRAFT_SENT: 'ECOA Draft Sent',
  COA_RELEASED: 'COA Released',
  CANCEL: 'Cancel',
} as const;

export type SampleStatusType = typeof SAMPLE_STATUS[keyof typeof SAMPLE_STATUS];

/**
 * COA Status Constants
 */
export const COA_STATUS = {
  DRAFT: 'Draft',
  DRAFT_SENT: 'Draft Sent',
  WAITING_REVISION: 'Waiting Revision',
  CUSTOMER_RETEST: 'Customer Retest',
  INTERNAL_RETEST: 'Internal Retest',
  RELEASED: 'COA Released',
} as const;

export type CoaStatusType = typeof COA_STATUS[keyof typeof COA_STATUS];

/**
 * COA statuses that should trigger ECOA Draft Sent on approval
 */
export const COA_STATUSES_FOR_ECOA_DRAFT = [
  COA_STATUS.WAITING_REVISION,
  COA_STATUS.CUSTOMER_RETEST,
  COA_STATUS.INTERNAL_RETEST,
] as const;

/**
 * Auto-publish delay in hours (for ECOA Draft Sent)
 */
export const AUTO_PUBLISH_DELAY_HOURS = 24;

/**
 * Sample statuses that indicate active processing
 */
export const ACTIVE_SAMPLE_STATUSES = [
  SAMPLE_STATUS.PROCESS,
  SAMPLE_STATUS.TO_BE_VERIFIED,
  SAMPLE_STATUS.VERIFIED_BY_QC,
  SAMPLE_STATUS.APPROVED_BY_TM,
] as const;

/**
 * Sample statuses that indicate retest
 */
export const RETEST_SAMPLE_STATUSES = [
  SAMPLE_STATUS.INTERNAL_RETEST,
  SAMPLE_STATUS.CUSTOMER_RETEST,
] as const;

/**
 * Sample statuses that can be approved by TM
 */
export const APPROVABLE_SAMPLE_STATUSES = [
  SAMPLE_STATUS.VERIFIED_BY_QC,
] as const;

/**
 * Sample statuses that can be verified by QC
 */
export const VERIFIABLE_SAMPLE_STATUSES = [
  SAMPLE_STATUS.TO_BE_VERIFIED,
  SAMPLE_STATUS.PROCESS,
] as const;

/**
 * Order status values
 */
export const ORDER_STATUS = {
  DRAFT: 'Draft',
  CREATED: 'Created',
  REVIEWED: 'Reviewed',
  UNDER_PROCESS: 'Under Process',
  ECOA_DRAFT_SENT: 'ECOA Draft Sent',
  COMPLETE: 'Complete',
  CANCELLED: 'Cancel',
} as const;

/**
 * Role IDs for authorization
 */
export const SAMPLE_ROLES = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  SALES: 3,
  ANALYST: 5,
  QC: 6,
  TECHNICAL_MANAGER: 7,
  CUSTOMER: 8,
  SUBCONTRACT_STAFF: 10,
} as const;

/**
 * Get due date offset by priority
 */
export const getDueDateOffset = (priority: string): { dueDate: number; coaRelease: number } => {
  const normalizedPriority = priority as SamplePriority;
  return SAMPLE_DUE_DATE_OFFSETS[normalizedPriority] ?? SAMPLE_DUE_DATE_OFFSETS['Normal'];
};

/**
 * Check if a status is a retest status
 */
export const isRetestStatus = (status: string): boolean => {
  return RETEST_SAMPLE_STATUSES.includes(status as typeof RETEST_SAMPLE_STATUSES[number]);
};

/**
 * Check if a sample can be approved
 */
export const canBeApproved = (status: string): boolean => {
  return APPROVABLE_SAMPLE_STATUSES.includes(status as typeof APPROVABLE_SAMPLE_STATUSES[number]);
};

/**
 * Check if a sample can be verified
 */
export const canBeVerified = (status: string): boolean => {
  return VERIFIABLE_SAMPLE_STATUSES.includes(status as typeof VERIFIABLE_SAMPLE_STATUSES[number]);
};
