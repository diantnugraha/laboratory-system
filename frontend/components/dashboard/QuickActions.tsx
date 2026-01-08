import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileText, FlaskConical } from 'lucide-react';
'use client';

import { useRouter } from 'next/navigation';

export function QuickActions() {
  const router = useRouter();

  const actions = [
    { label: 'Register Sample', icon: Plus, onClick: () => router.push('/samples/new') },
    { label: 'Search Samples', icon: Search, onClick: () => router.push('/samples') },
    { label: 'Enter Results', icon: FlaskConical, onClick: () => router.push('/results') },
    { label: 'View Reports', icon: FileText, onClick: () => router.push('/reports') },
  ];

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-accent hover:border-primary/20"
            onClick={action.onClick}
          >
            <action.icon className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
