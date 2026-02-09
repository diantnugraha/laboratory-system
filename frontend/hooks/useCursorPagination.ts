import { useState, useCallback } from 'react';
import { getErrorMessage } from '@/lib/utils/errorHandler';
import { toast } from 'sonner';

/**
 * Cursor-based pagination hook for large datasets
 * Optimized for 500K+ records with infinite scroll support
 */
interface UseCursorPaginationOptions<T> {
  fetchFn: (cursor: number | null, limit: number) => Promise<{
    data: T[];
    cursor: number | null;
    hasMore: boolean;
  }>;
  limit?: number;
}

interface UseCursorPaginationReturn<T> {
  items: T[];
  hasMore: boolean;
  loading: boolean;
  loadMore: () => Promise<void>;
  reset: () => void;
  refresh: () => Promise<void>;
}

export function useCursorPagination<T>({
  fetchFn,
  limit = 50,
}: UseCursorPaginationOptions<T>): UseCursorPaginationReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  /**
   * Load more items
   */
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetchFn(cursor, limit);

      setItems((prev) => [...prev, ...response.data]);
      setCursor(response.cursor);
      setHasMore(response.hasMore);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, fetchFn, limit]);

  /**
   * Reset pagination to initial state
   */
  const reset = useCallback(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
  }, []);

  /**
   * Refresh from start
   */
  const refresh = useCallback(async () => {
    reset();
    setLoading(true);
    try {
      const response = await fetchFn(null, limit);

      setItems(response.data);
      setCursor(response.cursor);
      setHasMore(response.hasMore);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [reset, fetchFn, limit]);

  return {
    items,
    hasMore,
    loading,
    loadMore,
    reset,
    refresh,
  };
}
