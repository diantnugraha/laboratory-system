# Frontend Guidelines Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the entire frontend codebase to comply with the development guidelines in `frontend/claude.md`, addressing magic strings, useEffect issues, URL state sync, AbortController usage, and error handling patterns.

**Architecture:** Centralized constants for all status/priority/role values, reusable StatusBadge component, AbortController integration in services and components, URL state sync for list page filters, and proper error state handling with retry mechanisms.

**Tech Stack:** Next.js 16, React 18, TypeScript, Zustand, React Hook Form, Zod, shadcn/ui, Tailwind CSS

---

## Priority Overview

| Priority | Task Group | Files Affected | Impact |
|----------|------------|----------------|--------|
| P0 | Constants & Type Safety | 15+ files | Eliminates magic strings, prevents bugs |
| P1 | StatusBadge Component | 10+ files | DRY, consistent UI |
| P2 | AbortController Integration | 20+ services, 75 pages | Prevents memory leaks |
| P3 | useEffect Pattern Fixes | 10+ pages | Fixes stale closures, infinite loops |
| P4 | URL State Sync | 15+ list pages | UX improvement, shareable URLs |
| P5 | Error State Handling | 15+ pages | Better error UX, retry mechanism |
| P6 | Reusable Schema Fields | 1 file + consumers | DRY validation |

---

## Task 1: Create Order Status Constants

**Files:**
- Create: `frontend/lib/constants/orderStatus.ts`
- Test: Manual verification in browser

**Step 1: Create order status constants file**

```typescript
// frontend/lib/constants/orderStatus.ts
export const ORDER_STATUS = {
  CREATED: 'created',
  TO_BE_VERIFIED: 'to be verified',
  REVIEWED: 'reviewed',
  UNDER_PROCESS: 'under process',
  COMPLETE: 'complete',
  CANCELLED: 'cancelled',
  PAYMENT_CONFIRMATION: 'payment confirmation',
  NEED_TO_REVISE: 'need to revise',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [ORDER_STATUS.CREATED]: 'Created',
  [ORDER_STATUS.TO_BE_VERIFIED]: 'To Be Verified',
  [ORDER_STATUS.REVIEWED]: 'Reviewed',
  [ORDER_STATUS.UNDER_PROCESS]: 'Under Process',
  [ORDER_STATUS.COMPLETE]: 'Complete',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
  [ORDER_STATUS.PAYMENT_CONFIRMATION]: 'Payment Confirmation',
  [ORDER_STATUS.NEED_TO_REVISE]: 'Need to Revise',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  [ORDER_STATUS.CREATED]: 'bg-gray-100 text-gray-800',
  [ORDER_STATUS.TO_BE_VERIFIED]: 'bg-yellow-100 text-yellow-800',
  [ORDER_STATUS.REVIEWED]: 'bg-blue-100 text-blue-800',
  [ORDER_STATUS.UNDER_PROCESS]: 'bg-purple-100 text-purple-800',
  [ORDER_STATUS.COMPLETE]: 'bg-green-100 text-green-800',
  [ORDER_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
  [ORDER_STATUS.PAYMENT_CONFIRMATION]: 'bg-orange-100 text-orange-800',
  [ORDER_STATUS.NEED_TO_REVISE]: 'bg-amber-100 text-amber-800',
};
```

**Step 2: Verify file created correctly**

Run: `ls frontend/lib/constants/orderStatus.ts`
Expected: File exists

**Step 3: Commit**

```bash
git add frontend/lib/constants/orderStatus.ts
git commit -m "feat: add order status constants with types and labels"
```

---

## Task 2: Create Sample Status Constants

**Files:**
- Create: `frontend/lib/constants/sampleStatus.ts`

**Step 1: Create sample status constants file**

```typescript
// frontend/lib/constants/sampleStatus.ts
export const SAMPLE_STATUS = {
  PENDING: 'pending',
  WAITING: 'waiting',
  PROCESS: 'process',
  UNDER_PROCESS: 'under process',
  VERIFIED: 'verified',
  APPROVED: 'approved',
  COMPLETE: 'complete',
  CANCEL: 'cancel',
  CANCELLED: 'cancelled',
} as const;

export type SampleStatus = typeof SAMPLE_STATUS[keyof typeof SAMPLE_STATUS];

export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  [SAMPLE_STATUS.PENDING]: 'Pending',
  [SAMPLE_STATUS.WAITING]: 'Waiting',
  [SAMPLE_STATUS.PROCESS]: 'Process',
  [SAMPLE_STATUS.UNDER_PROCESS]: 'Under Process',
  [SAMPLE_STATUS.VERIFIED]: 'Verified',
  [SAMPLE_STATUS.APPROVED]: 'Approved',
  [SAMPLE_STATUS.COMPLETE]: 'Complete',
  [SAMPLE_STATUS.CANCEL]: 'Cancelled',
  [SAMPLE_STATUS.CANCELLED]: 'Cancelled',
};

export const SAMPLE_STATUS_COLORS: Record<SampleStatus, string> = {
  [SAMPLE_STATUS.PENDING]: 'bg-gray-100 text-gray-800',
  [SAMPLE_STATUS.WAITING]: 'bg-yellow-100 text-yellow-800',
  [SAMPLE_STATUS.PROCESS]: 'bg-blue-100 text-blue-800',
  [SAMPLE_STATUS.UNDER_PROCESS]: 'bg-purple-100 text-purple-800',
  [SAMPLE_STATUS.VERIFIED]: 'bg-cyan-100 text-cyan-800',
  [SAMPLE_STATUS.APPROVED]: 'bg-emerald-100 text-emerald-800',
  [SAMPLE_STATUS.COMPLETE]: 'bg-green-100 text-green-800',
  [SAMPLE_STATUS.CANCEL]: 'bg-red-100 text-red-800',
  [SAMPLE_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
};
```

**Step 2: Commit**

```bash
git add frontend/lib/constants/sampleStatus.ts
git commit -m "feat: add sample status constants with types and labels"
```

---

## Task 3: Create Worksheet Status Constants

**Files:**
- Create: `frontend/lib/constants/worksheetStatus.ts`

**Step 1: Create worksheet status constants file**

```typescript
// frontend/lib/constants/worksheetStatus.ts
export const WORKSHEET_STATUS = {
  PROCESS: 'Process',
  TO_BE_VERIFIED: 'To Be Verified',
  NEED_TO_REVISED: 'Need to Revised',
  INTERNAL_RETEST: 'Internal Retest',
  CUSTOMER_RETEST: 'Customer Retest',
  VERIFIED_BY_QC: 'Verified by QC',
  APPROVED_BY_TM: 'Approved by TM',
  CANCEL: 'Cancel',
} as const;

export type WorksheetStatus = typeof WORKSHEET_STATUS[keyof typeof WORKSHEET_STATUS];

export const WORKSHEET_STATUS_LABELS: Record<WorksheetStatus, string> = {
  [WORKSHEET_STATUS.PROCESS]: 'Process',
  [WORKSHEET_STATUS.TO_BE_VERIFIED]: 'To Be Verified',
  [WORKSHEET_STATUS.NEED_TO_REVISED]: 'Need to Revised',
  [WORKSHEET_STATUS.INTERNAL_RETEST]: 'Internal Retest',
  [WORKSHEET_STATUS.CUSTOMER_RETEST]: 'Customer Retest',
  [WORKSHEET_STATUS.VERIFIED_BY_QC]: 'Verified by QC',
  [WORKSHEET_STATUS.APPROVED_BY_TM]: 'Approved by TM',
  [WORKSHEET_STATUS.CANCEL]: 'Cancelled',
};

export const WORKSHEET_STATUS_COLORS: Record<WorksheetStatus, string> = {
  [WORKSHEET_STATUS.PROCESS]: 'bg-blue-100 text-blue-800',
  [WORKSHEET_STATUS.TO_BE_VERIFIED]: 'bg-yellow-100 text-yellow-800',
  [WORKSHEET_STATUS.NEED_TO_REVISED]: 'bg-orange-100 text-orange-800',
  [WORKSHEET_STATUS.INTERNAL_RETEST]: 'bg-purple-100 text-purple-800',
  [WORKSHEET_STATUS.CUSTOMER_RETEST]: 'bg-pink-100 text-pink-800',
  [WORKSHEET_STATUS.VERIFIED_BY_QC]: 'bg-cyan-100 text-cyan-800',
  [WORKSHEET_STATUS.APPROVED_BY_TM]: 'bg-green-100 text-green-800',
  [WORKSHEET_STATUS.CANCEL]: 'bg-red-100 text-red-800',
};
```

**Step 2: Commit**

```bash
git add frontend/lib/constants/worksheetStatus.ts
git commit -m "feat: add worksheet status constants with types and labels"
```

---

## Task 4: Create Priority Constants

**Files:**
- Create: `frontend/lib/constants/priority.ts`

**Step 1: Create priority constants file**

```typescript
// frontend/lib/constants/priority.ts
export const PRIORITY = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  VERY_URGENT: 'very urgent',
  SPECIAL_REQUEST: 'special request',
} as const;

export type Priority = typeof PRIORITY[keyof typeof PRIORITY];

export const PRIORITY_LABELS: Record<Priority, string> = {
  [PRIORITY.NORMAL]: 'Normal',
  [PRIORITY.URGENT]: 'Urgent',
  [PRIORITY.VERY_URGENT]: 'Very Urgent',
  [PRIORITY.SPECIAL_REQUEST]: 'Special Request',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  [PRIORITY.NORMAL]: 'bg-gray-100 text-gray-800',
  [PRIORITY.URGENT]: 'bg-orange-100 text-orange-800',
  [PRIORITY.VERY_URGENT]: 'bg-red-100 text-red-800',
  [PRIORITY.SPECIAL_REQUEST]: 'bg-purple-100 text-purple-800',
};
```

**Step 2: Commit**

```bash
git add frontend/lib/constants/priority.ts
git commit -m "feat: add priority constants with types and labels"
```

---

## Task 5: Create Constants Index File

**Files:**
- Create: `frontend/lib/constants/index.ts`

**Step 1: Create barrel export file**

```typescript
// frontend/lib/constants/index.ts
export * from './errorMessages';
export * from './orderStatus';
export * from './sampleStatus';
export * from './worksheetStatus';
export * from './priority';
```

**Step 2: Commit**

```bash
git add frontend/lib/constants/index.ts
git commit -m "feat: add constants barrel export"
```

---

## Task 6: Create Reusable StatusBadge Component

**Files:**
- Create: `frontend/components/shared/StatusBadge.tsx`

**Step 1: Create StatusBadge component**

```typescript
// frontend/components/shared/StatusBadge.tsx
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  colorMap: Record<string, string>;
  labelMap?: Record<string, string>;
  className?: string;
}

export function StatusBadge({
  status,
  colorMap,
  labelMap,
  className
}: StatusBadgeProps) {
  const colorClass = colorMap[status] || 'bg-gray-100 text-gray-800';
  const label = labelMap?.[status] || status;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/components/shared/StatusBadge.tsx
git commit -m "feat: add reusable StatusBadge component"
```

---

## Task 7: Update Order List Page to Use Constants

**Files:**
- Modify: `frontend/app/(protected)/operational/order/page.tsx`

**Step 1: Read current file**

Run: Read the order page.tsx file to understand current structure

**Step 2: Add imports for constants**

Replace magic string switch statements with constants:

```typescript
// Add imports at top
import {
  ORDER_STATUS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS
} from '@/lib/constants/orderStatus';
import {
  PRIORITY,
  PRIORITY_COLORS,
  PRIORITY_LABELS
} from '@/lib/constants/priority';
import { StatusBadge } from '@/components/shared/StatusBadge';
```

**Step 3: Replace status badge logic**

Replace:
```typescript
// Old pattern with switch/case
switch (status?.toLowerCase()) {
  case "created":
    return <span className="text-gray-600">...</span>;
  // ... many cases
}
```

With:
```typescript
// New pattern with StatusBadge
<StatusBadge
  status={row.original.status}
  colorMap={ORDER_STATUS_COLORS}
  labelMap={ORDER_STATUS_LABELS}
/>
```

**Step 4: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add frontend/app/\(protected\)/operational/order/page.tsx
git commit -m "refactor: use order status constants in order list page"
```

---

## Task 8: Update Order Detail Page to Use Constants

**Files:**
- Modify: `frontend/app/(protected)/operational/order/[id]/page.tsx`

**Step 1: Read current file**

Run: Read the order detail page.tsx

**Step 2: Add imports and replace magic strings**

Same pattern as Task 7 - import constants and StatusBadge, replace switch statements.

**Step 3: Commit**

```bash
git add frontend/app/\(protected\)/operational/order/\[id\]/page.tsx
git commit -m "refactor: use order/sample status constants in order detail page"
```

---

## Task 9: Update Analyst Worksheet Page to Use Constants

**Files:**
- Modify: `frontend/app/(protected)/approval/analyst-worksheet/page.tsx`

**Step 1: Read current file**

**Step 2: Add imports for worksheet status constants**

```typescript
import {
  WORKSHEET_STATUS,
  WORKSHEET_STATUS_COLORS,
  WORKSHEET_STATUS_LABELS
} from '@/lib/constants/worksheetStatus';
import { StatusBadge } from '@/components/shared/StatusBadge';
```

**Step 3: Replace switch statements with StatusBadge**

**Step 4: Commit**

```bash
git add frontend/app/\(protected\)/approval/analyst-worksheet/page.tsx
git commit -m "refactor: use worksheet status constants in analyst worksheet page"
```

---

## Task 10: Add AbortController Support to API Client

**Files:**
- Modify: `frontend/services/api.ts`

**Step 1: Read current api.ts**

**Step 2: Ensure axios passes signal to requests**

The axios instance should already support signal via config. Verify and document.

**Step 3: Commit if changes needed**

```bash
git add frontend/services/api.ts
git commit -m "feat: verify AbortController signal support in API client"
```

---

## Task 11: Add Signal Parameter to Order Service

**Files:**
- Modify: `frontend/services/orderService.ts`

**Step 1: Read current orderService.ts**

**Step 2: Add optional signal parameter to all methods**

```typescript
// Before
export const getAll = async (params: OrderListParams = {}): Promise<OrderListResponse> => {
  const response = await api.get(`/orders?${queryParams.toString()}`);
  return response.data;
};

// After
export const getAll = async (
  params: OrderListParams = {},
  signal?: AbortSignal
): Promise<OrderListResponse> => {
  const response = await api.get(`/orders?${queryParams.toString()}`, { signal });
  return response.data;
};
```

**Step 3: Repeat for getById, create, update, delete methods**

**Step 4: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add frontend/services/orderService.ts
git commit -m "feat: add AbortController signal support to order service"
```

---

## Task 12: Add Signal Parameter to Sample Service

**Files:**
- Modify: `frontend/services/sampleService.ts`

**Step 1: Read and update with signal parameter (same pattern as Task 11)**

**Step 2: Commit**

```bash
git add frontend/services/sampleService.ts
git commit -m "feat: add AbortController signal support to sample service"
```

---

## Task 13: Add Signal Parameter to Worksheet Service

**Files:**
- Modify: `frontend/services/worksheetService.ts`

**Step 1: Read and update with signal parameter (same pattern as Task 11)**

**Step 2: Commit**

```bash
git add frontend/services/worksheetService.ts
git commit -m "feat: add AbortController signal support to worksheet service"
```

---

## Task 14: Fix useEffect in Order List Page

**Files:**
- Modify: `frontend/app/(protected)/operational/order/page.tsx`

**Step 1: Extract PAGE_LIMIT as constant outside component**

```typescript
// Before (inside component or in deps)
const [pagination, setPagination] = useState({ page: 1, limit: 30, ... });
useEffect(() => {
  fetchOrders(1, search, pagination.limit);
}, [pagination.limit]); // BAD

// After (outside component)
const PAGE_LIMIT = 30;

export default function OrderPage() {
  // ...
  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(1, debouncedSearch, PAGE_LIMIT, controller.signal);
    return () => controller.abort();
  }, [debouncedSearch, fetchOrders]);
}
```

**Step 2: Update fetchOrders to accept signal**

```typescript
const fetchOrders = useCallback(async (
  page: number = 1,
  search?: string,
  limit: number = PAGE_LIMIT,
  signal?: AbortSignal
) => {
  try {
    setLoading(true);
    const response = await orderService.getAll({ page, limit, search }, signal);
    setOrders(response.data);
    setPagination(response.pagination);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    toast.error(getErrorMessage(error));
  } finally {
    setLoading(false);
  }
}, []);
```

**Step 3: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend/app/\(protected\)/operational/order/page.tsx
git commit -m "fix: extract PAGE_LIMIT constant and add AbortController to order page"
```

---

## Task 15: Fix useEffect in Analyst Worksheet Page

**Files:**
- Modify: `frontend/app/(protected)/approval/analyst-worksheet/page.tsx`

**Step 1: Read current file and identify issues**

Issues found:
- Two separate useEffect calls (one empty deps, one full deps)
- `pagination.limit` in dependency array
- No AbortController

**Step 2: Consolidate to single useEffect with AbortController**

```typescript
const PAGE_LIMIT = 20; // Outside component

// Single useEffect
useEffect(() => {
  const controller = new AbortController();
  fetchWorksheets(activeTab, 1, debouncedSearch, statusFilter, PAGE_LIMIT, controller.signal);
  fetchTabCounts(controller.signal);
  return () => controller.abort();
}, [activeTab, debouncedSearch, statusFilter, fetchWorksheets, fetchTabCounts]);
```

**Step 3: Commit**

```bash
git add frontend/app/\(protected\)/approval/analyst-worksheet/page.tsx
git commit -m "fix: consolidate useEffect and add AbortController to worksheet page"
```

---

## Task 16: Add URL State Sync to Order List Page

**Files:**
- Modify: `frontend/app/(protected)/operational/order/page.tsx`

**Step 1: Add useSearchParams and useRouter imports**

```typescript
import { useSearchParams, useRouter } from 'next/navigation';
```

**Step 2: Initialize state from URL params**

```typescript
const searchParams = useSearchParams();
const router = useRouter();

const initialSearch = searchParams.get('search') || '';
const initialPage = Number(searchParams.get('page')) || 1;

const [search, setSearch] = useState(initialSearch);
const [currentPage, setCurrentPage] = useState(initialPage);
```

**Step 3: Create updateURL helper**

```typescript
const updateURL = useCallback((params: Record<string, string | number | undefined>) => {
  const newParams = new URLSearchParams(searchParams.toString());
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      newParams.set(key, String(value));
    } else {
      newParams.delete(key);
    }
  });
  router.replace(`?${newParams.toString()}`, { scroll: false });
}, [searchParams, router]);
```

**Step 4: Update handlers to call updateURL**

```typescript
const handleSearchChange = (value: string) => {
  setSearch(value);
  updateURL({ search: value, page: 1 });
};

const handlePageChange = (page: number) => {
  setCurrentPage(page);
  updateURL({ page });
};
```

**Step 5: Commit**

```bash
git add frontend/app/\(protected\)/operational/order/page.tsx
git commit -m "feat: add URL state sync for filters in order list page"
```

---

## Task 17: Add Error State to DataTable Component

**Files:**
- Modify: `frontend/components/shared/DataTable.tsx`

**Step 1: Read current DataTable component**

**Step 2: Add error prop and error state UI**

```typescript
interface DataTableProps<T> {
  // ... existing props
  error?: string | null;
  onRetry?: () => void;
}

// In render, add error state
{error && (
  <TableRow>
    <TableCell colSpan={columns.length} className="h-32 text-center">
      <div className="flex flex-col items-center gap-2">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    </TableCell>
  </TableRow>
)}
```

**Step 3: Commit**

```bash
git add frontend/components/shared/DataTable.tsx
git commit -m "feat: add error state with retry to DataTable component"
```

---

## Task 18: Add Error State to Order List Page

**Files:**
- Modify: `frontend/app/(protected)/operational/order/page.tsx`

**Step 1: Add error state**

```typescript
const [error, setError] = useState<string | null>(null);

const fetchOrders = useCallback(async (...) => {
  try {
    setLoading(true);
    setError(null);
    // ... fetch
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    setError(getErrorMessage(error));
  } finally {
    setLoading(false);
  }
}, []);
```

**Step 2: Pass error to DataTable**

```typescript
<DataTable
  loading={loading}
  error={error}
  onRetry={() => fetchOrders(currentPage, debouncedSearch, PAGE_LIMIT)}
  // ... other props
/>
```

**Step 3: Commit**

```bash
git add frontend/app/\(protected\)/operational/order/page.tsx
git commit -m "feat: add error state with retry to order list page"
```

---

## Task 19: Add Reusable Schema Fields

**Files:**
- Modify: `frontend/lib/schemas.ts`

**Step 1: Read current schemas.ts**

**Step 2: Add reusable field builders at top of file**

```typescript
import { z } from 'zod';

// Reusable field builders
export const requiredString = (fieldName: string) =>
  z.string().min(1, `${fieldName} is required`);

export const optionalString = () =>
  z.string().optional().or(z.literal(''));

export const emailField = z
  .string()
  .email('Invalid email address')
  .or(z.literal(''));

export const phoneField = z
  .string()
  .regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format')
  .or(z.literal(''));

export const requiredEmail = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address');

export const requiredPhone = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^[0-9+\-\s()]*$/, 'Invalid phone number format');
```

**Step 3: Commit**

```bash
git add frontend/lib/schemas.ts
git commit -m "feat: add reusable schema field builders"
```

---

## Task 20: Add Signal to Remaining Services (Batch)

**Files:**
- Modify: `frontend/services/customerService.ts`
- Modify: `frontend/services/quotationService.ts`
- Modify: `frontend/services/preorderService.ts`
- Modify: `frontend/services/contractService.ts`
- Modify: `frontend/services/serviceService.ts`

**Step 1: Add signal parameter to all getAll and getById methods**

Same pattern as Task 11-13.

**Step 2: Commit**

```bash
git add frontend/services/*.ts
git commit -m "feat: add AbortController signal support to all services"
```

---

## Task 21: Update Dashboard Page Status Handling

**Files:**
- Modify: `frontend/app/(protected)/page.tsx`

**Step 1: Read dashboard page**

**Step 2: Replace any magic strings with constants**

**Step 3: Commit**

```bash
git add frontend/app/\(protected\)/page.tsx
git commit -m "refactor: use status constants in dashboard page"
```

---

## Task 22: Update Remaining Pages with Constants (Batch)

**Files:**
- All pages in `frontend/app/(protected)/operational/`
- All pages in `frontend/app/(protected)/approval/`

**Step 1: Search for remaining magic strings**

Run: `grep -r "case \"created\"" frontend/app/`
Run: `grep -r "case \"complete\"" frontend/app/`

**Step 2: Update each file to use constants and StatusBadge**

**Step 3: Commit**

```bash
git add frontend/app/
git commit -m "refactor: use status constants across all operational pages"
```

---

## Task 23: Add URL State Sync to List Pages (Batch)

**Files:**
- `frontend/app/(protected)/master/customer/page.tsx`
- `frontend/app/(protected)/master/service/page.tsx`
- `frontend/app/(protected)/operational/quotation/page.tsx`
- `frontend/app/(protected)/approval/analyst-worksheet/page.tsx`

**Step 1: Apply same URL state sync pattern from Task 16**

**Step 2: Commit each or batch**

```bash
git add frontend/app/
git commit -m "feat: add URL state sync to all list pages"
```

---

## Task 24: Fix AbortController in All Pages (Batch)

**Files:**
- All pages with useEffect fetching data

**Step 1: Search for pages without AbortController**

Run: `grep -rL "AbortController" frontend/app/`

**Step 2: Add AbortController pattern to each page's useEffect**

**Step 3: Commit**

```bash
git add frontend/app/
git commit -m "fix: add AbortController cleanup to all page useEffects"
```

---

## Task 25: Final TypeScript Check and Cleanup

**Files:**
- All modified files

**Step 1: Run full TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 2: Fix any remaining TypeScript errors**

**Step 3: Run linter**

Run: `cd frontend && npm run lint`

**Step 4: Final commit**

```bash
git add .
git commit -m "chore: fix remaining TypeScript errors and lint issues"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] No magic strings for status/priority (grep for hardcoded case statements)
- [ ] All list pages have URL state sync (check browser refresh preserves filters)
- [ ] All useEffect hooks have AbortController cleanup
- [ ] PAGE_LIMIT constants extracted outside components
- [ ] StatusBadge component used consistently
- [ ] Error state with retry in all list pages
- [ ] TypeScript compiles without errors
- [ ] No console warnings in browser

---

## Notes

1. **Incremental commits** - Each task has its own commit for easy rollback
2. **TypeScript checks** - Run after each batch of changes
3. **Browser testing** - Test each page after modification
4. **Constants first** - Create all constants before updating pages
5. **Services before pages** - Update services with signal support before pages
