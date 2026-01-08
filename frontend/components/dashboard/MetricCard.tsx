import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MetricCardProps {
  label?: string;
  title?: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string | { value: number; isPositive: boolean };
  trendType?: 'positive' | 'negative' | 'neutral';
  description?: string;
  iconBgColor?: string;
  iconColor?: string;
}

export function MetricCard({ 
  label,
  title,
  value, 
  icon: Icon, 
  trend, 
  trendType,
  description,
  iconBgColor = 'bg-primary/10',
  iconColor = 'text-primary'
}: MetricCardProps) {
  const trendColors = {
    positive: 'bg-green-100 text-green-600',
    negative: 'bg-red-100 text-red-600',
    neutral: 'bg-muted text-muted-foreground',
  };

  // Use title or label (title takes precedence)
  const displayLabel = title || label || '';

  // Handle trend - can be string or object
  let trendDisplay: string | null = null;
  let finalTrendType: 'positive' | 'negative' | 'neutral' = trendType || 'neutral';

  if (trend) {
    if (typeof trend === 'string') {
      trendDisplay = trend;
    } else if (typeof trend === 'object' && 'value' in trend && 'isPositive' in trend) {
      // Format as percentage: +12% or -12%
      trendDisplay = `${trend.isPositive ? '+' : '-'}${trend.value}%`;
      finalTrendType = trend.isPositive ? 'positive' : 'negative';
    }
  }

  return (
    <Card className="relative overflow-hidden bg-card border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn('p-2.5 rounded-xl', iconBgColor)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {displayLabel}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {trendDisplay && (
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                trendColors[finalTrendType]
              )}>
                {trendDisplay}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
