/**
 * Role ID constants
 * Eliminates magic numbers throughout the codebase
 */
export const ROLE_IDS = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  SALES: 3,
  ANALYST: 5,
  QC: 6,
  TECHNICAL_MANAGER: 7,
  CUSTOMER: 8,
  SUPERVISOR: 9,
  SUBCONTRACT_STAFF: 10,
  COA_ADMIN: 11,
  CUSTOMER_LEGACY: 16, // Legacy customer role ID
  AGENCY: 28,
} as const;

export type RoleId = typeof ROLE_IDS[keyof typeof ROLE_IDS];

/**
 * Check if user role can delete customers
 * Only SuperAdmin and Admin have this permission
 */
export const canDeleteCustomer = (roleId: number | undefined): boolean => {
  return roleId === ROLE_IDS.SUPER_ADMIN || roleId === ROLE_IDS.ADMIN;
};

/**
 * Check if user role is an analyst
 */
export const isAnalyst = (roleId: number | undefined): boolean => {
  return roleId === ROLE_IDS.ANALYST;
};

/**
 * Check if user role is QC
 */
export const isQC = (roleId: number | undefined): boolean => {
  return roleId === ROLE_IDS.QC;
};

/**
 * Check if user role is Technical Manager
 */
export const isTechnicalManager = (roleId: number | undefined): boolean => {
  return roleId === ROLE_IDS.TECHNICAL_MANAGER;
};

/**
 * Check if user role is Customer
 */
export const isCustomer = (roleId: number | undefined): boolean => {
  return roleId === ROLE_IDS.CUSTOMER || roleId === ROLE_IDS.CUSTOMER_LEGACY;
};

/**
 * Check if user role is Subcontract Staff
 */
export const isSubcontractStaff = (roleId: number | undefined): boolean => {
  return roleId === ROLE_IDS.SUBCONTRACT_STAFF;
};

/**
 * Check if user role has admin privileges
 */
export const isAdmin = (roleId: number | undefined): boolean => {
  return roleId === ROLE_IDS.SUPER_ADMIN || roleId === ROLE_IDS.ADMIN;
};
