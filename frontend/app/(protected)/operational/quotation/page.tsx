'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import { quotationService, QuotationListItem } from "@/services/quotationService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RenderHTML } from "@/components/shared/RenderHTML";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Created":
      return "secondary";
    case "Order":
      return "default";
    default:
      return "secondary";
  }
};

const getPriorityBadge = (priority: string | null) => {
  if (!priority) return null;
  switch (priority) {
    case "urgent":
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Urgent</Badge>;
    case "very urgent":
      return <Badge variant="destructive">Very Urgent</Badge>;
    default:
      return null;
  }
};

const columns: Column<QuotationListItem>[] = [
  {
    key: "code",
    label: "Code",
    render: (item) => (
      <Link
        href={`/operational/quotation/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.code} />
      </Link>
    ),
  },
  {
    key: "customer",
    label: "Customer",
    render: (item) => {
      // Handle both API response formats: customer.name or customer.customer_name
      const customerData = item.customer as { name?: string; customer_name?: string } | null;
      const customerName = customerData?.name || customerData?.customer_name;
      return customerName ? <RenderHTML html={customerName} /> : '-';
    },
  },
  {
    key: "quoDate",
    label: "Date",
    render: (item) => {
      // Handle both formats: quoDate (transformed) or quo_date (raw)
      const rawItem = item as unknown as { quo_date?: string };
      return formatDate(item.quoDate || rawItem.quo_date || null);
    },
  },
  {
    key: "expiredDate",
    label: "Valid Until",
    render: (item) => {
      // Handle both formats: expiredDate (transformed) or expired_date (raw)
      const rawItem = item as unknown as { expired_date?: string };
      return formatDate(item.expiredDate || rawItem.expired_date || null);
    },
  },
  {
    key: "total",
    label: "Total",
    render: (item) => formatCurrency(item.total),
  },
  {
    key: "priority",
    label: "Priority",
    render: (item) => getPriorityBadge(item.priority),
  },
  {
    key: "quoStatus",
    label: "Status",
    render: (item) => {
      // Handle both formats: quoStatus (transformed) or quo_status (raw)
      const rawItem = item as unknown as { quo_status?: string };
      const status = item.quoStatus || rawItem.quo_status || 'Created';
      return (
        <Badge variant={getStatusVariant(status)}>
          {status}
        </Badge>
      );
    },
  },
];

export default function QuotationPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchQuotations = useCallback(async (page: number = 1, search?: string, limit: number = 30) => {
    try {
      setLoading(true);
      const response = await quotationService.getAll({
        page,
        limit,
        search: search && search.length >= 2 ? search : undefined,
      });
      setQuotations(response.data);
      setPagination(response.pagination);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('quotations')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations(1, debouncedSearch, pagination.limit);
  }, [fetchQuotations, debouncedSearch, pagination.limit]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchQuotations(page, debouncedSearch, pagination.limit);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-4">
      {/* Title and Add Button Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Quotation</h1>
        <Button onClick={() => router.push("/operational/quotation/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Quotation
        </Button>
      </div>

      {/* Search Row */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quotations..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {pagination.total} items
        </div>
      </div>

      {/* DataTable - Only Table & Pagination */}
      <DataTable
        title=""
        columns={columns}
        data={quotations}
        loading={loading}
        searchPlaceholder=""
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
