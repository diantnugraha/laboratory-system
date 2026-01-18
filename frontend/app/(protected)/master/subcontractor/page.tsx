'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import { subcontractorService, Subcontractor } from "@/services/subcontractorService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RenderHTML } from "@/components/shared/RenderHTML";
import { SubcontractorFormDialog } from "@/components/forms/SubcontractorFormDialog";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

const columns: Column<Subcontractor>[] = [
  {
    key: "lab_name",
    label: "Lab Name",
    render: (item) => (
      <Link
        href={`/master/subcontractor/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.lab_name} />
      </Link>
    ),
  },
  {
    key: "phone",
    label: "Phone",
    render: (item) => <RenderHTML html={item.phone} />,
  },
  {
    key: "email",
    label: "Email",
    render: (item) => <RenderHTML html={item.email} />,
  },
];

export default function SubcontractorPage() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });

  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchSubcontractors = useCallback(async (page: number = 1, search?: string, limit: number = 30) => {
    try {
      setLoading(true);
      const response = await subcontractorService.getAll({
        page,
        limit,
        search: search && search.length >= 2 ? search : undefined,
      });
      setSubcontractors(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('subcontractors')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubcontractors(1, debouncedSearch, pagination.limit);
  }, [fetchSubcontractors, debouncedSearch, pagination.limit]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    fetchSubcontractors(page, debouncedSearch, pagination.limit);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSuccess = () => {
    fetchSubcontractors(pagination.page, debouncedSearch, pagination.limit);
  };

  return (
    <div className="space-y-4">
      {/* Title and Add Button Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Subcontractor</h1>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Subcontractor
        </Button>
      </div>

      {/* Search Row */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subcontractors..."
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
        data={subcontractors}
        loading={loading}
        searchPlaceholder=""
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* Form Dialog */}
      <SubcontractorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
