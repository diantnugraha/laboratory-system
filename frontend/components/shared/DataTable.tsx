import * as React from "react";
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

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  title: string;
  columns: Column<T>[];
  data: T[];
  onAddNew?: () => void;
  addNewLabel?: string;
  searchPlaceholder?: string;
  itemsPerPage?: number;

  // Server-side mode props (all optional)
  loading?: boolean;
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends { id: string | number }>({
  title,
  columns,
  data,
  onAddNew,
  addNewLabel = "Add New",
  searchPlaceholder = "Search...",
  itemsPerPage = 10,
  loading = false,
  searchValue,
  onSearchChange,
  pagination,
  onPageChange,
}: DataTableProps<T>) {
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalSearch, setInternalSearch] = React.useState("");

  // Determine if using server-side mode
  const isServerSide = !!(pagination && onPageChange);

  // Use external or internal values
  const currentPage = isServerSide ? pagination.page : internalPage;
  const searchQuery = searchValue !== undefined ? searchValue : internalSearch;

  const filteredData = React.useMemo(() => {
    // Skip filtering if server-side (data already filtered by backend)
    if (isServerSide) return data;
    if (!searchQuery.trim()) return data;
    return data.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [data, searchQuery, isServerSide]);

  const totalPages = isServerSide ? pagination.totalPages : Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = isServerSide ? data : filteredData.slice(startIndex, startIndex + itemsPerPage);
  const totalItems = isServerSide ? pagination.total : filteredData.length;

  const handlePageChangeInternal = (page: number) => {
    if (onPageChange) {
      // Server-side mode
      onPageChange(page);
    } else {
      // Client-side mode
      if (page >= 1 && page <= totalPages) {
        setInternalPage(page);
      }
    }
  };

  const handleSearchChangeInternal = (value: string) => {
    if (onSearchChange) {
      // Server-side mode
      onSearchChange(value);
    } else {
      // Client-side mode
      setInternalSearch(value);
    }
  };

  React.useEffect(() => {
    // Only reset page in client-side mode
    if (!isServerSide) {
      setInternalPage(1);
    }
  }, [searchQuery, isServerSide]);

  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];
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
    <div className="space-y-4">
      {(title || onAddNew) && (
        <div className="flex items-center justify-between">
          {title && <h1 className="text-2xl font-semibold text-foreground">{title}</h1>}
          {onAddNew && (
            <Button onClick={onAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              {addNewLabel}
            </Button>
          )}
        </div>
      )}

      {searchPlaceholder && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearchChangeInternal(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {totalItems} items
          </div>
        </div>
      )}

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
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow key={`${item.id}-${index}`}>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {column.render
                        ? column.render(item)
                        : String(item[column.key as keyof T] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChangeInternal(currentPage - 1)}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
                    onClick={() => handlePageChangeInternal(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChangeInternal(currentPage + 1)}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
