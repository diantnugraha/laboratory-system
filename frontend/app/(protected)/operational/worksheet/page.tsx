'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import { worksheetService, WorksheetListItem } from "@/services/worksheetService";
import { Input } from "@/components/ui/input";
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
import { WORKSHEET_STATUS_COLORS, WORKSHEET_STATUS_LABELS } from "@/lib/constants/worksheetStatus";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/constants/priority";

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

const columns: Column<WorksheetListItem>[] = [
  {
    key: "code",
    label: "Worksheet Code",
    render: (item) => (
      <Link
        href={`/operational/worksheet/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        {item.code || '-'}
      </Link>
    ),
  },
  {
    key: "sample",
    label: "Sample",
    render: (item) => (
      <div className="space-y-0.5">
        <div className="font-medium">{item.sample?.code || '-'}</div>
        <div className="text-sm text-muted-foreground truncate max-w-[180px]">
          {item.sample?.name || '-'}
        </div>
      </div>
    ),
  },
  {
    key: "customer",
    label: "Customer",
    render: (item) => (
      <div className="text-sm truncate max-w-[150px]">
        {item.sample?.order?.customer?.customer_name || '-'}
      </div>
    ),
  },
  {
    key: "parameter",
    label: "Parameter / Method",
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
        status={item.sample?.order?.priority?.toLowerCase() || ''}
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
        {item.analyst?.display_name || <span className="text-muted-foreground">-</span>}
      </span>
    ),
  },
];

// ===== Main Component =====

export default function WorksheetListPage() {
  const [worksheets, setWorksheets] = useState<WorksheetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch worksheets
  const fetchWorksheets = useCallback(async (
    page: number = 1,
    search?: string,
    status?: string,
    limit: number = 20
  ) => {
    try {
      setLoading(true);
      const response = await worksheetService.getAll({
        page,
        limit,
        search: search && search.length >= 2 ? search : undefined,
        status: status !== 'all' ? status : undefined,
      });

      setWorksheets(response.data);
      setPagination(response.pagination);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('worksheets')));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchWorksheets(1, debouncedSearch, statusFilter, pagination.limit);
  }, [debouncedSearch, statusFilter, fetchWorksheets, pagination.limit]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchWorksheets(page, debouncedSearch, statusFilter, pagination.limit);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Worksheet</h1>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code, sample, customer..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Process">Process</SelectItem>
            <SelectItem value="To Be Verified">To Be Verified</SelectItem>
            <SelectItem value="Need to Revised">Need to Revised</SelectItem>
            <SelectItem value="Internal Retest">Internal Retest</SelectItem>
            <SelectItem value="Customer Retest">Customer Retest</SelectItem>
            <SelectItem value="Verified by QC">Verified by QC</SelectItem>
            <SelectItem value="Approved by TM">Approved by TM</SelectItem>
            <SelectItem value="Cancel">Cancel</SelectItem>
          </SelectContent>
        </Select>

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
