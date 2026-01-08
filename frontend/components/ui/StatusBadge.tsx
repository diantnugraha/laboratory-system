import { cn } from '@/lib/utils';
import type { SampleStatus, TestStatus, Priority } from '@/data/mockData';

interface StatusBadgeProps {
  status: SampleStatus | TestStatus;
  className?: string;
}

const statusStyles: Record<SampleStatus | TestStatus, string> = {
  'Received': 'status-pending',
  'Pending': 'status-pending',
  'In Progress': 'status-in-progress',
  'Completed': 'status-completed',
  'Released': 'status-released',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      {status}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityStyles: Record<Priority, string> = {
  'Normal': 'bg-muted text-muted-foreground',
  'Urgent': 'bg-orange-100 text-orange-700',
  'STAT': 'bg-red-100 text-red-700',
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        priorityStyles[priority],
        className
      )}
    >
      {priority}
    </span>
  );
}
