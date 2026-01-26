import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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

const Dashboard = () => {
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
    <AppLayout>
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
                </SelectContent>
              </Select>
              <Button onClick={handleGenerateReport} className="gap-2">
                <FileBarChart className="h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>

          {/* Operational Tab */}
          <TabsContent value="operational" className="mt-6 flex-1 flex flex-col gap-6 data-[state=inactive]:hidden">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <MetricCard
                  label="Samples"
                  value={operationalStats.totalSamples.toLocaleString()}
                  icon={FlaskConical}
                  trend={operationalStats.samplesTrend}
                  trendType="positive"
                  iconBgColor="bg-blue-100"
                  iconColor="text-blue-600"
                />
                <MetricCard
                  label="Avg. TAT"
                  value={operationalStats.avgTurnaround}
                  icon={Clock}
                  trend={operationalStats.tatTrend}
                  trendType="positive"
                  iconBgColor="bg-amber-100"
                  iconColor="text-amber-600"
                />
                <MetricCard
                  label="Compliance"
                  value={`${operationalStats.compliance}%`}
                  icon={CheckCircle2}
                  trend={operationalStats.complianceStatus}
                  trendType="neutral"
                  iconBgColor="bg-green-100"
                  iconColor="text-green-600"
                />
                <MetricCard
                  label="Pending"
                  value={operationalStats.pendingCount}
                  icon={AlertCircle}
                  trend={operationalStats.pendingTrend}
                  trendType="negative"
                  iconBgColor="bg-red-100"
                  iconColor="text-red-500"
                />
              </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
              <ThroughputChart />
              <ActivityLog />
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="mt-6 flex-1 flex flex-col gap-6 data-[state=inactive]:hidden">
              {/* Financial Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Revenue"
                  value={`$${(financialStats.totalRevenue / 1000).toFixed(1)}K`}
                  icon={DollarSign}
                  trend={financialStats.revenueTrend}
                  trendType="positive"
                  iconBgColor="bg-green-100"
                  iconColor="text-green-600"
                />
                <MetricCard
                  label="Pending Payments"
                  value={`$${(financialStats.pendingPayments / 1000).toFixed(1)}K`}
                  icon={CreditCard}
                  trend={financialStats.paymentsTrend}
                  trendType="positive"
                  iconBgColor="bg-amber-100"
                  iconColor="text-amber-600"
                />
                <MetricCard
                  label="Avg. Test Cost"
                  value={`$${financialStats.avgTestCost}`}
                  icon={TrendingUp}
                  trend={financialStats.costTrend}
                  trendType="negative"
                  iconBgColor="bg-blue-100"
                  iconColor="text-blue-600"
                />
                <MetricCard
                  label="Open Invoices"
                  value={financialStats.outstandingInvoices}
                  icon={FileText}
                  trend={financialStats.invoicesTrend}
                  trendType="negative"
                  iconBgColor="bg-purple-100"
                  iconColor="text-purple-600"
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
    </AppLayout>
  );
};

export default Dashboard;
