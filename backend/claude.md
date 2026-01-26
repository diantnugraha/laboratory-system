# Backend Development Guidelines

## Project Overview

Laboratory Management System Backend built with **Fastify + Prisma + TypeScript**.

- **Framework**: Fastify 5.2.1
- **Runtime**: Node.js (ES Modules)
- **Database**: MySQL via Prisma 7.2.0 with MariaDB adapter
- **Language**: TypeScript 5.7.2 (strict mode)

---

## Project Structure

```
backend/src/
├── config/              # Configuration files (database, methods, orders, roles, etc.)
├── constants/           # Error messages and constants
├── controllers/         # HTTP request handlers
├── errors/              # Custom error classes (AppError, ValidationError, etc.)
├── middleware/          # Fastify middleware (auth, errorHandler, zodValidator)
├── plugins/             # Fastify plugins (auth, swagger, fileUpload)
├── repositories/        # Data access layer
│   ├── contracts/       # Repository interfaces
│   ├── implementations/ # Repository implementations
│   └── results/         # RepositoryResult<T> wrapper
├── routes/              # API route definitions
├── schemas/             # Swagger/OpenAPI schemas
├── services/            # Business logic services
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── validators/          # Zod validation schemas
```

---

## Architecture Patterns

### 1. Repository Pattern

Always use the Repository-Result pattern for data access:

```typescript
// Contract (Interface) - src/repositories/contracts/IExampleRepository.ts
import { RepositoryResult } from '../results/RepositoryResult.js'
import { Example, CreateExampleDTO, UpdateExampleDTO } from '../../types/example.js'

export interface IExampleRepository {
  findAll(): Promise<RepositoryResult<Example[]>>
  findById(id: number): Promise<RepositoryResult<Example | null>>
  create(data: CreateExampleDTO): Promise<RepositoryResult<Example>>
  update(id: number, data: UpdateExampleDTO): Promise<RepositoryResult<Example>>
  delete(id: number): Promise<RepositoryResult<boolean>>
}

// Implementation - src/repositories/implementations/ExampleRepository.ts
import { PrismaClient } from '../../config/database.js'
import { RepositoryResult } from '../results/RepositoryResult.js'
import { IExampleRepository } from '../contracts/IExampleRepository.js'

export class ExampleRepository implements IExampleRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<RepositoryResult<Example[]>> {
    try {
      const data = await this.prisma.example.findMany({
        where: { trash: null }
      })
      return RepositoryResult.ok(data)
    } catch (error) {
      return RepositoryResult.fail('Failed to fetch examples')
    }
  }

  async findById(id: number): Promise<RepositoryResult<Example | null>> {
    try {
      const data = await this.prisma.example.findFirst({
        where: { id, trash: null }
      })
      return RepositoryResult.ok(data)
    } catch (error) {
      return RepositoryResult.fail('Failed to fetch example')
    }
  }

  // ... other methods
}
```

### 2. Controller Pattern

Controllers handle HTTP requests and delegate to repositories:

```typescript
// src/controllers/exampleController.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { ExampleRepository } from '../repositories/implementations/ExampleRepository.js'
import { prisma } from '../config/database.js'
import { NotFoundError, ValidationError } from '../errors/AppError.js'

const repository = new ExampleRepository(prisma)

export async function getAllExamples(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const result = await repository.findAll()

  if (result.isFailure()) {
    throw new Error(result.getError())
  }

  return reply.send({
    success: true,
    data: result.getValue()
  })
}

export async function getExampleById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const id = parseInt(request.params.id)

  if (isNaN(id)) {
    throw new ValidationError('Invalid ID format')
  }

  const result = await repository.findById(id)

  if (result.isFailure()) {
    throw new Error(result.getError())
  }

  const example = result.getValue()

  if (!example) {
    throw new NotFoundError('Example not found')
  }

  return reply.send({
    success: true,
    data: example
  })
}
```

### 3. Route Pattern

Routes define API endpoints with validation:

```typescript
// src/routes/exampleRoutes.ts
import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/zodValidator.js'
import { createExampleSchema, updateExampleSchema } from '../validators/exampleValidator.js'
import * as controller from '../controllers/exampleController.js'

export default async function exampleRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate)

  // GET /api/examples
  app.get('/', controller.getAllExamples)

  // GET /api/examples/:id
  app.get('/:id', controller.getExampleById)

  // POST /api/examples
  app.post('/', {
    preHandler: validate(createExampleSchema)
  }, controller.createExample)

  // PUT /api/examples/:id
  app.put('/:id', {
    preHandler: validate(updateExampleSchema)
  }, controller.updateExample)

  // DELETE /api/examples/:id
  app.delete('/:id', controller.deleteExample)
}

// Register in app.ts
app.register(exampleRoutes, { prefix: '/api/examples' })
```

### 4. Validation Pattern (Zod)

Always validate input with Zod schemas:

```typescript
// src/validators/exampleValidator.ts
import { z } from 'zod'

export const createExampleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  price: z.number().positive('Price must be positive').optional()
})

export const updateExampleSchema = createExampleSchema.partial()

export type CreateExampleDTO = z.infer<typeof createExampleSchema>
export type UpdateExampleDTO = z.infer<typeof updateExampleSchema>
```

---

## Error Handling

### Error Classes

Use typed error classes from `src/errors/AppError.ts`:

```typescript
import {
  ValidationError,    // 400 - Invalid input
  AuthenticationError, // 401 - Not authenticated
  AuthorizationError,  // 403 - Not authorized
  NotFoundError,       // 404 - Resource not found
  ConflictError,       // 409 - Duplicate/conflict
  BusinessError,       // 400 - Business rule violation
  DatabaseError,       // 500 - Database error
  FileError            // 400/500 - File operation error
} from '../errors/AppError.js'

// Usage
throw new ValidationError('Email format is invalid')
throw new NotFoundError('Customer not found')
throw new ConflictError('Email already exists')
throw new AuthenticationError('Invalid credentials')
```

### Error Messages

Use centralized error messages from `src/constants/errorMessages.ts`:

```typescript
import { ERROR_MESSAGES } from '../constants/errorMessages.js'

throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND('Customer'))
throw new ConflictError(ERROR_MESSAGES.DUPLICATE('email'))
```

---

## Database Patterns (Prisma)

### Soft Deletes

Always use `trash` field for soft deletes:

```typescript
// Fetch active records
const records = await prisma.example.findMany({
  where: { trash: null }
})

// Soft delete
await prisma.example.update({
  where: { id },
  data: { trash: 1 }
})

// Hard delete (rarely used)
await prisma.example.delete({ where: { id } })
```

### Relations

Include relations explicitly:

```typescript
const order = await prisma.orders.findFirst({
  where: { id, trash: null },
  include: {
    customer: true,
    contact: true,
    order_services: {
      include: {
        service: true,
        method: true
      }
    }
  }
})
```

### Timestamps

Prisma handles timestamps automatically:

```prisma
model Example {
  id         Int      @id @default(autoincrement())
  created_at DateTime @default(now()) @map("created_at")
  updated_at DateTime @updatedAt @map("updated_at")
  trash      Int?
}
```

---

## API Response Format

### Success Response

```typescript
// Single item
return reply.send({
  success: true,
  data: item,
  message: 'Item created successfully' // optional
})

// List
return reply.send({
  success: true,
  data: items
})

// Paginated
return reply.send({
  success: true,
  data: items,
  pagination: {
    page: 1,
    limit: 10,
    total: 100,
    totalPages: 10
  }
})
```

### Error Response (handled by errorHandler plugin)

```typescript
{
  success: false,
  message: 'Error description',
  code: 'ERROR_CODE' // optional
}
```

---

## Authentication

### JWT Authentication

```typescript
// Protect routes with authenticate middleware
import { authenticate } from '../middleware/auth.js'

app.addHook('preHandler', authenticate)

// Access user in controller
const userId = request.user.id
const userRole = request.user.role
```

### Password Handling

```typescript
import bcrypt from 'bcryptjs'

// Hash password
const hashedPassword = await bcrypt.hash(password, 10)

// Verify password
const isValid = await bcrypt.compare(password, hashedPassword)
```

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Controllers | `{feature}Controller.ts` | `userController.ts` |
| Routes | `{feature}Routes.ts` | `userRoutes.ts` |
| Repository Contract | `I{Feature}Repository.ts` | `IUserRepository.ts` |
| Repository Impl | `{Feature}Repository.ts` | `UserRepository.ts` |
| Validators | `{feature}Validator.ts` | `userValidator.ts` |
| Services | `{feature}Service.ts` | `emailService.ts` |
| Types | `{feature}.ts` | `user.ts` |

---

## Import Conventions

Always use `.js` extension for local imports (ESM compatibility):

```typescript
// Correct
import { prisma } from '../config/database.js'
import { NotFoundError } from '../errors/AppError.js'
import { UserRepository } from '../repositories/implementations/UserRepository.js'

// Incorrect
import { prisma } from '../config/database'
```

---

## Code Style

### Naming

- **Variables/Functions**: camelCase (`getUserById`, `isActive`)
- **Classes/Types/Interfaces**: PascalCase (`UserRepository`, `CreateUserDTO`)
- **Constants**: UPPER_SNAKE_CASE (`ERROR_MESSAGES`, `MAX_RETRIES`)
- **Database fields**: snake_case (mapped via `@map()`)

### TypeScript

- Enable strict mode
- Define explicit return types for public functions
- Use `z.infer<typeof schema>` for DTO types
- Avoid `any`, use `unknown` if type is uncertain

### Async/Await

Always use async/await, avoid raw Promises:

```typescript
// Correct
async function getData() {
  const result = await repository.findAll()
  return result.getValue()
}

// Avoid
function getData() {
  return repository.findAll().then(result => result.getValue())
}
```

---

## Services

### When to Create a Service

Create a service for:
- Complex business logic spanning multiple repositories
- External integrations (email, PDF, file storage)
- Reusable operations across controllers

```typescript
// src/services/orderService.ts
export class OrderService {
  constructor(
    private orderRepo: IOrderRepository,
    private customerRepo: ICustomerRepository,
    private emailService: EmailService
  ) {}

  async createOrderWithNotification(data: CreateOrderDTO) {
    // 1. Create order
    const orderResult = await this.orderRepo.create(data)
    if (orderResult.isFailure()) {
      throw new Error(orderResult.getError())
    }

    // 2. Get customer
    const customerResult = await this.customerRepo.findById(data.customer_id)

    // 3. Send notification
    if (customerResult.getValue()?.email) {
      await this.emailService.sendOrderConfirmation(
        customerResult.getValue()!.email,
        orderResult.getValue()
      )
    }

    return orderResult.getValue()
  }
}
```

---

## Testing Checklist

Before committing:

- [ ] All Zod schemas validate expected input
- [ ] Repository methods handle errors gracefully
- [ ] Controllers return proper response format
- [ ] Routes have appropriate authentication
- [ ] No hardcoded values (use config/env)
- [ ] TypeScript compiles without errors
- [ ] Imports use `.js` extension

---

## Common Mistakes to Avoid

1. **Don't bypass repository pattern** - Never use `prisma` directly in controllers
2. **Don't forget soft delete filter** - Always add `where: { trash: null }`
3. **Don't skip validation** - Always validate input with Zod
4. **Don't expose internal errors** - Map to appropriate HTTP errors
5. **Don't hardcode config** - Use environment variables
6. **Don't forget `.js` in imports** - Required for ESM
7. **Don't ignore RepositoryResult** - Always check `isFailure()` before `getValue()`
