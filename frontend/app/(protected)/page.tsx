'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ThroughputChart } from '@/components/dashboard/ThroughputChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { WorksheetTasksWidget } from '@/components/dashboard/WorksheetTasksWidget';
import { operationalStats, financialStats } from '@/data/dashboardData';
import { useBreadcrumbStore } from '@/store/breadcrumbStore';
import { 
  FlaskConical, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  DollarSign,
  CreditCard,
  TrendingUp,
  FileText,
  Calendar,
  FileBarChart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [period, setPeriod] = useState('week');
  const [activeTab, setActiveTab] = useState('operational');
  const setSubPage = useBreadcrumbStore((state) => state.setSubPage);
  const { toast } = useToast();

  useEffect(() => {
    setSubPage(activeTab === 'operational' ? 'Operational' : 'Financial');
  }, [activeTab, setSubPage]);

  const handleGenerateReport = () => {
    toast({
      title: 'Generating Report',
      description: 'Your report is being generated and will be ready shortly.',
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Tabs and Actions */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <TabsList className="bg-muted/60 p-1 h-11">
            <TabsTrigger 
              value="operational" 
              className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Operational
            </TabsTrigger>
            <TabsTrigger 
              value="financial"
              className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Financial
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px] bg-card">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Current Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleGenerateReport} className="gap-2">
              <FileBarChart className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Operational Tab Content */}
        <TabsContent value="operational" className="flex-1 flex flex-col gap-6 mt-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Active Samples"
              value={operationalStats.activeSamples}
              icon={FlaskConical}
              trend={{ value: 12, isPositive: true }}
              description="Currently in progress"
            />
            <MetricCard
              title="Pending Tests"
              value={operationalStats.pendingTests}
              icon={Clock}
              trend={{ value: 8, isPositive: false }}
              description="Awaiting processing"
            />
            <MetricCard
              title="Completed Today"
              value={operationalStats.completedToday}
              icon={CheckCircle2}
              trend={{ value: 24, isPositive: true }}
              description="Tests finished"
            />
            <MetricCard
              title="On Hold"
              value={operationalStats.onHold}
              icon={AlertCircle}
              trend={{ value: 3, isPositive: false }}
              description="Requires attention"
            />
          </div>

          {/* Worksheet Tasks Widget */}
          <WorksheetTasksWidget />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
            <ThroughputChart />
            <ActivityLog />
          </div>
        </TabsContent>

        {/* Financial Tab Content */}
        <TabsContent value="financial" className="flex-1 flex flex-col gap-6 mt-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Revenue"
              value={`$${financialStats.totalRevenue.toLocaleString()}`}
              icon={DollarSign}
              trend={{ value: 18, isPositive: true }}
              description="This month"
            />
            <MetricCard
              title="Outstanding"
              value={`$${financialStats.pendingPayments.toLocaleString()}`}
              icon={CreditCard}
              trend={{ value: 5, isPositive: false }}
              description="Pending payments"
            />
            <MetricCard
              title="Growth"
              value={financialStats.revenueTrend}
              icon={TrendingUp}
              trend={{ value: 12, isPositive: true }}
              description="Month over month"
            />
            <MetricCard
              title="Invoices"
              value={financialStats.outstandingInvoices}
              icon={FileText}
              trend={{ value: 4, isPositive: true }}
              description="Generated this month"
            />
          </div>

          {/* Revenue Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            <RevenueChart />
            <ActivityLog />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


