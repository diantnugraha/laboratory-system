# Performance Optimization Guidelines - Large Datasets

**Created:** 2026-02-02
**Applies to:** Pages with 500K+ records (Worksheet, Order, Sample, etc.)

---

## When to Apply

Apply these optimizations when:
- Table has 500K+ records
- Page load > 2 seconds
- Search/filter > 1 second
- Users complain about slowness

---

## Three-Layer Strategy

```
Frontend → API/Cache → Database
```

### 1. Database Layer
- Add proper indexes
- Optimize queries
- Reduce joins

### 2. Cache Layer (Redis)
- Cache counts (5-15 min TTL)
- Cache common queries (3-5 min TTL)
- Invalidate on writes

### 3. API + Frontend
- Cursor pagination (not offset)
- No-count mode
- Debounce search (800ms-1s)

---

## Database Optimization

### Add Composite Indexes

```sql
-- For status + sample_id filtering (most common)
CREATE INDEX idx_worksheet_status_sample
ON worksheet(status, sample_id, trash)
WHERE trash IS NULL;

-- For code search
CREATE INDEX idx_worksheet_code
ON worksheet(code, trash)
WHERE trash IS NULL;

-- For analyst filtering
CREATE INDEX idx_worksheet_analyst
ON worksheet(analyst_id, status, service_id, trash)
WHERE trash IS NULL;
```

### Optimize Queries

**❌ Bad - Full includes:**
```typescript
include: {
  sample: true,  // Gets all fields
  service: true,
}
```

**✅ Good - Select only what you need:**
```typescript
include: {
  sample: {
    select: {
      id: true,
      code: true,
      name: true,
      order: {
        select: {
          customer: {
            select: { customer_name: true }
          }
        }
      }
    }
  },
  service: {
    select: {
      id: true,
      name: true,
      parameter: { select: { name: true } },
      method: { select: { name: true } },
    }
  }
}
```

---

## Redis Caching

### Setup

```bash
npm install ioredis
```

```typescript
// backend/src/config/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
  keyPrefix: 'lab-system:',
});
```

### Cache Helper

```typescript
// backend/src/utils/cacheHelper.ts
import { redis } from '../config/redis.js';

export class CacheHelper {
  // Cache with TTL
  static async cache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    const data = await fetchFn();
    await redis.setex(key, ttl, JSON.stringify(data));
    return data;
  }

  // Invalidate pattern
  static async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  }
}
```

### Usage in Repository

```typescript
// Get list (cached 3 min)
async findAll(filter: Filter): Promise<Data> {
  const key = `worksheet:list:${JSON.stringify(filter)}`;
  return CacheHelper.cache(key, async () => {
    return this.prisma.worksheet.findMany({ where: filter });
  }, 180);
}

// Get count (cached 5 min)
async getCount(filter: Filter): Promise<number> {
  const key = `worksheet:count:${JSON.stringify(filter)}`;
  return CacheHelper.cache(key, async () => {
    return this.prisma.worksheet.count({ where: filter });
  }, 300);
}

// Invalidate on write
async create(data: DTO): Promise<Worksheet> {
  const worksheet = await this.prisma.worksheet.create({ data });
  await CacheHelper.invalidate('worksheet:*');
  return worksheet;
}
```

---

## Cursor Pagination (API)

### Why Cursor > Offset?

| Offset | Cursor |
|--------|--------|
| ❌ SLOW: `SKIP 10000` | ✅ FAST: `WHERE id < 123` |
| ❌ Slower as page grows | ✅ Constant speed |

### Repository Method

```typescript
async findAllCursor(params: {
  cursor?: number;
  limit: number;
  search?: string;
  status?: string;
}): Promise<CursorResult> {
  const { cursor, limit, search, status } = params;

  const where: any = { trash: null };
  if (search) where.code = { startsWith: search };
  if (status) where.status = status;
  if (cursor) where.id = { lt: cursor }; // Key part!

  // Fetch limit + 1 to check if more exists
  const items = await this.prisma.worksheet.findMany({
    where,
    take: limit + 1,
    orderBy: { id: 'desc' },
    include: this.optimizedInclude,
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = data.length > 0 ? data[data.length - 1].id : null;

  return { items: data, nextCursor, hasMore };
}
```

### Controller

```typescript
export const getWorksheetsCursor = async (req, reply) => {
  const { cursor, limit = 50, search, status } = req.query;

  const result = await worksheetRepo.findAllCursor({
    cursor: cursor ? parseInt(cursor) : undefined,
    limit,
    search,
    status,
  });

  return reply.send({
    success: true,
    data: result.items,
    cursor: result.nextCursor,
    hasMore: result.hasMore,
  });
};
```

### Route

```typescript
worksheetRoutes.get('/cursor', { preHandler: authenticate }, getWorksheetsCursor);
```

---

## Frontend Implementation

### Service

```typescript
// frontend/services/worksheetService.ts
export const worksheetService = {
  async getAllCursor(params: {
    cursor?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const response = await api.get('/worksheets/cursor', { params });
    return {
      data: response.data.data,
      cursor: response.data.cursor,
      hasMore: response.data.hasMore,
    };
  },
};
```

### Hook

```typescript
// frontend/hooks/useCursorPagination.ts
import { useState, useCallback } from 'react';

export function useCursorPagination<T>(fetchFn, limit = 50) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const { data, cursor: nextCursor, hasMore: more } = await fetchFn(cursor, limit);
      setItems((prev) => [...prev, ...data]);
      setCursor(nextCursor);
      setHasMore(more);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, fetchFn, limit]);

  const reset = useCallback(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
  }, []);

  return { items, hasMore, loading, loadMore, reset };
}
```

### Page Component

```typescript
// frontend/app/(protected)/operational/worksheet/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCursorPagination } from '@/hooks/useCursorPagination';
import { worksheetService } from '@/services/worksheetService';
import { useDebounce } from '@/hooks/useDebounce';

export default function WorksheetPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const debouncedSearch = useDebounce(search, 1000); // 1 second

  const { items, hasMore, loading, loadMore, reset } = useCursorPagination(
    (cursor, limit) => worksheetService.getAllCursor({
      cursor,
      limit,
      search: debouncedSearch,
      status: status !== 'all' ? status : undefined,
    }),
    50 // Load 50 items at a time
  );

  // Reset when filters change
  useEffect(() => {
    reset();
    loadMore();
  }, [debouncedSearch, status]);

  // Infinite scroll
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.2) {
      loadMore();
    }
  };

  return (
    <div className="space-y-4">
      <h1>Worksheet ({items.length} loaded)</h1>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="Process">Process</SelectItem>
          {/* ... */}
        </Select>
      </div>

      {/* Scrollable list */}
      <div className="h-[calc(100vh-200px)] overflow-y-auto" onScroll={handleScroll}>
        <DataTable columns={columns} data={items} />
        {loading && <div>Loading...</div>}
        {!hasMore && <div>No more items</div>}
      </div>
    </div>
  );
}
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial load | < 500ms |
| Search | < 300ms |
| Pagination | < 200ms |
| Count (cached) | < 50ms |

---

## Quick Wins Checklist

**Week 1: Database**
- [ ] Add composite indexes
- [ ] Optimize includes (select only needed fields)
- [ ] Remove unnecessary joins

**Week 2: Caching**
- [ ] Setup Redis
- [ ] Cache counts (5 min TTL)
- [ ] Cache queries (3 min TTL)
- [ ] Invalidate on writes

**Week 3: API**
- [ ] Implement cursor pagination
- [ ] Add `/cursor` endpoint
- [ ] Test performance

**Week 4: Frontend**
- [ ] Create useCursorPagination hook
- [ ] Update page to use cursor
- [ ] Increase debounce to 1000ms
- [ ] Add infinite scroll

---

## Common Mistakes

### ❌ Don't Do This

```typescript
// Counting on every request
const total = await prisma.worksheet.count({ where }); // SLOW!

// Deep includes
include: { sample: true, service: true } // Gets all fields

// Offset pagination on large data
skip: (page - 1) * limit // Gets slower as page increases
```

### ✅ Do This Instead

```typescript
// Cache the count
const total = await CacheHelper.cache('count', () =>
  prisma.worksheet.count({ where }), 300
);

// Select specific fields
include: {
  sample: { select: { id: true, code: true } },
  service: { select: { id: true, name: true } }
}

// Cursor pagination
where: { id: { lt: cursor } } // Always fast
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Initial load | 3-5s | 300-500ms |
| Search | 2-4s | 200-400ms |
| Pagination | 1-2s | 100-200ms |
| Count | 2-3s | 50ms (cached) |

**Target: 80-90% performance improvement**

---

## Environment Variables

```env
# Backend .env
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL_COUNT=300
CACHE_TTL_QUERY=180

# Frontend .env.local
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=50
NEXT_PUBLIC_DEBOUNCE_DELAY=1000
```

---

## Summary

1. **Database**: Add indexes + optimize queries
2. **Cache**: Use Redis for counts and common queries
3. **API**: Switch to cursor pagination
4. **Frontend**: Infinite scroll + longer debounce

Apply these patterns to ANY page with large data (Order, Sample, etc.)

---

*Simple, effective, proven to work on 2M+ records.*
