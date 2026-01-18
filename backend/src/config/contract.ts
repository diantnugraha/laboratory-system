/**
 * Contract module configuration
 * Default values for contract-related operations
 */

export const CONTRACT_DEFAULTS = {
  /** Default charge percentage for urgent orders */
  URGENT_CHARGE: 50,
  /** Default charge percentage for very urgent orders */
  VERY_URGENT_CHARGE: 100,
  /** Default discount percentage */
  DISCOUNT: 0,
} as const;

export type ContractDefaults = typeof CONTRACT_DEFAULTS;

/**
 * Contract service status constants
 * Determines whether contract applies to all services or selected ones
 */
export const CONTRACT_STATUS = {
  /** Contract applies to all services */
  ALL: 'all',
  /** Contract applies to selected services only */
  SELECTED: 'selected',
} as const;

export type ContractStatus = typeof CONTRACT_STATUS[keyof typeof CONTRACT_STATUS];
