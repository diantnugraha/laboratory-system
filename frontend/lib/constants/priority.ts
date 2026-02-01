export const PRIORITY = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  VERY_URGENT: 'very urgent',
  SPECIAL_REQUEST: 'special request',
} as const;

export type Priority = typeof PRIORITY[keyof typeof PRIORITY];

export const PRIORITY_LABELS: Record<Priority, string> = {
  [PRIORITY.NORMAL]: 'Normal',
  [PRIORITY.URGENT]: 'Urgent',
  [PRIORITY.VERY_URGENT]: 'Very Urgent',
  [PRIORITY.SPECIAL_REQUEST]: 'Special Request',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  [PRIORITY.NORMAL]: 'bg-gray-100 text-gray-800',
  [PRIORITY.URGENT]: 'bg-orange-100 text-orange-800',
  [PRIORITY.VERY_URGENT]: 'bg-red-100 text-red-800',
  [PRIORITY.SPECIAL_REQUEST]: 'bg-purple-100 text-purple-800',
};
