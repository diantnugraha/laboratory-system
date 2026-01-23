'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import { preorderService, PreOrderListItem } from "@/services/preorderService";
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

const getLabLabel = (lab: number) => {
  switch (lab) {
    case 1:
      return "CTS";
    case 2:
      return "NCTS";
    default:
      return "-";
  }
};

const columns: Column<PreOrderListItem>[] = [
  {
    key: "code",
    label: "Code",
    render: (item) => (
      <Link
        href={`/operational/preorder/${item.id}`}
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
    render: (item) => item.contact?.name || '-',
  },
  {
    key: "receivedDate",
    label: "Received Date",
    render: (item) => {
      const rawItem = item as unknown as { received_date?: string };
      return formatDate(item.receivedDate || rawItem.received_date || null);
    },
  },
  {
    key: "sampleQuantity",
    label: "Sample Qty",
    render: (item) => {
      const rawItem = item as unknown as { sample_quantity?: number };
      return item.sampleQuantity || rawItem.sample_quantity || 0;
    },
  },
  {
    key: "lab",
    label: "Lab",
    render: (item) => getLabLabel(item.lab),
  },
  {
    key: "priority",
    label: "Priority",
    render: (item) => getPriorityBadge(item.priority),
  },
  {
    key: "order",
    label: "Order",
    render: (item) => {
      if (item.order?.code) {
        return (
          <Link
            href={`/operational/order/${item.order.id}`}
            className="text-primary hover:underline"
          >
            {item.order.code}
          </Link>
        );
      }
      return (
        <Link href={`/operational/order/new?preorderId=${item.id}`}>
          <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
            Create Order
          </Badge>
        </Link>
      );
    },
  },
];

export default function PreOrderPage() {
  const router = useRouter();
  const [preorders, setPreorders] = useState<PreOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchPreorders = useCallback(async (page: number = 1, search?: string, limit: number = 30) => {
    try {
      setLoading(true);
      const response = await preorderService.getAll({
        page,
        limit,
        search: search && search.length >= 2 ? search : undefined,
      });
      setPreorders(response.data);
      setPagination(response.pagination);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('pre orders')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreorders(1, debouncedSearch, pagination.limit);
  }, [fetchPreorders, debouncedSearch, pagination.limit]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchPreorders(page, debouncedSearch, pagination.limit);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-4">
      {/* Title and Add Button Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Pre Order</h1>
        <Button onClick={() => router.push("/operational/preorder/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Pre Order
        </Button>
      </div>

      {/* Search Row */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search pre orders..."
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
        data={preorders}
        loading={loading}
        searchPlaceholder=""
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
