'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Search, Calendar as CalendarIcon, FlaskConical, X } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import sampleService, { SampleListItem } from "@/services/sampleService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SAMPLE_STATUS_COLORS, SAMPLE_STATUS_LABELS } from "@/lib/constants/sampleStatus";
import { cn } from "@/lib/utils";

// ===== Date Helpers =====

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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

const columns: Column<SampleListItem>[] = [
  {
    key: "code",
    label: "Sample Code",
    render: (item) => (
      <Link
        href={`/operational/sample/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        {item.code || '-'}
      </Link>
    ),
  },
  {
    key: "customer",
    label: "Customer",
    render: (item) => (
      <div className="text-sm truncate max-w-[150px]">
        {item.order?.customer?.customer_name || '-'}
      </div>
    ),
  },
  {
    key: "order",
    label: "Order",
    render: (item) => (
      <div className="text-sm text-muted-foreground">
        {item.order?.code || '-'}
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (item) => (
      <StatusBadge
        status={item.sample_status?.toLowerCase() || ''}
        colorMap={SAMPLE_STATUS_COLORS}
        labelMap={SAMPLE_STATUS_LABELS}
      />
    ),
  },
  {
    key: "received_date",
    label: "Received",
    render: (item) => (
      <div className="text-sm">
        {formatDate(item.received_date)}
      </div>
    ),
  },
  {
    key: "due_date",
    label: "Due Date",
    render: (item) => {
      const overdue = isOverdue(item.due_date);
      return (
        <div className={overdue ? "text-red-600 font-medium" : ""}>
          {formatDate(item.due_date)}
          {overdue && <div className="text-xs">OVERDUE</div>}
        </div>
      );
    },
  },
];

// ===== Main Component =====

export default function SampleTrackingPage() {
  const [samples, setSamples] = useState<SampleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch samples
  const fetchSamples = useCallback(async (
    page: number = 1,
    search?: string,
    status?: string,
    from?: Date,
    to?: Date,
    limit: number = 20
  ) => {
    try {
      setLoading(true);
      const response = await sampleService.getAll({
        page,
        limit,
        search: search && search.length >= 2 ? search : undefined,
        status: status !== 'all' ? status : undefined,
        fromDate: from ? format(from, 'yyyy-MM-dd') : undefined,
        toDate: to ? format(to, 'yyyy-MM-dd') : undefined,
      });

      setSamples(response.data);
      setPagination(response.pagination);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('samples')));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSamples(1, debouncedSearch, statusFilter, fromDate, toDate, pagination.limit);
  }, [debouncedSearch, statusFilter, fromDate, toDate, fetchSamples, pagination.limit]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchSamples(page, debouncedSearch, statusFilter, fromDate, toDate, pagination.limit);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setFromDate(undefined);
    setToDate(undefined);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || fromDate || toDate;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sample Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and track all laboratory samples
          </p>
        </div>
        {pagination.total > 0 && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <FlaskConical className="h-4 w-4" />
            <span className="font-medium">{pagination.total}</span>
            <span>samples</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 p-4 bg-card border rounded-lg shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search sample code or customer..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full lg:w-[160px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
            </SelectContent>
          </Select>

          {/* From Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full lg:w-[160px] justify-start text-left font-normal bg-background",
                  !fromDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, "dd/MM/yyyy") : "From Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={setFromDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* To Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full lg:w-[160px] justify-start text-left font-normal bg-background",
                  !toDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, "dd/MM/yyyy") : "To Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={setToDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearFilters}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear filters</span>
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        title=""
        columns={columns}
        data={samples}
        loading={loading}
        searchPlaceholder=""
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
