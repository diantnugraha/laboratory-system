'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DataTable, Column } from "@/components/shared/DataTable";
import { customerService, CustomerListItem } from "@/services/customerService";
import { Badge } from "@/components/ui/badge";
import { RenderHTML } from "@/components/shared/RenderHTML";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

const columns: Column<CustomerListItem>[] = [
  {
    key: "code",
    label: "Code",
    render: (item) => (
      <Link
        href={`/master/customer/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.code} />
      </Link>
    ),
  },
  {
    key: "customer_name",
    label: "Customer Name",
    render: (item) => <RenderHTML html={item.customer_name} />,
  },
  {
    key: "business",
    label: "Business Line",
    render: (item) => <RenderHTML html={item.business} />,
  },
  {
    key: "special_customer",
    label: "Status",
    render: (item) => (
      <Badge variant={item.special_customer === 1 ? "secondary" : "default"}>
        {item.special_customer === 1 ? "Whitelist" : "Non Whitelist"}
      </Badge>
    ),
  },
];

export default function CustomerPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 1000,
    total: 0,
    totalPages: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchCustomers = useCallback(async (page: number = 1, search?: string) => {
    try {
      setLoading(true);
      const response = await customerService.getAll({
        page,
        limit: 1000,
        search: search && search.length >= 2 ? search : undefined,
        months: 0, // Get all customers, not just last 6 months
      });
      setCustomers(response.data);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(1, debouncedSearch);
  }, [fetchCustomers, debouncedSearch]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchCustomers(page, debouncedSearch);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <DataTable
      title="Customer"
      columns={columns}
      data={customers}
      loading={loading}
      onAddNew={() => router.push("/master/customer/new")}
      addNewLabel="Add Customer"
      searchPlaceholder="Search customers..."
      searchValue={searchQuery}
      onSearchChange={handleSearch}
      pagination={pagination}
      onPageChange={handlePageChange}
    />
  );
}
