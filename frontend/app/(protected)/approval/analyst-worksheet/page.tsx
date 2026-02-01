'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Search, AlertCircle, Clock, RotateCcw, FileEdit, User } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import { worksheetService, WorksheetListItem, WorksheetListResponse } from "@/services/worksheetService";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WORKSHEET_STATUS_COLORS, WORKSHEET_STATUS_LABELS } from "@/lib/constants/worksheetStatus";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/constants/priority";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";
import { cn } from "@/lib/utils";

// ===== Constants =====

const PAGE_LIMIT = 20;

// ===== Date Helpers =====

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return dateString;
  }
};

const isOverdue = (dueDate: string | null): boolean => {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

// ===== Table Columns =====

const columns: Column<WorksheetListItem>[] = [
  {
    key: "sample",
    label: "Sample",
    render: (item) => (
      <div className="space-y-0.5">
        <Link
          href={`/approval/analyst-worksheet/${item.id}`}
          className="text-primary hover:underline font-medium block"
        >
          {item.sample?.code || '-'}
        </Link>
        <div className="text-sm text-muted-foreground truncate max-w-[180px]">
          {item.sample?.name || '-'}
        </div>
        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
          {item.sample?.order?.customer?.customer_name || '-'}
        </div>
      </div>
    ),
  },
  {
    key: "parameter",
    label: "Parameter",
    render: (item) => (
      <div className="space-y-0.5">
        <div className="font-medium">{item.service?.parameter?.name || '-'}</div>
        <div className="text-sm text-muted-foreground">{item.service?.method?.name || '-'}</div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (item) => (
      <StatusBadge
        status={item.status || ''}
        colorMap={WORKSHEET_STATUS_COLORS}
        labelMap={WORKSHEET_STATUS_LABELS}
      />
    ),
  },
  {
    key: "priority",
    label: "Priority",
    render: (item) => (
      <StatusBadge
        status={(item.sample?.order?.priority || '').toLowerCase()}
        colorMap={PRIORITY_COLORS}
        labelMap={PRIORITY_LABELS}
      />
    ),
  },
  {
    key: "dueDate",
    label: "Due Date",
    render: (item) => {
      const dueDate = item.sample?.dueDate;
      const overdue = isOverdue(dueDate);
      return (
        <div className={overdue ? "text-red-600 font-medium" : ""}>
          {formatDate(dueDate)}
          {overdue && <div className="text-xs">OVERDUE</div>}
        </div>
      );
    },
  },
  {
    key: "analyst",
    label: "Analyst",
    render: (item) => (
      <span className="text-sm">
        {item.analyst?.display_name || <span className="text-muted-foreground">Unassigned</span>}
      </span>
    ),
  },
];

// ===== Tab Types =====

type TabType = 'my-tasks' | 'today' | 'delayed' | 'revision' | 'retest';

interface TabConfig {
  value: TabType;
  label: string;
  icon: React.ReactNode;
  color: string;
  activeColor: string;
  fetchFn: (params: { page: number; limit: number; search?: string; status?: string }) => Promise<WorksheetListResponse>;
}

// ===== Filter Card Component =====

interface FilterCardProps {
  config: TabConfig;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterCard({ config, count, isActive, onClick }: FilterCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left w-full",
        isActive
          ? `${config.activeColor} border-current`
          : "bg-card border-border hover:bg-muted/50"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-md",
        isActive ? "bg-white/20" : "bg-muted"
      )}>
        <span className={isActive ? "text-current" : config.color}>
          {config.icon}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          isActive ? "text-current" : "text-foreground"
        )}>
          {config.label}
        </p>
      </div>

      <span className={cn(
        "text-xl font-semibold tabular-nums",
        isActive ? "text-current" : config.color
      )}>
        {count}
      </span>
    </button>
  );
}

// ===== Main Component =====

export default function AnalystWorksheetPage() {
  const [activeTab, setActiveTab] = useState<TabType>('my-tasks');
  const [worksheets, setWorksheets] = useState<WorksheetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 0,
  });

  const [tabCounts, setTabCounts] = useState({
    'my-tasks': 0,
    today: 0,
    delayed: 0,
    revision: 0,
    retest: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  const tabConfigs: TabConfig[] = useMemo(() => [
    {
      value: 'my-tasks',
      label: 'My Tasks',
      icon: <User className="h-4 w-4" />,
      color: 'text-blue-600',
      activeColor: 'bg-blue-600 text-white',
      fetchFn: (params) => worksheetService.getAll({
        ...params,
        status: params.status !== 'all' ? params.status : undefined,
      }),
    },
    {
      value: 'today',
      label: 'Due Today',
      icon: <Clock className="h-4 w-4" />,
      color: 'text-teal-600',
      activeColor: 'bg-teal-600 text-white',
      fetchFn: (params) => worksheetService.getToday(params),
    },
    {
      value: 'delayed',
      label: 'Delayed',
      icon: <AlertCircle className="h-4 w-4" />,
      color: 'text-red-600',
      activeColor: 'bg-red-600 text-white',
      fetchFn: (params) => worksheetService.getDelayed(params),
    },
    {
      value: 'revision',
      label: 'Revision',
      icon: <FileEdit className="h-4 w-4" />,
      color: 'text-amber-600',
      activeColor: 'bg-amber-600 text-white',
      fetchFn: (params) => worksheetService.getRevision(params),
    },
    {
      value: 'retest',
      label: 'Retest',
      icon: <RotateCcw className="h-4 w-4" />,
      color: 'text-violet-600',
      activeColor: 'bg-violet-600 text-white',
      fetchFn: (params) => worksheetService.getRetest(params),
    },
  ], []);

  const fetchWorksheets = useCallback(async (
    tab: TabType,
    page: number = 1,
    search?: string,
    status?: string
  ) => {
    try {
      setLoading(true);
      const config = tabConfigs.find(t => t.value === tab);
      if (!config) return;

      const response = await config.fetchFn({
        page,
        limit: PAGE_LIMIT,
        search: search && search.length >= 2 ? search : undefined,
        status: status || 'all',
      });

      setWorksheets(response.data);
      setPagination(response.pagination);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('worksheets')));
    } finally {
      setLoading(false);
    }
  }, [tabConfigs]);

  const fetchTabCounts = useCallback(async () => {
    try {
      const [myTasksRes, todayRes, delayedRes, revisionRes, retestRes] = await Promise.all([
        worksheetService.getAll({ page: 1, limit: 1 }),
        worksheetService.getToday({ page: 1, limit: 1 }),
        worksheetService.getDelayed({ page: 1, limit: 1 }),
        worksheetService.getRevision({ page: 1, limit: 1 }),
        worksheetService.getRetest({ page: 1, limit: 1 }),
      ]);

      setTabCounts({
        'my-tasks': myTasksRes.pagination.total,
        today: todayRes.pagination.total,
        delayed: delayedRes.pagination.total,
        revision: revisionRes.pagination.total,
        retest: retestRes.pagination.total,
      });
    } catch (error) {
      console.error('Failed to fetch tab counts:', error);
    }
  }, []);

  useEffect(() => {
    fetchWorksheets(activeTab, 1, debouncedSearch, statusFilter);
    fetchTabCounts();
  }, [activeTab, debouncedSearch, statusFilter, fetchWorksheets, fetchTabCounts]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchWorksheets(activeTab, page, debouncedSearch, statusFilter);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCardClick = (tab: TabType) => {
    setActiveTab(tab);
    setPagination(prev => ({ ...prev, page: 1 }));
    setStatusFilter('all');
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analyst Worksheet</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your assigned worksheets and tasks
        </p>
      </div>

      {/* Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tabConfigs.map((config) => (
          <FilterCard
            key={config.value}
            config={config}
            count={tabCounts[config.value]}
            isActive={activeTab === config.value}
            onClick={() => handleCardClick(config.value)}
          />
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search worksheets..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {activeTab === 'my-tasks' && (
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Process">Process</SelectItem>
              <SelectItem value="To Be Verified">To Be Verified</SelectItem>
              <SelectItem value="Need to Revised">Need to Revised</SelectItem>
              <SelectItem value="Verified by QC">Verified by QC</SelectItem>
            </SelectContent>
          </Select>
        )}

        <div className="text-sm text-muted-foreground">
          {pagination.total} items
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        title=""
        columns={columns}
        data={worksheets}
        loading={loading}
        searchPlaceholder=""
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
