// Extended mock data for dashboard

export const operationalStats = {
  totalSamples: 3248,
  samplesTrend: '+8%',
  avgTurnaround: 2.4,
  tatTrend: '-0.2D',
  compliance: 99.2,
  complianceStatus: 'OPTIMAL',
  pendingCount: 14,
  pendingTrend: '+2',
  activeSamples: 124,
  pendingTests: 38,
  completedToday: 156,
  onHold: 7,
};

export const financialStats = {
  totalRevenue: 284500,
  revenueTrend: '+12%',
  pendingPayments: 45200,
  paymentsTrend: '-5%',
  avgTestCost: 42.50,
  costTrend: '+2%',
  outstandingInvoices: 28,
  invoicesTrend: '+4',
};

export const throughputData = [
  { time: '00:00', value: 35 },
  { time: '02:00', value: 38 },
  { time: '04:00', value: 42 },
  { time: '06:00', value: 48 },
  { time: '08:00', value: 52 },
  { time: '10:00', value: 58 },
  { time: '12:00', value: 72 },
  { time: '14:00', value: 68 },
  { time: '16:00', value: 55 },
  { time: '18:00', value: 42 },
  { time: '20:00', value: 32 },
  { time: '22:00', value: 25 },
];

export const revenueChartData = [
  { month: 'Jan', revenue: 42000, expenses: 28000 },
  { month: 'Feb', revenue: 48000, expenses: 30000 },
  { month: 'Mar', revenue: 52000, expenses: 32000 },
  { month: 'Apr', revenue: 58000, expenses: 35000 },
  { month: 'May', revenue: 62000, expenses: 38000 },
  { month: 'Jun', revenue: 68000, expenses: 40000 },
];

export const recentActivityLogs = [
  { id: '615', status: 'CONFIRMED', time: '1M AGO' },
  { id: '738', status: 'CONFIRMED', time: '2M AGO' },
  { id: '861', status: 'CONFIRMED', time: '3M AGO' },
  { id: '984', status: 'CONFIRMED', time: '4M AGO' },
  { id: '1024', status: 'PENDING', time: '5M AGO' },
];
