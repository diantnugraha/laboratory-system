'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import { packageService, PackageListItem, PackagesResponse } from "@/services/packageService";
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

// Helper to parse service list and count services
const parseServiceList = (listService: string | null | undefined): number[] => {
  if (!listService || typeof listService !== 'string') {
    return [];
  }
  const trimmed = listService.trim().replace(/^,+|,+$/g, '');
  if (!trimmed) {
    return [];
  }
  return trimmed
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id) && id > 0);
};

const columns: Column<PackageListItem>[] = [
  {
    key: "code",
    label: "Code",
    render: (item) => (
      <Link
        href={`/master/package/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.code} />
      </Link>
    ),
  },
  {
    key: "name",
    label: "Package Name",
    render: (item) => <RenderHTML html={item.name} />,
  },
  {
    key: "listService",
    label: "Services",
    render: (item) => {
      const serviceCount = parseServiceList(item.listService).length;
      return <span>{serviceCount} service{serviceCount !== 1 ? 's' : ''}</span>;
    },
  },
  {
    key: "totalPrice",
    label: "Price (IDR)",
    render: (item) => formatCurrency(item.totalPrice || 0),
  },
];

export default function PackagePage() {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchPackages = useCallback(async (page: number = 1, search?: string, limit: number = 30) => {
    try {
      setLoading(true);
      const response = await packageService.getAll({
        page,
        limit,
        search: search && search.length >= 2 ? search : undefined,
      }) as PackagesResponse;

      setPackages(response.data || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('packages')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages(1, debouncedSearch, pagination.limit);
  }, [fetchPackages, debouncedSearch, pagination.limit]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchPackages(page, debouncedSearch, pagination.limit);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-4">
      {/* Title and Add Button Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Package</h1>
        <Button onClick={() => router.push("/master/package/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Package
        </Button>
      </div>

      {/* Search Row */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
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
        data={packages}
        loading={loading}
        searchPlaceholder=""
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
