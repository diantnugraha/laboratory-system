'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { worksheetService } from '@/services/worksheetService';
import {
  AlertCircle,
  Clock,
  FileEdit,
  RotateCcw,
  ArrowRight,
  ClipboardList
} from 'lucide-react';

interface TaskCount {
  label: string;
  count: number;
  icon: React.ReactNode;
  href: string;
  variant: 'default' | 'warning' | 'danger';
}

export function WorksheetTasksWidget() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    today: 0,
    delayed: 0,
    revision: 0,
    retest: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);
        const [todayRes, delayedRes, revisionRes, retestRes] = await Promise.all([
          worksheetService.getToday({ page: 1, limit: 1 }),
          worksheetService.getDelayed({ page: 1, limit: 1 }),
          worksheetService.getRevision({ page: 1, limit: 1 }),
          worksheetService.getRetest({ page: 1, limit: 1 }),
        ]);

        setCounts({
          today: todayRes.pagination.total,
          delayed: delayedRes.pagination.total,
          revision: revisionRes.pagination.total,
          retest: retestRes.pagination.total,
        });
      } catch (error) {
        console.error('Failed to fetch worksheet counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  const tasks: TaskCount[] = [
    {
      label: 'Delayed',
      count: counts.delayed,
      icon: <AlertCircle className="h-4 w-4" />,
      href: '/approval/analyst-worksheet?tab=delayed',
      variant: counts.delayed > 0 ? 'danger' : 'default',
    },
    {
      label: 'Due Today',
      count: counts.today,
      icon: <Clock className="h-4 w-4" />,
      href: '/approval/analyst-worksheet?tab=today',
      variant: counts.today > 0 ? 'warning' : 'default',
    },
    {
      label: 'Revision',
      count: counts.revision,
      icon: <FileEdit className="h-4 w-4" />,
      href: '/approval/analyst-worksheet?tab=revision',
      variant: counts.revision > 0 ? 'warning' : 'default',
    },
    {
      label: 'Retest',
      count: counts.retest,
      icon: <RotateCcw className="h-4 w-4" />,
      href: '/approval/analyst-worksheet?tab=retest',
      variant: counts.retest > 0 ? 'warning' : 'default',
    },
  ];

  const getVariantStyles = (variant: TaskCount['variant']) => {
    switch (variant) {
      case 'danger':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'warning':
        return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      default:
        return 'bg-muted/50 border-border hover:bg-muted';
    }
  };

  const getBadgeVariant = (variant: TaskCount['variant']) => {
    switch (variant) {
      case 'danger':
        return 'destructive';
      case 'warning':
        return 'outline' as const;
      default:
        return 'secondary';
    }
  };

  const getBadgeClassName = (variant: TaskCount['variant']) => {
    if (variant === 'warning') {
      return 'border-amber-500 text-amber-700 bg-amber-100';
    }
    return '';
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            My Worksheet Tasks
          </CardTitle>
          <Link href="/approval/analyst-worksheet">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tasks.map((task) => (
              <Link
                key={task.label}
                href={task.href}
                className={`
                  flex items-center justify-between p-3 rounded-lg border transition-colors
                  ${getVariantStyles(task.variant)}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className={`
                    ${task.variant === 'danger' ? 'text-red-600' : ''}
                    ${task.variant === 'warning' ? 'text-amber-600' : ''}
                    ${task.variant === 'default' ? 'text-muted-foreground' : ''}
                  `}>
                    {task.icon}
                  </span>
                  <span className="text-sm font-medium">{task.label}</span>
                </div>
                <Badge
                  variant={getBadgeVariant(task.variant)}
                  className={getBadgeClassName(task.variant)}
                >
                  {task.count}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
