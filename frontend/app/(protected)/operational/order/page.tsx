'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import { orderService, OrderListItem } from "@/services/orderService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RenderHTML } from "@/components/shared/RenderHTML";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/constants/orderStatus";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/constants/priority";

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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const PAGE_LIMIT = 30;

const columns: Column<OrderListItem>[] = [
  {
    key: "code",
    label: "Code",
    render: (item) => (
      <Link
        href={`/operational/order/${item.id}`}
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
      const customerData = item.customer as { name?: string; customer_name?: string } | null;
      const customerName = customerData?.name || customerData?.customer_name;
      return customerName ? <RenderHTML html={customerName} /> : '-';
    },
  },
  {
    key: "contact",
    label: "Contact",
    render: (item) => {
      const contactData = item.contact;
      return contactData?.name ? <RenderHTML html={contactData.name} /> : '-';
    },
  },
  {
    key: "orderDate",
    label: "Order Date",
    render: (item) => {
      const rawItem = item as unknown as { order_date?: string };
      return formatDate(item.orderDate || rawItem.order_date || null);
    },
  },
  {
    key: "orderPriority",
    label: "Priority",
    render: (item) => {
      const rawItem = item as unknown as { order_priority?: string };
      const priority = item.orderPriority || rawItem.order_priority || '';
      return (
        <StatusBadge
          status={priority.toLowerCase()}
          colorMap={PRIORITY_COLORS}
          labelMap={PRIORITY_LABELS}
        />
      );
    },
  },
  {
    key: "orderStatus",
    label: "Status",
    render: (item) => {
      const rawItem = item as unknown as { order_status?: string };
      const status = item.orderStatus || rawItem.order_status || '';
      return (
        <StatusBadge
          status={status.toLowerCase()}
          colorMap={ORDER_STATUS_COLORS}
          labelMap={ORDER_STATUS_LABELS}
        />
      );
    },
  },
  {
    key: "total",
    label: "Total (IDR)",
    render: (item) => formatCurrency(item.total || 0),
  },
];

export default function OrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const initialSearch = searchParams.get('search') || '';
  const initialPage = Number(searchParams.get('page')) || 1;

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Update URL with current filter state
  const updateURL = useCallback((params: Record<string, string | number | undefined>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 1) {
        newParams.set(key, String(value));
      } else {
        newParams.delete(key);
      }
    });
    const queryString = newParams.toString();
    router.replace(queryString ? `?${queryString}` : '', { scroll: false });
  }, [searchParams, router]);

  const fetchOrders = useCallback(async (page: number = 1, search?: string, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderService.getAll({
        page,
        limit: PAGE_LIMIT,
        search: search && search.length >= 2 ? search : undefined,
      }, signal);
      setOrders(response.data);
      setPagination(response.pagination);
    } catch (err) {
      // Ignore cancelled requests (from AbortController)
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'CanceledError')) return;
      const errorMessage = getErrorMessage(err, OPERATION_ERROR_MESSAGES.FETCH('orders'));
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(pagination.page, debouncedSearch, controller.signal);
    return () => controller.abort();
  }, [fetchOrders, debouncedSearch, pagination.page]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    updateURL({ search: debouncedSearch, page });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
    updateURL({ search: query, page: 1 });
  };

  const handleRetry = () => {
    fetchOrders(pagination.page, debouncedSearch);
  };

  return (
    <div className="space-y-4">
      {/* Title and Add Button Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Order</h1>
        <Button onClick={() => router.push("/operational/order/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Order
        </Button>
      </div>

      {/* Search Row */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
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
        data={orders}
        loading={loading}
        error={error}
        onRetry={handleRetry}
        searchPlaceholder=""
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
