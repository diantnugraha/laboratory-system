import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { revenueChartData } from '@/data/dashboardData';

export function RevenueChart() {
  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">Revenue vs Expenses</CardTitle>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
            Monthly Overview
          </p>
        </div>
      </CardHeader>
      <CardContent className="pb-4 flex-1">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              />
              <Legend />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                name="Revenue"
              />
              <Bar 
                dataKey="expenses" 
                fill="hsl(var(--muted-foreground))" 
                radius={[4, 4, 0, 0]}
                name="Expenses"
                opacity={0.5}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
