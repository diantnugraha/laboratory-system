'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import { orderService, OrderListItem } from "@/services/orderService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RenderHTML } from "@/components/shared/RenderHTML";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

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

const getStatusBadge = (status: string | null) => {
  switch (status?.toLowerCase()) {
    case "created":
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Created</Badge>;
    case "to be verified":
      return <Badge variant="outline" className="text-orange-600 border-orange-600">To Be Verified</Badge>;
    case "reviewed":
      return <Badge variant="outline" className="text-green-600 border-green-600">Reviewed</Badge>;
    case "under process":
      return <Badge variant="secondary">Under Process</Badge>;
    case "complete":
      return <Badge variant="default">Complete</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "payment confirmation":
      return <Badge variant="outline" className="text-purple-600 border-purple-600">Payment Confirmation</Badge>;
    case "need to revise":
      return <Badge variant="outline" className="text-red-600 border-red-600">Need to Revise</Badge>;
    default:
      return <Badge variant="outline">{status || '-'}</Badge>;
  }
};

const getPriorityBadge = (priority: string | null) => {
  switch (priority?.toLowerCase()) {
    case "urgent":
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Urgent</Badge>;
    case "very urgent":
      return <Badge variant="destructive">Very Urgent</Badge>;
    case "special request":
      return <Badge variant="outline" className="text-purple-600 border-purple-600">Special</Badge>;
    case "normal":
    default:
      return <Badge variant="outline" className="text-green-600 border-green-600">Normal</Badge>;
  }
};

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
      return getPriorityBadge(item.orderPriority || rawItem.order_priority);
    },
  },
  {
    key: "orderStatus",
    label: "Status",
    render: (item) => {
      const rawItem = item as unknown as { order_status?: string };
      return getStatusBadge(item.orderStatus || rawItem.order_status);
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
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchOrders = useCallback(async (page: number = 1, search?: string, limit: number = 30) => {
    try {
      setLoading(true);
      const response = await orderService.getAll({
        page,
        limit,
        search: search && search.length >= 2 ? search : undefined,
      });
      setOrders(response.data);
      setPagination(response.pagination);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('orders')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(1, debouncedSearch, pagination.limit);
  }, [fetchOrders, debouncedSearch, pagination.limit]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchOrders(page, debouncedSearch, pagination.limit);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
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
        searchPlaceholder=""
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
