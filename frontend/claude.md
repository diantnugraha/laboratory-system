# Frontend Development Guidelines

## Project Overview

Laboratory Management System Frontend built with **Next.js 16 + React + TypeScript**.

- **Framework**: Next.js 16.1.1 (App Router)
- **UI Library**: React 18.2.0
- **Styling**: Tailwind CSS 3.4.17
- **Components**: shadcn/ui (Radix UI primitives)
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **API**: Axios

---

## Project Structure

```
frontend/
├── app/                     # Next.js App Router
│   ├── (protected)/         # Protected route group (requires auth)
│   │   └── master/          # Master data pages
│   │   └── transactions/    # Transaction pages
│   ├── login/               # Public pages
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── forms/               # Form dialog components
│   ├── shared/              # Reusable shared components
│   ├── layout/              # Layout components (AppLayout, Sidebar)
│   └── dashboard/           # Dashboard-specific components
├── contexts/                # React Context providers
├── hooks/                   # Custom React hooks
├── lib/
│   ├── constants/           # Constants and enums (status, roles, config)
│   ├── utils/               # Utility functions (date, format, error)
│   ├── schemas.ts           # Zod validation schemas
│   ├── utils.ts             # Core utility (cn)
│   └── cookieStorage.ts     # Cookie helper for Zustand
├── services/                # API service wrappers
├── store/                   # Zustand stores
├── types/                   # TypeScript type definitions
└── public/                  # Static assets
```

---

## Type Safety Rules

1. **No magic strings** — Status, roles, types harus didefinisikan di `lib/constants/` menggunakan `as const` + inferred type. Jangan pernah tulis string literal langsung di component.

```typescript
// lib/constants/sampleStatus.ts
export const SAMPLE_STATUS = {
  RECEIVED: 'received', IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed', ON_HOLD: 'on_hold',
} as const;
export type SampleStatus = typeof SAMPLE_STATUS[keyof typeof SAMPLE_STATUS];
export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = { ... };
```

2. **No `any`** — Gunakan `unknown` untuk error catch, dan `getErrorMessage()` dari `lib/utils/errorHandler.ts` untuk extract message.

3. **All props must be typed** — Setiap component harus punya interface untuk props-nya. Tidak boleh implicit `any`.

4. **API response harus typed** — Setiap service function harus return `Promise<ApiResponse<T>>` dengan type yang eksplisit.

---

## React Hooks Rules

1. **useEffect — Hindari stale closure.** Jangan masukkan mutable state (e.g. `pagination.limit`) ke dependency array. Extract jadi constant di luar component.

```typescript
const PAGE_LIMIT = 20; // ✅ Di luar component
useEffect(() => {
  fetchData(1, search, PAGE_LIMIT);
}, [search, fetchData]); // ✅ Tanpa pagination.limit
```

2. **useCallback — Stable fetch functions.** Wrap fetch functions dengan `useCallback`. Semua value yang berubah harus masuk sebagai parameter, bukan dependency.

```typescript
const fetchSamples = useCallback(async (page: number, search?: string) => {
  setLoading(true);
  const res = await sampleService.getAll({ page, search });
  setSamples(res.data);
  setPagination(res.pagination);
  setLoading(false);
}, []); // ✅ Empty deps — semua via parameter
```

3. **No redundant state updates.** Jika API response sudah mengandung state yang dibutuhkan (e.g. pagination), jangan set state secara manual sebelum fetch. Cukup panggil fetch — pagination di-update dari response.

4. **useEffect dependency checklist:**
   - Value yang trigger re-fetch → tambahkan
   - Constant / stable reference → jangan tambahkan, extract keluar
   - Function → wrap dengan `useCallback` dulu

5. **AbortController — Cancel fetch saat unmount.** Setiap fetch di useEffect harus memakai AbortController agar tidak update state pada unmounted component.

```typescript
useEffect(() => {
  const controller = new AbortController();
  fetchSamples(1, search, { signal: controller.signal });
  return () => controller.abort();
}, [search, fetchSamples]);
```

Service layer harus forward signal ke axios: `api.get('/samples', { signal })`.

---

## Helper & Utility Organization

**Rule: Jika helper dipakai di lebih dari satu file, extract ke `lib/`.**

```
lib/
├── constants/           # SAMPLE_STATUS, ORDER_STATUS, ROLES, dll
├── utils/
│   ├── dateUtils.ts     # formatDateID, isOverdue, isValidDateRange
│   ├── errorHandler.ts  # getErrorMessage
│   └── formatters.ts    # formatCurrency, formatNumber
```

- **Date formatting, overdue check** → `lib/utils/dateUtils.ts`
- **Status badge rendering** → `components/shared/StatusBadge.tsx`
- **Error message extraction** → `lib/utils/errorHandler.ts`
- **Jangan definisikan helper di dalam file page** jika bisa dipakai ulang

---

## Input Validation Rules

1. **Date range** — Selalu validasi `fromDate <= toDate` sebelum set state. Tampilkan toast error jika invalid.
2. **Search minimum length** — Jangan kirim search query ke API jika kurang dari 2 karakter.
3. **Form validation** — Selalu gunakan Zod schema via `zodResolver`. Jangan validasi manual di `onSubmit`.
4. **Reusable field schemas** — Gunakan `requiredString(fieldName)`, `emailField`, `phoneField` dari `lib/schemas.ts`.

---

## Loading, Empty & Error States

| Scenario | Pattern |
|----------|---------|
| Initial load (no data yet) | Skeleton component (`<TableSkeleton />`) |
| Refetch / filter change | Subtle overlay atau opacity + spinner |
| Form submission | Disable button + text (`Saving...`) |
| Empty data (fetch success, 0 results) | Empty state illustration + message |
| Fetch error | Error state dengan retry button |

**Rules:**
- Setiap list page **wajib** handle 3 state: loading, empty, dan error
- Jangan tampilkan tabel kosong tanpa penjelasan — selalu ada empty state message
- Error state harus ada tombol "Try Again" yang memanggil ulang fetch

---

## Delete Confirmation

**Rule: Setiap destructive action (delete, bulk delete) wajib menggunakan `AlertDialog` dari shadcn/ui.** Jangan pernah langsung panggil API delete dari button onClick tanpa konfirmasi.

- Tampilkan nama item yang akan dihapus di dialog
- Button konfirmasi harus `variant="destructive"`
- Disable button saat proses delete berlangsung

---

## Import Order Convention

Urutkan import secara konsisten di setiap file, pisahkan setiap grup dengan satu baris kosong:

```typescript
// 1. React / Next.js
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
// 2. Third-party libraries
import { format } from 'date-fns';
// 3. Internal: components
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
// 4. Internal: services, stores, hooks
import sampleService from '@/services/sampleService';
import { useDebounce } from '@/hooks/useDebounce';
// 5. Internal: utils, constants, types
import { SAMPLE_STATUS } from '@/lib/constants/sampleStatus';
import type { SampleListItem } from '@/types/sample';
```

---

## URL State Sync for Filters

**Rule: List page dengan filter (search, status, date range, pagination) harus sync state ke URL search params.** Agar refresh tidak kehilangan filter, URL bisa di-share, dan browser back/forward berfungsi.

```typescript
const searchParams = useSearchParams();
const initialSearch = searchParams.get('search') || '';
const initialPage = Number(searchParams.get('page')) || 1;

// Update URL saat filter berubah
const updateURL = (params: Record<string, string>) => {
  const newParams = new URLSearchParams(searchParams);
  Object.entries(params).forEach(([k, v]) =>
    v ? newParams.set(k, v) : newParams.delete(k)
  );
  router.replace(`?${newParams.toString()}`);
};
```

---

## Performance Rules

1. **Table columns** — Definisikan di luar component (module level). Di dalam function body akan re-create setiap render.
2. **`React.memo`** — Hanya untuk component yang menerima props stabil tapi parent sering re-render (e.g. table row, list item). Jangan pakai di semua component.
3. **`useMemo`** — Hanya untuk komputasi berat (filtering/sorting array besar). Jangan pakai untuk object/array literal sederhana.
4. **Image** — Selalu gunakan `next/image` dengan width/height eksplisit. Jangan pakai `<img>` tag.
5. **Lazy load** — Gunakan `dynamic(() => import(...))` untuk component berat yang tidak visible di initial viewport (chart, dialog content besar).

---

## Component Patterns

### Page Component (List with Filters)

**Struktur wajib:**
1. State declarations (data, loading, filters, pagination)
2. `useDebounce` untuk search
3. `useCallback` fetch function dengan empty deps
4. Single `useEffect` yang listen semua filter changes + AbortController
5. Handler functions (page change, filter change, clear)
6. Render: header → filters → DataTable (handle loading/empty/error)

**Rules:**
- `'use client'` di baris pertama
- Columns & PAGE_LIMIT didefinisikan di luar component
- Filter state sync ke URL search params
- Loading, empty, error state tertangani

### Form Dialog

**Struktur wajib:**
1. Props interface: `open`, `onOpenChange`, `entity | null`, `onSuccess`
2. `useForm` dengan `zodResolver`
3. `useEffect` untuk `form.reset()` saat dialog dibuka
4. `onSubmit` handler dengan try/catch
5. Render: Dialog → Form → Fields → Action buttons

**Rules:**
- Selalu reset form saat `open` berubah
- Disable submit button saat `isSubmitting`
- Error handling via `getErrorMessage()`, bukan `error: any`
- `isEdit` derived dari `!!entity`

### Protected Layout

**Rules:**
- Check `isAuthenticated` via `useAuth()` context
- Redirect ke `/login` jika unauthenticated
- Tampilkan loading spinner saat auth state loading
- Return `null` jika not authenticated (prevent flash)

---

## State Management

**Zustand** — Untuk global state (auth, preferences). Satu store per domain, gunakan `persist` middleware untuk auth. Jangan simpan server data (list items) di Zustand — gunakan local state.

**Context** — Untuk provider yang butuh side effects (auth flow). Selalu buat custom hook (`useAuth()`) dengan error jika di luar provider.

---

## API Service Pattern

- Base axios instance di `services/api.ts` dengan interceptors (auth token, 401 redirect)
- Satu file service per domain: `customerService.ts`, `sampleService.ts`
- Setiap function return `Promise<ApiResponse<T>>`
- Gunakan typed DTOs: `CreateCustomerDTO`, `UpdateCustomerDTO`
- Timeout: 30 detik
- Jangan hardcode URL — gunakan `NEXT_PUBLIC_API_URL`
- Forward `AbortSignal` ke axios saat diperlukan

---

## Form Validation (Zod)

- Semua schema di `lib/schemas.ts`
- Export `type FormData = z.infer<typeof schema>` untuk setiap schema
- Gunakan reusable fields: `requiredString(fieldName)`, `emailField`, `phoneField`
- Array fields gunakan `.min(1, 'message')` untuk required
- Optional email: `.email().optional().or(z.literal(''))`

---

## Styling (Tailwind CSS)

- Gunakan CSS variables dari `globals.css` untuk warna (`--primary`, `--muted`, dll)
- Conditional classes via `cn()` dari `lib/utils`
- Status styles → object map `Record<Status, string>`, bukan inline ternary chain
- Responsive: mobile-first (`flex-col` → `lg:flex-row`)
- Spacing: gunakan `space-y-*` dan `gap-*`, bukan manual margin

---

## shadcn/ui Components

Located in `components/ui/`:

- **Layout**: `card`, `separator`, `scroll-area`, `sheet`, `sidebar`
- **Forms**: `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `form`, `label`
- **Data Display**: `table`, `badge`, `avatar`, `calendar`
- **Feedback**: `alert`, `alert-dialog`, `toast`, `skeleton`, `progress`
- **Navigation**: `breadcrumb`, `dropdown-menu`, `navigation-menu`, `tabs`, `command`
- **Overlay**: `dialog`, `popover`, `tooltip`, `hover-card`
- **Inputs**: `date-picker`, `combobox`, `multi-select`

**Button variants**: `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`
**Button sizes**: `sm`, `default`, `lg`, `icon`

---

## Error Handling

- Centralized di `lib/utils/errorHandler.ts` — fungsi `getErrorMessage(error: unknown): string`
- Catch block selalu `catch (error)` tanpa type annotation (infers `unknown`)
- Toast error via `getErrorMessage()`, bukan manual chaining
- Setiap app route harus punya `error.tsx` sebagai error boundary
- Toast success setelah mutasi berhasil (create, update, delete)

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Pages | `page.tsx` | `app/(protected)/customers/page.tsx` |
| Layouts | `layout.tsx` | `app/(protected)/layout.tsx` |
| Components | `PascalCase.tsx` | `CustomerFormDialog.tsx` |
| UI Components | `kebab-case.tsx` | `button.tsx`, `data-table.tsx` |
| Services | `camelCaseService.ts` | `customerService.ts` |
| Stores | `camelCaseStore.ts` | `authStore.ts` |
| Hooks | `use-kebab-case.ts` | `use-toast.ts` |
| Constants | `camelCase.ts` | `sampleStatus.ts` |
| Utilities | `camelCase.ts` | `dateUtils.ts` |
| Types | `camelCase.ts` | `customer.ts` |

---

## Common Mistakes to Avoid

1. Lupa `'use client'` — Required untuk components dengan hooks/state
2. Skip `form.reset()` — Selalu reset saat dialog dibuka
3. Hardcode API URLs — Gunakan `NEXT_PUBLIC_API_URL`
4. Ignore loading/empty/error states — Handle ketiganya di setiap list page
5. Skip error handling — Selalu catch dan gunakan `getErrorMessage()`
6. Mutate state directly — Gunakan setter functions
7. Missing useEffect deps — Semua deps masuk array, function wrap `useCallback`
8. Wrong import paths — Selalu pakai `@/` alias
9. Magic strings — Definisikan di `lib/constants/` dengan `as const`
10. `error: any` — Gunakan `error: unknown`
11. Columns inside component — Definisikan di module level
12. Skip date range validation — Validasi `fromDate <= toDate`
13. Reusable helpers in page files — Extract ke `lib/utils/`
14. Redundant state updates — API response = single source of truth
15. Delete tanpa konfirmasi — Selalu pakai `AlertDialog`
16. Lupa AbortController — Cancel fetch saat component unmount
17. Filter hilang saat refresh — Sync ke URL search params

---

## Testing Checklist

- [ ] Component renders without errors
- [ ] Form validation works correctly
- [ ] Loading, empty, dan error state tertangani
- [ ] Protected routes redirect unauthenticated users
- [ ] Toast notifications untuk success dan error
- [ ] Responsive design di mobile
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No console errors/warnings
- [ ] Semua status/role values pakai constants
- [ ] Date range tervalidasi (from ≤ to)
- [ ] Delete action ada konfirmasi dialog
- [ ] Fetch ter-cancel saat unmount (AbortController)
- [ ] Filters tersimpan di URL search params
- [ ] Import order konsisten
- [ ] Helpers reusable sudah di-extract ke `lib/`
