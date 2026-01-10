# Plan: Agency Role - Multi-Customer Access Feature

> **Status: IMPLEMENTED**

## Overview
Implementasi fitur Agency role (ID 28) dimana 1 user dengan role Agency dapat melihat list order dari beberapa perusahaan (customers). Sistem lama menyimpan multiple customer assignment di field `list_customer` dan `list_contact` sebagai text/JSON.

## Current Database Schema

### Existing Fields in `users` table:
```prisma
model Users {
  // ... standard fields ...
  role_id          Int       @map("role_id")           // 28 = Agency
  customer_id      Int?      @map("customer_id")       // Single customer (legacy)
  contact_id       Int?      @map("contact_id")        // Single contact (legacy)
  list_customer    String?   @map("list_customer") @db.Text   // Multiple customers (comma-separated or JSON)
  list_contact     String?   @map("list_contact") @db.Text    // Multiple contacts (comma-separated or JSON)
}
```

### Role IDs Reference:
- `16` = Customer (single customer access)
- `28` = Agency (multiple customer access via list_customer/list_contact)

## Implementation Strategy

Ada 2 opsi pendekatan:

### Option A: Use Existing `list_customer` Field (Recommended)
Manfaatkan field yang sudah ada (`list_customer` dan `list_contact`) yang menyimpan data dalam format comma-separated atau JSON string.

**Pros:**
- Tidak perlu migrasi database
- Backward compatible dengan data existing
- Lebih cepat implementasi

**Cons:**
- Format data perlu parsing
- Tidak ada referential integrity

### Option B: Create Junction Table (Proper Normalization)
Buat tabel baru `user_customers` untuk many-to-many relationship.

```prisma
model UserCustomer {
  id          Int      @id @default(autoincrement())
  user_id     Int      @map("user_id")
  customer_id Int      @map("customer_id")
  contact_id  Int?     @map("contact_id")
  created_at  DateTime @default(now())

  user        Users    @relation(fields: [user_id], references: [id])
  customer    Customer @relation(fields: [customer_id], references: [id])

  @@unique([user_id, customer_id])
  @@map("user_customers")
}
```

**Pros:**
- Proper database normalization
- Referential integrity
- Easier querying

**Cons:**
- Requires database migration
- Need to migrate existing data from list_customer

---

## Recommended Approach: Option A (Use Existing Fields)

### Step 1: Backend - Update User Repository

**File:** `backend/src/repositories/implementations/UserRepository.ts`

Add methods to handle list_customer:
```typescript
// Parse list_customer field (comma-separated IDs or JSON array)
parseListCustomer(listCustomer: string | null): number[] {
  if (!listCustomer) return [];

  // Try JSON parse first
  try {
    const parsed = JSON.parse(listCustomer);
    if (Array.isArray(parsed)) {
      return parsed.map(id => typeof id === 'number' ? id : parseInt(id, 10)).filter(id => !isNaN(id));
    }
  } catch {}

  // Fallback to comma-separated
  return listCustomer.split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id));
}
```

Update findById to include parsed list_customer:
```typescript
async findById(id: number): Promise<RepositoryResult<any>> {
  // ... existing code ...

  // For Agency role (28), parse list_customer
  if (user.role_id === 28 && user.list_customer) {
    user.customer_ids = this.parseListCustomer(user.list_customer);
  }

  return RepositoryResult.ok(user);
}
```

### Step 2: Backend - Update User Controller

**File:** `backend/src/controllers/userController.ts`

Update create/update to handle list_customer:
```typescript
// For Agency role, accept customer_ids array and save as list_customer
if (role_id === 28 && customer_ids && Array.isArray(customer_ids)) {
  createData.list_customer = JSON.stringify(customer_ids);
  createData.list_contact = contact_ids ? JSON.stringify(contact_ids) : null;
}
```

### Step 3: Backend - Add Agency Filter to Order/PreOrder Queries

**File:** `backend/src/controllers/preOrderController.ts` (or equivalent)

```typescript
// Build customer filter based on role
let customerFilter: any = {};

if (user.role_id === 16) {
  // Customer role: single customer
  customerFilter.customer_id = user.customer_id;
} else if (user.role_id === 28) {
  // Agency role: multiple customers from list_customer
  const customerIds = parseListCustomer(user.list_customer);
  if (customerIds.length > 0) {
    customerFilter.customer_id = { in: customerIds };
  }
}
```

### Step 4: Frontend - Update User Types

**File:** `frontend/services/userService.ts`

Add interface for Agency user:
```typescript
export interface UserWithAgencyAccess extends User {
  list_customer?: string;
  list_contact?: string;
  customer_ids?: number[];  // Parsed from list_customer
  contact_ids?: number[];   // Parsed from list_contact
}
```

### Step 5: Frontend - Create Agency User Form Dialog

**File:** `frontend/components/forms/AgencyUserFormDialog.tsx`

Create new dialog specifically for Agency users with:
- Multi-select customer picker (Combobox with multiple selection)
- For each selected customer, optional contact selection
- Display selected customers as chips/badges

```tsx
// Key fields:
- display_name: string
- username: string
- email: string
- customer_ids: number[]  // Multi-select
- contact_ids: number[]   // Optional, per customer
```

### Step 6: Frontend - Update External User Detail Page

**File:** `frontend/app/(protected)/master/user/external/[id]/page.tsx`

Add conditional UI for Agency role:
```tsx
{user.role_id === 28 ? (
  // Show multiple customer selection
  <AgencyCustomerMultiSelect
    selectedIds={customerIds}
    onChange={setCustomerIds}
  />
) : (
  // Show single customer selection (existing)
  <CustomerCombobox ... />
)}
```

### Step 7: Frontend - Create AgencyCustomerMultiSelect Component

**File:** `frontend/components/shared/AgencyCustomerMultiSelect.tsx`

Features:
- Search customers via API
- Multi-select with chips display
- Remove individual selections
- Maximum selections limit (optional)

```tsx
interface AgencyCustomerMultiSelectProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}
```

## Files to Create/Modify

### Backend
1. `repositories/implementations/UserRepository.ts` - Add parseListCustomer method, update findById
2. `repositories/contracts/IUserRepository.ts` - Update interfaces
3. `controllers/userController.ts` - Handle list_customer on create/update
4. `controllers/preOrderController.ts` - Add Agency role filtering
5. `controllers/quotationController.ts` - Add Agency role filtering

### Frontend
1. `services/userService.ts` - Update interfaces
2. `components/forms/AgencyUserFormDialog.tsx` - New dialog
3. `components/shared/AgencyCustomerMultiSelect.tsx` - New component
4. `app/(protected)/master/user/external/[id]/page.tsx` - Update for Agency
5. `app/(protected)/master/user/page.tsx` - Handle Agency in external tab

## API Changes

### Create Agency User
```
POST /api/users
Body: {
  username: string,
  email: string,
  display_name: string,
  role_id: 28,
  customer_ids: number[],  // Array of customer IDs
  contact_ids?: number[]   // Optional array of contact IDs
}
```

### Update Agency User
```
PUT /api/users/:id
Body: {
  customer_ids?: number[],
  contact_ids?: number[]
  // ... other fields
}
```

### Get Agency User
```
GET /api/users/:id
Response: {
  id: number,
  role_id: 28,
  list_customer: "1,2,3" | "[1,2,3]",
  customer_ids: [1, 2, 3],  // Parsed array
  customers: [              // Resolved customer objects
    { id: 1, customer_name: "Company A" },
    { id: 2, customer_name: "Company B" },
    { id: 3, customer_name: "Company C" }
  ]
}
```

## Order/PreOrder Filtering Logic

When Agency user (role_id=28) accesses orders:

```typescript
// In preOrder/order controller
const getOrdersForUser = async (user: User) => {
  let where: any = { trash: null };

  if (user.role_id === 16) {
    // Customer: see only their orders
    where.customer_id = user.customer_id;
  } else if (user.role_id === 28) {
    // Agency: see orders from all assigned customers
    const customerIds = parseListCustomer(user.list_customer);
    if (customerIds.length > 0) {
      where.customer_id = { in: customerIds };
    }
  }
  // Internal roles: no customer filter (see all)

  return await prisma.preOrder.findMany({ where });
};
```

## Testing Scenarios

1. **Create Agency User**
   - Select multiple customers
   - Verify list_customer saved correctly

2. **Edit Agency User**
   - Add/remove customers
   - Verify list_customer updated

3. **Agency User Login**
   - Login as agency user
   - View PreOrder list
   - Verify only assigned customers' orders visible

4. **Customer Role Comparison**
   - Customer role sees only single customer's orders
   - Agency role sees multiple customers' orders

## Data Migration (if using Option B)

If later migrating to junction table:
```sql
-- Parse existing list_customer data and insert into user_customers
INSERT INTO user_customers (user_id, customer_id)
SELECT
  u.id,
  CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(u.list_customer, ',', n.n), ',', -1) AS UNSIGNED)
FROM users u
CROSS JOIN (
  SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
) n
WHERE u.role_id = 28
  AND u.list_customer IS NOT NULL
  AND CHAR_LENGTH(u.list_customer) - CHAR_LENGTH(REPLACE(u.list_customer, ',', '')) >= n.n - 1;
```

## Verification Checklist

- [ ] Agency user creation with multiple customers works
- [ ] Agency user edit (add/remove customers) works
- [ ] Agency user sees orders from all assigned customers
- [ ] Customer role still sees only their own orders
- [ ] Internal users see all orders (no filter)
- [ ] list_customer field properly saved/parsed
- [ ] UI shows multiple customer badges for Agency users
