import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from '@/data/mockData';
import { TestTube, CheckCircle, Send, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  activities: Activity[];
}

const activityIcons = {
  sample_received: TestTube,
  test_completed: CheckCircle,
  result_released: Send,
  sample_registered: Plus,
};

const activityColors = {
  sample_received: 'text-status-pending bg-[hsl(var(--status-pending)/0.1)]',
  test_completed: 'text-status-completed bg-[hsl(var(--status-completed)/0.1)]',
  result_released: 'text-status-released bg-[hsl(var(--status-released)/0.1)]',
  sample_registered: 'text-primary bg-primary/10',
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type];
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={cn('p-2 rounded-lg', activityColors[activity.type])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
