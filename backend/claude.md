# Backend Development Guidelines

> Fastify 5 + Prisma 7 + TypeScript 5 (strict) + TypeBox

---

## Project Structure

```
src/
├── config/         # Database, app config
├── constants/      # Enums, error messages
├── controllers/    # Request handlers (typed FastifyRequest)
├── errors/         # AppError classes
├── repositories/   # Data access (RepositoryResult pattern)
├── routes/         # Route definitions with schema validation
├── schemas/        # TypeBox schemas (query, body, params)
├── services/       # Business logic
└── validators/     # Zod (complex business rules only)
```

---

## ⛔ FORBIDDEN (Anti-Patterns)

```typescript
// ❌ Type Safety Violations
request.query as Record<string, unknown>
request.body as Record<string, unknown>
request.params as { id: string }
typeof queryObj.search === 'string' ? queryObj.search : undefined
const id = parseInt(request.params.id)
const data = result.getValue() as any
items.map((item: any) => ...)

// ❌ Architecture Violations
await prisma.contact.findFirst({ where: { id } })  // Direct prisma in controller
status: (status as string) || 'Created'            // Magic strings
if (order.status === 'Completed') { ... }          // Hardcoded enum

// ❌ Code Quality Violations
} catch (error) { }                                // Empty catch
} catch (error) { throw error }                    // Useless catch
console.log('debug:', data)                        // Console in production
// @ts-ignore                                      // Suppressing errors
!                                                  // Non-null assertion without guard
```

---

## ✅ REQUIRED (Correct Patterns)

### 1. Schema Definition

```typescript
// src/schemas/common.ts
export const PaginationQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  search: Type.Optional(Type.String())
})
export type PaginationQuery = Static<typeof PaginationQuerySchema>

export const IdParamSchema = Type.Object({
  id: Type.Integer({ minimum: 1 })
})
export type IdParam = Static<typeof IdParamSchema>
```

### 2. Feature Schema

```typescript
// src/schemas/{feature}.ts
export const FeatureStatusSchema = Type.Union([
  Type.Literal('Active'),
  Type.Literal('Inactive')
])

export const FeatureQuerySchema = Type.Object({
  ...PaginationQuerySchema.properties,
  status: Type.Optional(FeatureStatusSchema),
  category_id: Type.Optional(Type.Integer({ minimum: 1 }))
})
export type FeatureQuery = Static<typeof FeatureQuerySchema>

export const CreateFeatureBodySchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  status: Type.Optional(FeatureStatusSchema)
})
export type CreateFeatureBody = Static<typeof CreateFeatureBodySchema>
```

### 3. Route with Schema

```typescript
// src/routes/{feature}Routes.ts
app.get<{ Querystring: FeatureQuery }>('/', {
  schema: { querystring: FeatureQuerySchema }
}, controller.getAll)

app.get<{ Params: IdParam }>('/:id', {
  schema: { params: IdParamSchema }
}, controller.getById)

app.post<{ Body: CreateFeatureBody }>('/', {
  schema: { body: CreateFeatureBodySchema }
}, controller.create)

app.put<{ Params: IdParam; Body: UpdateFeatureBody }>('/:id', {
  schema: { params: IdParamSchema, body: UpdateFeatureBodySchema }
}, controller.update)
```

### 4. Typed Controller

```typescript
// src/controllers/{feature}Controller.ts
export async function getAll(
  request: FastifyRequest<{ Querystring: FeatureQuery }>,
  reply: FastifyReply
) {
  const { page = 1, limit = 20, search, status } = request.query
  // ✅ All fields are typed, no manual parsing needed
}

export async function getById(
  request: FastifyRequest<{ Params: IdParam }>,
  reply: FastifyReply
) {
  const { id } = request.params  // ✅ Already a number
}
```

---

## 📦 Response Format (DO NOT CHANGE)

```typescript
// Single item
{ success: true, data: item, message?: string }

// List
{ success: true, data: items }

// Paginated
{ success: true, data: items, pagination: { page, limit, total, totalPages } }

// Error
{ success: false, message: string, code?: string }
```

---

## 🗄️ Repository Pattern

```typescript
// Always use RepositoryResult
const result = await repository.findById(id)
if (result.isFailure()) {
  throw new AppError(500, result.error)
}
const data = result.getValue()

// Soft delete filter - ALWAYS add this
where: { trash: null }
```

---

## 🔧 Validation Strategy

| Layer | Tool | Use Case |
|-------|------|----------|
| Route | TypeBox | Request structure (query, body, params) |
| Service | Zod | Complex business rules |
| Repository | Prisma | Database constraints |

---

## 🎯 Clean Code Principles

### Function Guidelines

```typescript
// ✅ Max 30 lines per function - split if longer
// ✅ Max 3 parameters - use object if more
// ✅ Single responsibility - 1 function = 1 task
// ✅ Early return for guard clauses

// ❌ BAD
async function processOrder(order, customer, items, config, options, flags) {
  if (order) {
    if (customer) {
      if (items.length > 0) {
        // ... 100 lines of nested code
      }
    }
  }
}

// ✅ GOOD
async function processOrder(params: ProcessOrderParams) {
  const { order, customer, items } = params
  
  if (!order) throw new ValidationError('Order required')
  if (!customer) throw new ValidationError('Customer required')
  if (items.length === 0) throw new ValidationError('Items required')
  
  // ... flat code
}
```

### Naming Conventions

```typescript
// Functions: verb + noun (what it does)
getOrderById()      // ✅
fetchCustomerData() // ✅
validateInput()     // ✅
order()             // ❌ unclear

// Booleans: is/has/can/should prefix
isActive            // ✅
hasPermission       // ✅
canDelete           // ✅
active              // ❌ ambiguous

// Constants: UPPER_SNAKE_CASE
ORDER_STATUS        // ✅
MAX_RETRY_COUNT     // ✅

// Avoid abbreviations
usr, cust, ord      // ❌
user, customer, order // ✅
```

---

## ⚡ Performance Rules

### Database

```typescript
// ❌ N+1 Query Problem
const orders = await prisma.order.findMany()
for (const order of orders) {
  const customer = await prisma.customer.findFirst({ where: { id: order.customer_id } })
}

// ✅ Use include/join
const orders = await prisma.order.findMany({
  include: { customer: true }
})

// ✅ Select only needed fields
const orders = await prisma.order.findMany({
  select: { id: true, code: true, status: true }
})

// ✅ Always paginate lists
findMany({ skip: (page - 1) * limit, take: limit })
```

### Parallel Execution

```typescript
// ❌ Sequential (slow)
const customer = await customerRepo.findById(id)
const orders = await orderRepo.findByCustomerId(id)
const invoices = await invoiceRepo.findByCustomerId(id)

// ✅ Parallel (fast)
const [customer, orders, invoices] = await Promise.all([
  customerRepo.findById(id),
  orderRepo.findByCustomerId(id),
  invoiceRepo.findByCustomerId(id)
])
```

---

## 🔒 Security Rules

```typescript
// ✅ Parameterized queries (Prisma handles this)
prisma.user.findFirst({ where: { email } })  // Safe

// ✅ Validate & sanitize file uploads
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024  // 5MB

// ✅ Rate limiting on sensitive endpoints
// ✅ Sanitize output to prevent XSS
// ✅ Validate foreign keys before create/update
// ✅ Check ownership before update/delete

// ❌ NEVER expose sensitive data
select: { password: true }           // ❌
return { ...user }                   // ❌ may include password
return { id, name, email }           // ✅ explicit fields
```

---

## 🚨 Error Handling

```typescript
// ✅ Use typed errors
throw new ValidationError('Email is required')
throw new NotFoundError('Order not found')
throw new BusinessError('Insufficient stock')
throw new ConflictError('Email already exists')

// ✅ Meaningful error messages
throw new ValidationError('Email is required')           // ✅
throw new ValidationError('Invalid input')               // ❌ not specific

// ✅ Handle specific errors
try {
  await repository.create(data)
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictError(`${field} already exists`)
    }
  }
  throw error  // Re-throw unknown errors
}

// ✅ Log errors with context
request.log.error({ err: error, orderId: id }, 'Failed to process order')
```

---

## 🔄 Transaction Handling

```typescript
// ✅ Use transaction for multiple writes
const result = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData })
  
  await tx.sample.createMany({
    data: samples.map(s => ({ ...s, order_id: order.id }))
  })
  
  await tx.inventory.updateMany({
    where: { id: { in: itemIds } },
    data: { quantity: { decrement: 1 } }
  })
  
  return order
})

// ✅ Handle transaction failure
try {
  await prisma.$transaction(async (tx) => { ... })
} catch (error) {
  // Transaction auto-rollback, handle error
  throw new BusinessError('Failed to create order')
}
```

---

## 📝 Constants for Enums

```typescript
// src/constants/{feature}Constants.ts
export const ORDER_STATUS = {
  CREATED: 'Created',
  REVIEWED: 'Reviewed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
} as const

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]

// ✅ Use in code
if (status === ORDER_STATUS.COMPLETED) { ... }

// ✅ Use for defaults
const status = data.status ?? ORDER_STATUS.CREATED
```

---

## 📋 Code Review Checklist

### Type Safety
- [ ] No `as Record<string, unknown>`
- [ ] No `any` type
- [ ] No `parseInt(params.id)`
- [ ] Schema defined in `src/schemas/`
- [ ] Route uses schema validation
- [ ] Controller uses typed `FastifyRequest`

### Architecture
- [ ] No direct Prisma in controller
- [ ] Repository returns `RepositoryResult`
- [ ] Soft delete filter `{ trash: null }`
- [ ] Response format unchanged

### Code Quality
- [ ] Functions < 30 lines
- [ ] Max 3 parameters
- [ ] Early returns (guard clauses)
- [ ] No empty catch blocks
- [ ] No console.log
- [ ] Meaningful variable names

### Performance
- [ ] No N+1 queries (use include)
- [ ] Lists are paginated
- [ ] Use Promise.all for parallel
- [ ] Select only needed fields

### Security
- [ ] Sensitive data not exposed
- [ ] Foreign keys validated
- [ ] Ownership checked before update/delete
- [ ] File uploads validated

### Error Handling
- [ ] Use typed error classes
- [ ] Specific error messages
- [ ] Errors logged with context
- [ ] Transactions for multiple writes

---

## 🚫 Common Mistakes Quick Reference

| Mistake | Fix |
|---------|-----|
| `as Record<string, unknown>` | Use TypeBox schema |
| `parseInt(params.id)` | Use `IdParamSchema` |
| Magic strings `'Active'` | Use constants |
| `any` type | Define proper types |
| Direct prisma in controller | Use repository |
| N+1 queries | Use `include` |
| Sequential async | Use `Promise.all` |
| Empty catch block | Handle or re-throw |
| Nested if statements | Use early returns |
| Function > 50 lines | Split into smaller functions |
| > 3 parameters | Use params object |
| `console.log` | Use `request.log` |
| Expose password | Explicit select fields |
| Missing pagination | Always paginate lists |
| No transaction | Use `$transaction` for multi-write |