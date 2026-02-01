import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  colorMap: Record<string, string>;
  labelMap?: Record<string, string>;
  className?: string;
}

export function StatusBadge({
  status,
  colorMap,
  labelMap,
  className
}: StatusBadgeProps) {
  const colorClass = colorMap[status] || 'bg-gray-100 text-gray-800';
  const label = labelMap?.[status] || status;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
