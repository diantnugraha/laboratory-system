export const SAMPLE_STATUS = {
  PENDING: 'pending',
  WAITING: 'waiting',
  PROCESS: 'process',
  UNDER_PROCESS: 'under process',
  VERIFIED: 'verified',
  APPROVED: 'approved',
  COMPLETE: 'complete',
  CANCEL: 'cancel',
  CANCELLED: 'cancelled',
} as const;

export type SampleStatus = typeof SAMPLE_STATUS[keyof typeof SAMPLE_STATUS];

export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  [SAMPLE_STATUS.PENDING]: 'Pending',
  [SAMPLE_STATUS.WAITING]: 'Waiting',
  [SAMPLE_STATUS.PROCESS]: 'Process',
  [SAMPLE_STATUS.UNDER_PROCESS]: 'Under Process',
  [SAMPLE_STATUS.VERIFIED]: 'Verified',
  [SAMPLE_STATUS.APPROVED]: 'Approved',
  [SAMPLE_STATUS.COMPLETE]: 'Complete',
  [SAMPLE_STATUS.CANCEL]: 'Cancelled',
  [SAMPLE_STATUS.CANCELLED]: 'Cancelled',
};

export const SAMPLE_STATUS_COLORS: Record<SampleStatus, string> = {
  [SAMPLE_STATUS.PENDING]: 'bg-gray-100 text-gray-800',
  [SAMPLE_STATUS.WAITING]: 'bg-yellow-100 text-yellow-800',
  [SAMPLE_STATUS.PROCESS]: 'bg-blue-100 text-blue-800',
  [SAMPLE_STATUS.UNDER_PROCESS]: 'bg-purple-100 text-purple-800',
  [SAMPLE_STATUS.VERIFIED]: 'bg-cyan-100 text-cyan-800',
  [SAMPLE_STATUS.APPROVED]: 'bg-emerald-100 text-emerald-800',
  [SAMPLE_STATUS.COMPLETE]: 'bg-green-100 text-green-800',
  [SAMPLE_STATUS.CANCEL]: 'bg-red-100 text-red-800',
  [SAMPLE_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
};
