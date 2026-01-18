'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import { contractService, ContractListItem } from "@/services/contractService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RenderHTML } from "@/components/shared/RenderHTML";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const columns: Column<ContractListItem>[] = [
  {
    key: "code",
    label: "Code",
    render: (item) => (
      <Link
        href={`/master/contract/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.code} />
      </Link>
    ),
  },
  {
    key: "customer",
    label: "Customer",
    render: (item) => <RenderHTML html={item.customer?.customer_name || '-'} />,
  },
  {
    key: "period",
    label: "Period",
    render: (item) => (
      <span className="text-sm">
        {formatDate(item.periodFrom)} - {formatDate(item.periodTo)}
      </span>
    ),
  },
  {
    key: "statusService",
    label: "Service Mode",
    render: (item) => {
      const isAll = item.statusService?.toUpperCase() === "ALL";
      return (
        <Badge
          variant={isAll ? "default" : "outline"}
          className={isAll
            ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }
        >
          {isAll ? "All" : "Selected"}
        </Badge>
      );
    },
  },
  {
    key: "normalDay",
    label: "Lead Time",
    render: (item) => (
      <span className="text-sm text-muted-foreground">
        {item.normalDay}/{item.urgentDay}/{item.veryUrgentDay} days
      </span>
    ),
  },
];

export default function ContractPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchContracts = useCallback(async (page: number = 1, search?: string, limit: number = 30) => {
    try {
      setLoading(true);
      const response = await contractService.getAll({
        page,
        limit,
        search: search && search.length >= 2 ? search : undefined,
      });
      setContracts(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('contracts')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts(1, debouncedSearch, pagination.limit);
  }, [fetchContracts, debouncedSearch, pagination.limit]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchContracts(page, debouncedSearch, pagination.limit);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-4">
      {/* Title and Add Button Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Contract</h1>
        <Button onClick={() => router.push("/master/contract/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Contract
        </Button>
      </div>

      {/* Search Row */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
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
        data={contracts}
        loading={loading}
        searchPlaceholder=""
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
