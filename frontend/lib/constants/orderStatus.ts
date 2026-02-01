// frontend/lib/constants/orderStatus.ts
export const ORDER_STATUS = {
  CREATED: 'created',
  TO_BE_VERIFIED: 'to be verified',
  REVIEWED: 'reviewed',
  UNDER_PROCESS: 'under process',
  COMPLETE: 'complete',
  CANCELLED: 'cancelled',
  PAYMENT_CONFIRMATION: 'payment confirmation',
  NEED_TO_REVISE: 'need to revise',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [ORDER_STATUS.CREATED]: 'Created',
  [ORDER_STATUS.TO_BE_VERIFIED]: 'To Be Verified',
  [ORDER_STATUS.REVIEWED]: 'Reviewed',
  [ORDER_STATUS.UNDER_PROCESS]: 'Under Process',
  [ORDER_STATUS.COMPLETE]: 'Complete',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
  [ORDER_STATUS.PAYMENT_CONFIRMATION]: 'Payment Confirmation',
  [ORDER_STATUS.NEED_TO_REVISE]: 'Need to Revise',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  [ORDER_STATUS.CREATED]: 'bg-gray-100 text-gray-800',
  [ORDER_STATUS.TO_BE_VERIFIED]: 'bg-yellow-100 text-yellow-800',
  [ORDER_STATUS.REVIEWED]: 'bg-blue-100 text-blue-800',
  [ORDER_STATUS.UNDER_PROCESS]: 'bg-purple-100 text-purple-800',
  [ORDER_STATUS.COMPLETE]: 'bg-green-100 text-green-800',
  [ORDER_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
  [ORDER_STATUS.PAYMENT_CONFIRMATION]: 'bg-orange-100 text-orange-800',
  [ORDER_STATUS.NEED_TO_REVISE]: 'bg-amber-100 text-amber-800',
};
