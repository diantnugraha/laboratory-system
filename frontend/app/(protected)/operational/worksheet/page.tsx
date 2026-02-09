'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import { worksheetService, WorksheetListItem } from "@/services/worksheetService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

const PAGE_SIZE = 50;

export default function WorksheetListPage() {
  const [worksheets, setWorksheets] = useState<WorksheetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cursorStack, setCursorStack] = useState<(number | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search with 1 second delay (optimized for large datasets)
  const debouncedSearch = useDebounce(searchQuery, 1000);

  // Fetch worksheets with cursor
  const fetchWorksheets = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const cursor = cursorStack[page - 1] ?? null;

      const response = await worksheetService.getAllCursor({
        cursor: cursor || undefined,
        limit: PAGE_SIZE,
        search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      setWorksheets(response.data);

      // Update cursor stack for next page if there's more data
      if (response.hasMore && response.data.length > 0) {
        const nextCursor = response.data[response.data.length - 1].id;
        if (cursorStack.length === page) {
          setCursorStack([...cursorStack, nextCursor]);
        }
        // Estimate total pages (we know at least page + 1 exists)
        setTotalPages(page + 1);
      } else {
        // No more data, we're on the last page
        setTotalPages(page);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, cursorStack]);

  // Initial load and reload on filter change
  useEffect(() => {
    setCursorStack([null]);
    setCurrentPage(1);
    setTotalPages(1);
    fetchWorksheets(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchWorksheets(page);
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
            placeholder="Search by code (min 2 chars)..."
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
      </div>

      {/* Data Table with built-in pagination */}
      <DataTable
        title=""
        columns={columns}
        data={worksheets}
        loading={loading}
        searchPlaceholder=""
        pagination={{
          page: currentPage,
          limit: PAGE_SIZE,
          total: worksheets.length,
          totalPages: totalPages,
        }}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
