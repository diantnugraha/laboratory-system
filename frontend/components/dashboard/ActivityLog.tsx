import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { recentActivityLogs } from '@/data/dashboardData';
import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ActivityLog() {
  return (
<Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 overflow-auto">
        {recentActivityLogs.map((log) => (
          <div key={log.id} className="flex items-center gap-3">
            <div className={cn(
              'p-2.5 rounded-xl',
              log.status === 'CONFIRMED' ? 'bg-primary/10' : 'bg-orange-100'
            )}>
              <FlaskConical className={cn(
                'h-4 w-4',
                log.status === 'CONFIRMED' ? 'text-primary' : 'text-orange-500'
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Log Entry #{log.id}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {log.status} • {log.time}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
