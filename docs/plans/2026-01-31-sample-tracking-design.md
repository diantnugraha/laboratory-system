# Sample Tracking Page - Design Document

## Overview

Halaman untuk tracking samples di bagian operational. View-only dengan kemampuan print PDF per sample.

## Lokasi

`frontend/app/(protected)/operational/sample/page.tsx`

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  Sample Tracking                                        │
├─────────────────────────────────────────────────────────┤
│  [🔍 Search...]  [Status ▼]  [From Date] [To Date]     │
├─────────────────────────────────────────────────────────┤
│  Sample Code | Customer | Order | Status | Parameters | │
│              |          |       |        | Due Date   |Action│
├─────────────────────────────────────────────────────────┤
│  SMP-001     | PT ABC   | ORD-X | In Progress | 5 | 25 Jan | 🖨️ │
│  SMP-002     | CV XYZ   | ORD-Y | Completed   | 3 | 24 Jan | 🖨️ │
├─────────────────────────────────────────────────────────┤
│  < 1 2 3 ... 10 >                          Showing 1-10 │
└─────────────────────────────────────────────────────────┘
```

## Kolom Tabel

| Kolom | Deskripsi |
|-------|-----------|
| Sample Code | Kode unik sample |
| Customer | Nama customer |
| Order Code | Kode order terkait |
| Status | Status sample (badge) |
| Received | Tanggal diterima |
| Due Date | Tanggal jatuh tempo |

## Filter

- **Search** - Cari berdasarkan sample code atau customer name (debounced 300ms)
- **Status** - Dropdown filter status
- **Date Range** - From date dan to date untuk filter tanggal masuk

## Status Sample

| Status | Warna | Deskripsi |
|--------|-------|-----------|
| `received` | Blue | Sample baru diterima |
| `in_progress` | Yellow | Sedang diproses/diuji |
| `completed` | Green | Semua test selesai |
| `on_hold` | Gray | Ditunda |

## API Endpoints

```
GET /api/samples?search=&status=&date_from=&date_to=&page=1&limit=20
```

## Interface

```typescript
interface SampleListItem {
  id: number
  code: string
  name: string
  sample_status: string
  due_date: string | null
  received_date: string | null
  order: {
    id: number
    code: string
    order_status: string
    priority: string | null
    customer: {
      id: number
      code: string
      customer_name: string
    }
  } | null
}
```

## Behavior

- Klik sample code → navigasi ke `/operational/sample/[id]`

## Files to Create/Modify

| File | Action |
|------|--------|
| `app/(protected)/operational/sample/page.tsx` | Created |
| `services/sampleService.ts` | Added `getAll()` method |

---

# Sample Detail Page - Design Document

## Overview

Halaman detail sample untuk tracking progress worksheet/test. View-only dengan fitur print PDF, export, dan navigasi ke halaman terkait.

## Lokasi

`frontend/app/(protected)/operational/sample/[id]/page.tsx`

## Layout

### Section 1: Sample Header

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to Sample Tracking                                       │
├──────────────────────────────────────────────────────────────────┤
│  SMP-2024-001                           [🖨️ Print] [📥 Export]  │
│  Sample Name Here                                                │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐      │
│  │ Customer    │ Order       │ Status      │ Priority    │      │
│  │ PT ABC →    │ ORD-001 →   │ In Progress │ High        │      │
│  ├─────────────┼─────────────┼─────────────┼─────────────┤      │
│  │ Received    │ Due Date    │ Lead Time   │ Storage     │      │
│  │ 25 Jan 2026 │ 30 Jan 2026 │ Normal      │ Cold Room   │      │
│  └─────────────┴─────────────┴─────────────┴─────────────┘      │
│  Description: Optional sample description text here...          │
└──────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Back navigation link to `/operational/sample`
- Sample code as main title, name as subtitle
- Info grid with 8 key fields in 2 rows
- Customer and Order are clickable links (→ indicates navigation)
- Status uses same badge colors as list page
- Print and Export buttons in header

### Section 2: Worksheet Progress Summary

```
┌──────────────────────────────────────────────────────────────────┐
│  Test Progress                                                   │
│  ████████████░░░░░░░░░░░░░░░░░░  3 of 8 completed (37%)         │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │      2      │ │      3      │ │      3      │ │      0      ││
│  │   Pending   │ │ In Progress │ │  Completed  │ │   On Hold   ││
│  │   (blue)    │ │  (orange)   │ │   (green)   │ │   (gray)    ││
│  └─────────────┴─┴─────────────┴─┴─────────────┴─┴─────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Progress bar shows overall completion percentage
- Four status cards showing count per worksheet status:
  - **Pending** (Process) - Not started yet
  - **In Progress** - Analyst working on it
  - **Completed** - Result entered and verified
  - **On Hold** - Paused/waiting
- Cards use matching colors from worksheet status badges

### Section 3: Worksheet Detail Table

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  Worksheets (8)                                                                          │
├───────┬────────────┬────────────┬────────┬──────┬──────────┬────────────┬───────┬────────┤
│ Code  │ Test Name  │ Status     │ Result │ Unit │ Analyst  │ Supervisor │ QC    │ Finish │
├───────┼────────────┼────────────┼────────┼──────┼──────────┼────────────┼───────┼────────┤
│WS-001 │ pH Level   │ ✓Completed │ 7.2    │ pH   │ John D.  │ Sarah M.   │ Ali K.│ 26 Jan │
│WS-002 │ Moisture   │ ✓Completed │ 12.5   │ %    │ John D.  │ Sarah M.   │ Ali K.│ 26 Jan │
│WS-003 │ Protein    │ ✓Completed │ 8.3    │ %    │ Jane S.  │ Sarah M.   │ -     │ 27 Jan │
│WS-004 │ Fat Content│ ●Progress  │ -      │ %    │ Jane S.  │ -          │ -     │ -      │
│WS-005 │ Fiber      │ ●Progress  │ -      │ %    │ John D.  │ -          │ -     │ -      │
│WS-006 │ Ash        │ ●Progress  │ -      │ %    │ Jane S.  │ -          │ -     │ -      │
│WS-007 │ Calcium    │ ○Pending   │ -      │ mg/L │ -        │ -          │ -     │ -      │
│WS-008 │ Iron       │ ○Pending   │ -      │ mg/L │ -        │ -          │ -     │ -      │
├───────┴────────────┴────────────┴────────┴──────┴──────────┴────────────┴───────┴────────┤
│  Remarks column expands on row hover or click                                            │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Columns:**

| Column | Description |
|--------|-------------|
| Code | Worksheet code (WS-XXX) |
| Test Name | Service/parameter name |
| Status | Badge with color (Pending/Progress/Completed/Hold) |
| Result | Test result value (or `-` if not done) |
| Unit | Measurement unit |
| Analyst | Analyst who performed test |
| Supervisor | Supervisor who reviewed |
| QC | QC staff who verified |
| Finish | Completion date |

**Behavior:**
- Remarks shown via expandable row or tooltip (keeps table clean)
- Rows sorted by status (Pending → Progress → Completed)
- Click row to expand and see full remarks

## API Endpoint

```
GET /api/samples/:id
```

## Interfaces

```typescript
interface SampleDetail {
  id: number
  code: string
  name: string
  description: string | null
  volume: string | null
  sample_storage: string | null
  received_date: string | null
  due_date: string | null
  priority: string | null
  sample_status: string
  lead_time: string | null
  order: {
    id: number
    code: string
    customer: {
      id: number
      code: string
      customer_name: string
    }
  } | null
  worksheets: WorksheetItem[]
}

interface WorksheetItem {
  id: number
  code: string
  status: string
  result: string | null
  unit: string | null
  finish_date: string | null
  remarks: string | null
  service: {
    id: number
    name: string
  }
  analyst: { id: number; name: string } | null
  supervisor: { id: number; name: string } | null
  qc: { id: number; name: string } | null
}
```

**Progress computed on frontend:**

```typescript
const completed = worksheets.filter(w => w.status === 'Completed').length
const total = worksheets.length
const percentage = Math.round((completed / total) * 100)
```

## Worksheet Status

| Status | Warna | Deskripsi |
|--------|-------|-----------|
| `Process` | Blue | Belum dikerjakan |
| `In Progress` | Orange | Sedang dikerjakan analyst |
| `Completed` | Green | Selesai dan terverifikasi |
| `On Hold` | Gray | Ditunda |

## Actions

| Action | Description |
|--------|-------------|
| Print | Generate blank PDF (placeholder - template akan disediakan) |
| Export | Download CSV/Excel worksheet data |
| Navigate to Customer | Click customer name → `/master-data/customers/[id]` |
| Navigate to Order | Click order code → `/operational/orders/[id]` |

## Navigation Flow

```
/operational/sample (list)
    → click sample code
    → /operational/sample/[id] (detail)
        → click Customer → /master-data/customers/[id]
        → click Order → /operational/orders/[id]
        → Print → generates blank PDF (placeholder)
        → Export → downloads CSV/Excel
```

## Component Structure

```
sample/[id]/page.tsx
├── SampleHeader        (info grid + actions)
├── ProgressSummary     (bar + status cards)
└── WorksheetTable      (comprehensive table)
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/(protected)/operational/sample/[id]/page.tsx` | Create | Detail page component |
| `services/sampleService.ts` | Modify | Add `getById(id)` method |
| `backend/src/controllers/sampleController.ts` | Modify | Add `getById` handler |
| `backend/src/repositories/implementations/SampleRepository.ts` | Modify | Add `findById` with worksheets |
| `backend/src/routes/sampleRoutes.ts` | Modify | Add `GET /:id` route |
