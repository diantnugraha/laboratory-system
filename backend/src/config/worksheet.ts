/**
 * Worksheet-specific configuration constants
 * Based on legacy PHP implementation business rules
 */

/**
 * QC Type Segregation Constants
 * Used to distinguish Microbiology QC from Chemistry QC
 */
export const MICROBIOLOGY_ANALYST_TYPE_ID = 17;
export const MICROBIOLOGY_QC_USER_IDS = [61, 10551];

/**
 * Check if user is a Microbiology QC
 */
export const isMicrobiologyQC = (userId: number): boolean => {
  return MICROBIOLOGY_QC_USER_IDS.includes(userId);
};

/**
 * Calculation Service IDs
 * Services that require calculation worksheets
 */
export const CALCULATION_SERVICE_IDS = [2582, 2583, 2584, 2579, 3193, 3220];

/**
 * Due Date Offsets by Priority (in business days)
 */
export const DUE_DATE_OFFSETS: Record<string, number> = {
  Normal: 6,
  Urgent: 4,
  'Very Urgent': 2,
  Subcontracted: 12,
};

/**
 * Order Status Integer Mapping
 * Used for status comparison logic
 */
export const ORDER_STATUS_INT: Record<string, number> = {
  Created: 1,
  'To Be Verified': 2,
  'Need to Revise': 3,
  Reviewed: 4,
  'Under Process': 5,
  'Waiting Revision': 5,
  'Customer Retest': 5,
  Complete: 6,
  Cancelled: 0,
};

/**
 * Minimum order status required to work on worksheets
 * Order must be at least "Reviewed" (status_int = 4)
 */
export const MIN_ORDER_STATUS_FOR_WORKSHEET = 4;

/**
 * Get order status as integer for comparison
 */
export const getOrderStatusInt = (status: string): number => {
  return ORDER_STATUS_INT[status] ?? 0;
};

/**
 * Worksheet Status Workflow
 * Defines valid status transitions per role
 */
export const WORKSHEET_STATUS_TRANSITIONS: Record<number, Record<string, string[]>> = {
  // Analyst (5)
  5: {
    Process: ['To Be Verified'],
    'Need to Revised': ['To Be Verified'],
    'Internal Retest': ['To Be Verified'],
    'Customer Retest': ['To Be Verified'],
  },
  // QC (6)
  6: {
    'To Be Verified': ['Verified by QC', 'Need to Revised', 'Internal Retest'],
    'Verified by QC': ['Need to Revised'],
  },
  // Technical Manager (7)
  7: {
    'Verified by QC': ['Approved by TM'],
  },
  // Subcontract Staff (10)
  10: {
    Process: ['To Be Verified'],
    'Need to Revised': ['To Be Verified'],
    'Internal Retest': ['To Be Verified'],
    'Customer Retest': ['To Be Verified'],
  },
};

/**
 * Check if a status transition is valid for a given role
 */
export const isValidStatusTransition = (
  currentStatus: string,
  targetStatus: string,
  roleId: number
): boolean => {
  const roleTransitions = WORKSHEET_STATUS_TRANSITIONS[roleId];
  if (!roleTransitions) return false;

  const allowedTargets = roleTransitions[currentStatus];
  return allowedTargets?.includes(targetStatus) ?? false;
};
