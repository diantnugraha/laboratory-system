export const WORKSHEET_STATUS = {
  PROCESS: 'Process',
  TO_BE_VERIFIED: 'To Be Verified',
  NEED_TO_REVISED: 'Need to Revised',
  INTERNAL_RETEST: 'Internal Retest',
  CUSTOMER_RETEST: 'Customer Retest',
  VERIFIED_BY_QC: 'Verified by QC',
  APPROVED_BY_TM: 'Approved by TM',
  CANCEL: 'Cancel',
} as const;

export type WorksheetStatus = typeof WORKSHEET_STATUS[keyof typeof WORKSHEET_STATUS];

export const WORKSHEET_STATUS_LABELS: Record<WorksheetStatus, string> = {
  [WORKSHEET_STATUS.PROCESS]: 'Process',
  [WORKSHEET_STATUS.TO_BE_VERIFIED]: 'To Be Verified',
  [WORKSHEET_STATUS.NEED_TO_REVISED]: 'Need to Revised',
  [WORKSHEET_STATUS.INTERNAL_RETEST]: 'Internal Retest',
  [WORKSHEET_STATUS.CUSTOMER_RETEST]: 'Customer Retest',
  [WORKSHEET_STATUS.VERIFIED_BY_QC]: 'Verified by QC',
  [WORKSHEET_STATUS.APPROVED_BY_TM]: 'Approved by TM',
  [WORKSHEET_STATUS.CANCEL]: 'Cancelled',
};

export const WORKSHEET_STATUS_COLORS: Record<WorksheetStatus, string> = {
  [WORKSHEET_STATUS.PROCESS]: 'bg-blue-100 text-blue-800',
  [WORKSHEET_STATUS.TO_BE_VERIFIED]: 'bg-yellow-100 text-yellow-800',
  [WORKSHEET_STATUS.NEED_TO_REVISED]: 'bg-orange-100 text-orange-800',
  [WORKSHEET_STATUS.INTERNAL_RETEST]: 'bg-purple-100 text-purple-800',
  [WORKSHEET_STATUS.CUSTOMER_RETEST]: 'bg-pink-100 text-pink-800',
  [WORKSHEET_STATUS.VERIFIED_BY_QC]: 'bg-cyan-100 text-cyan-800',
  [WORKSHEET_STATUS.APPROVED_BY_TM]: 'bg-green-100 text-green-800',
  [WORKSHEET_STATUS.CANCEL]: 'bg-red-100 text-red-800',
};
