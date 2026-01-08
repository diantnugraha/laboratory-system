'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from 'next/link';
import { Plus, Search, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MethodFormDialog } from "@/components/forms/MethodFormDialog";
import { methodService, Method } from "@/services/methodService";
import { toast } from "sonner";
import { RenderHTML } from "@/components/shared/RenderHTML";

const columns = [
  { 
    key: "code", 
    label: "Code",
    render: (item: Method) => (
      <Link 
        href={`/master/method/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.code} />
      </Link>
    ),
  },
  { 
    key: "name", 
    label: "Name",
    render: (item: Method) => <RenderHTML html={item.name} />,
  },
  { 
    key: "category_name", 
    label: "Category",
    render: (item: Method) => (
      <Badge variant={item.category_name === "Official" ? "default" : "outline"}>
        <RenderHTML html={item.category_name || "N/A"} />
      </Badge>
    ),
  },
];

export default function MethodPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchMethods = useCallback(async (page: number = 1, search?: string) => {
    try {
      setLoading(true);
      const response = await methodService.getAll({
        page,
        limit: 20,
        search: search && search.length >= 2 ? search : undefined,
      });
      setMethods(response.data);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Error fetching methods:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch methods');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods(pagination.page, debouncedSearch);
  }, [fetchMethods, pagination.page, debouncedSearch]);

  const handleRefresh = () => {
    fetchMethods(pagination.page, debouncedSearch);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page }));
    }
  };

  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];
    const { totalPages, page: currentPage } = pagination;
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages);
      }
    }
    return pages;
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Method</h1>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Method
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search methods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${pagination.total} items`}
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {columns.map((column) => (
                  <TableHead key={String(column.key)} className="font-semibold">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : methods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    No methods found
                  </TableCell>
                </TableRow>
              ) : (
                methods.map((item) => (
                  <TableRow key={item.id}>
                    {columns.map((column) => (
                      <TableCell key={String(column.key)}>
                        {column.render
                          ? column.render(item)
                          : String(item[column.key as keyof Method] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className={pagination.page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {getVisiblePages().map((page, index) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={pagination.page === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className={pagination.page === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
      <MethodFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={handleRefresh}
      />
    </>
  );
}
