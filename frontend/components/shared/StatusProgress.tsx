'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ===== Status Badge Variant Helper =====

export type StatusBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * Get badge variant based on status string
 * Works for both sample and worksheet statuses
 */
export function getStatusBadgeVariant(status: string): StatusBadgeVariant {
  const normalizedStatus = status.toLowerCase();

  // Completed/Approved statuses
  if (
    normalizedStatus.includes('approved') ||
    normalizedStatus.includes('verified') ||
    normalizedStatus === 'complete' ||
    normalizedStatus === 'reviewed'
  ) {
    return 'default';
  }

  // In-progress statuses
  if (
    normalizedStatus === 'process' ||
    normalizedStatus === 'to be verified' ||
    normalizedStatus === 'under process'
  ) {
    return 'secondary';
  }

  // Problem/Action needed statuses
  if (
    normalizedStatus.includes('retest') ||
    normalizedStatus.includes('revise') ||
    normalizedStatus.includes('revised') ||
    normalizedStatus === 'cancelled'
  ) {
    return 'destructive';
  }

  // Default/Created status
  return 'outline';
}

// ===== Status Badge Component =====

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'default';
  className?: string;
}

/**
 * Reusable Status Badge component with automatic styling
 */
export function StatusBadge({ status, size = 'default', className }: StatusBadgeProps) {
  const variant = getStatusBadgeVariant(status);

  return (
    <Badge
      variant={variant}
      className={cn(size === 'sm' && 'text-xs', className)}
    >
      {status}
    </Badge>
  );
}

// ===== Progress Bar Component =====

interface ProgressBarProps {
  completed: number;
  total: number;
  label?: string;
  showCount?: boolean;
  className?: string;
}

/**
 * Reusable Progress Bar component with label and count
 *
 * @example
 * <ProgressBar completed={3} total={5} label="Worksheet Progress" showCount />
 */
export function ProgressBar({
  completed,
  total,
  label,
  showCount = true,
  className,
}: ProgressBarProps) {
  const percent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className={cn('space-y-2', className)}>
      {(label || showCount) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-sm">{label}</span>}
          {showCount && (
            <span className="text-sm font-medium">
              {completed}/{total} Complete
            </span>
          )}
        </div>
      )}
      <Progress value={percent} className="h-2" />
    </div>
  );
}

// ===== Verification Status Indicator =====

interface VerificationStatusProps {
  label: string;
  isDone: boolean;
  className?: string;
}

/**
 * Verification status indicator with colored dot
 *
 * @example
 * <VerificationStatus label="Verification (Micro)" isDone={true} />
 */
export function VerificationStatus({ label, isDone, className }: VerificationStatusProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'w-3 h-3 rounded-full',
          isDone ? 'bg-green-500' : 'bg-gray-300'
        )}
      />
      <span className="text-sm">{label}</span>
      <span className="text-xs text-muted-foreground">
        {isDone ? 'Done' : 'Pending'}
      </span>
    </div>
  );
}

// ===== Status Progress Card =====

interface WorksheetProgressData {
  completed: number;
  total: number;
}

interface StatusProgressCardProps {
  status: string;
  worksheetProgress?: WorksheetProgressData;
  verificationMicro?: number | null;
  verificationChem?: number | null;
  className?: string;
}

/**
 * Combined status and progress card content
 * For use in Sample Detail page status card
 */
export function StatusProgressContent({
  status,
  worksheetProgress,
  verificationMicro,
  verificationChem,
  className,
}: StatusProgressCardProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Status Badge */}
      <div>
        <p className="text-xs text-muted-foreground uppercase">Status</p>
        <StatusBadge status={status} className="mt-1" />
      </div>

      {/* Verification Status */}
      {(verificationMicro !== undefined || verificationChem !== undefined) && (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          {verificationMicro !== undefined && (
            <VerificationStatus
              label="Verification (Micro)"
              isDone={verificationMicro === 1}
            />
          )}
          {verificationChem !== undefined && (
            <VerificationStatus
              label="Verification (Chem)"
              isDone={verificationChem === 1}
            />
          )}
        </div>
      )}

      {/* Worksheet Progress */}
      {worksheetProgress && (
        <div className="pt-2 border-t">
          <ProgressBar
            completed={worksheetProgress.completed}
            total={worksheetProgress.total}
            label="Worksheet Progress"
            showCount
          />
        </div>
      )}
    </div>
  );
}

export default {
  StatusBadge,
  ProgressBar,
  VerificationStatus,
  StatusProgressContent,
  getStatusBadgeVariant,
};
