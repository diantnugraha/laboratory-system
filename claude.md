# Laboratory Management System - Development Guidelines

## Project Overview

Full-stack Laboratory Management System with separate backend and frontend applications.

```
laboratory-system/
├── backend/         # Fastify + Prisma + TypeScript API
├── frontend/        # Next.js 16 + React + TypeScript
├── docs/            # Documentation
└── claude.md        # This file
```

---

## Quick Reference

| Aspect | Backend | Frontend |
|--------|---------|----------|
| **Framework** | Fastify 5.2.1 | Next.js 16.1.1 |
| **Language** | TypeScript 5.7.2 (strict) | TypeScript 5.8.3 |
| **Database** | MySQL via Prisma 7.2.0 | - |
| **State** | - | Zustand + Context |
| **Validation** | Zod | Zod + React Hook Form |
| **Auth** | JWT (bcryptjs) | Cookie-based tokens |
| **API Style** | REST | Axios client |
| **Styling** | - | Tailwind + shadcn/ui |

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│    Database     │
│   (Next.js)     │     │    (Fastify)    │     │    (MySQL)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                        │
       │                        │
   ┌───┴───┐              ┌─────┴─────┐
   │ Axios │              │ Prisma ORM │
   │ + JWT │              │ + Repos    │
   └───────┘              └───────────┘
```

---

## Backend Architecture

### Layer Structure

```
Request → Routes → Controllers → Repositories → Database
                        ↓
                   Services (complex logic)
```

### Key Patterns

1. **Repository Pattern** with `RepositoryResult<T>` wrapper
2. **Zod Validation** in route middleware
3. **JWT Authentication** via Fastify plugin
4. **Soft Deletes** using `trash` field
5. **Centralized Error Handling** with typed errors

### File Organization

```
src/
├── controllers/     # HTTP handlers (no business logic)
├── repositories/
│   ├── contracts/   # Interfaces
│   └── implementations/  # Prisma implementations
├── services/        # Complex business logic
├── validators/      # Zod schemas
├── routes/          # Endpoint definitions
└── errors/          # Custom error classes
```

---

## Frontend Architecture

### Layer Structure

```
Pages → Components → Services → Backend API
           ↓
      Contexts/Stores (state)
```

### Key Patterns

1. **App Router** with route groups `(protected)`
2. **Zustand + Context** for state management
3. **React Hook Form + Zod** for forms
4. **shadcn/ui** components (Radix primitives)
5. **Axios interceptors** for auth tokens

### File Organization

```
├── app/             # Pages (App Router)
├── components/
│   ├── ui/          # shadcn/ui primitives
│   ├── forms/       # Form dialogs
│   └── shared/      # Reusable components
├── services/        # API wrappers
├── store/           # Zustand stores
└── contexts/        # React contexts
```

---

## Naming Conventions

### Backend

| Type | Convention | Example |
|------|------------|---------|
| Files | camelCase | `userController.ts` |
| Interfaces | IPascalCase | `IUserRepository` |
| Classes | PascalCase | `UserRepository` |
| Functions | camelCase | `getAllUsers` |
| DB Fields | snake_case | `created_at` |
| Constants | UPPER_SNAKE | `ERROR_MESSAGES` |

### Frontend

| Type | Convention | Example |
|------|------------|---------|
| Pages | page.tsx | `app/customers/page.tsx` |
| Components | PascalCase | `CustomerForm.tsx` |
| UI Components | kebab-case | `button.tsx` |
| Hooks | use-kebab | `use-toast.ts` |
| Services | camelCase | `customerService.ts` |
| Stores | camelCase | `authStore.ts` |

---

## API Response Format

### Success

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

---

## Common Patterns

### Backend: Creating a New Feature

1. **Define Prisma model** in `schema.prisma`
2. **Create validator** in `validators/featureValidator.ts`
3. **Create repository contract** in `repositories/contracts/IFeatureRepository.ts`
4. **Create repository implementation** in `repositories/implementations/FeatureRepository.ts`
5. **Create controller** in `controllers/featureController.ts`
6. **Create routes** in `routes/featureRoutes.ts`
7. **Register routes** in `app.ts`

### Frontend: Creating a New Page

1. **Create page** in `app/(protected)/feature/page.tsx`
2. **Create service** in `services/featureService.ts`
3. **Create form schema** in `lib/schemas.ts`
4. **Create form dialog** in `components/forms/FeatureFormDialog.tsx`
5. **Add navigation** in sidebar config

---

## Database Patterns

### Soft Delete

```typescript
// Backend: Always filter by trash
where: { trash: null }

// Soft delete
data: { trash: 1 }
```

### Timestamps

```prisma
created_at DateTime @default(now())
updated_at DateTime @updatedAt
```

### Relations

```prisma
// Always define both sides
customer    Customer @relation(fields: [customer_id], references: [id])
customer_id Int

// With cascade rules
@relation(onDelete: Cascade, onUpdate: Restrict)
```

---

## Error Handling

### Backend Error Classes

```typescript
ValidationError    // 400 - Invalid input
AuthenticationError // 401 - Not authenticated
AuthorizationError  // 403 - Not authorized
NotFoundError       // 404 - Not found
ConflictError       // 409 - Duplicate
DatabaseError       // 500 - DB error
```

### Frontend Error Pattern

```typescript
try {
  await apiCall()
  toast({ title: 'Success', description: '...' })
} catch (error: any) {
  toast({
    variant: 'destructive',
    title: 'Error',
    description: error.response?.data?.message || 'Failed'
  })
}
```

---

## Authentication Flow

```
1. User logs in → Backend validates → Returns JWT
2. Frontend stores token in cookie
3. Axios interceptor adds Bearer token to requests
4. Backend authenticate middleware validates JWT
5. On 401 → Frontend redirects to login
```

---

## Environment Variables

### Backend (.env)

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=mysql://user:pass@localhost:3306/db
JWT_SECRET=your-secret
CORS_ORIGIN=http://localhost:3001
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## Development Commands

### Backend

```bash
cd backend
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npx prisma generate  # Generate Prisma client
npx prisma migrate dev  # Run migrations
```

### Frontend

```bash
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
```

---

## Code Quality Checklist

### Before Committing

**Backend:**
- [ ] TypeScript compiles without errors
- [ ] All imports use `.js` extension
- [ ] Repository methods return `RepositoryResult`
- [ ] Routes have proper validation middleware
- [ ] Errors use typed error classes
- [ ] Soft delete filter applied (`trash: null`)

**Frontend:**
- [ ] No TypeScript errors
- [ ] Components use 'use client' where needed
- [ ] Forms reset on dialog open
- [ ] API calls handle loading/error states
- [ ] Toast notifications for user feedback
- [ ] Responsive design checked

---

## Key Files Reference

### Backend

| Purpose | File |
|---------|------|
| Entry point | `src/app.ts` |
| Database config | `src/config/database.ts` |
| Error classes | `src/errors/AppError.ts` |
| Auth middleware | `src/middleware/auth.ts` |
| Repository result | `src/repositories/results/RepositoryResult.ts` |
| Prisma schema | `prisma/schema.prisma` |

### Frontend

| Purpose | File |
|---------|------|
| Root layout | `app/layout.tsx` |
| Auth context | `contexts/AuthContext.tsx` |
| Auth store | `store/authStore.ts` |
| API client | `services/api.ts` |
| Zod schemas | `lib/schemas.ts` |
| Tailwind config | `tailwind.config.ts` |

---

## See Also

- **Backend specifics:** `backend/claude.md`
- **Frontend specifics:** `frontend/claude.md`
