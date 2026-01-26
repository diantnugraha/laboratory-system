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
│   ├── setup-password/
│   ├── forgot-password/
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/
│   ├── ui/                  # shadcn/ui components (50+)
│   ├── forms/               # Form dialog components
│   ├── shared/              # Reusable shared components
│   ├── layout/              # Layout components (AppLayout, Sidebar)
│   └── dashboard/           # Dashboard-specific components
├── contexts/                # React Context providers
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities and helpers
│   ├── schemas.ts           # Zod validation schemas
│   ├── utils.ts             # Utility functions (cn, formatters)
│   └── cookieStorage.ts     # Cookie helper for Zustand
├── services/                # API service wrappers
├── store/                   # Zustand stores
├── data/                    # Constants and static data
└── public/                  # Static assets
```

---

## Component Patterns

### 1. Page Component Pattern

```typescript
// app/(protected)/master/customers/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { DataTable } from '@/components/shared/DataTable'
import { CustomerFormDialog } from '@/components/forms/CustomerFormDialog'
import { getCustomers, deleteCustomer } from '@/services/customerService'
import { Customer } from '@/types/customer'
import { columns } from './columns'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const { toast } = useToast()

  const fetchCustomers = async () => {
    try {
      setIsLoading(true)
      const response = await getCustomers()
      setCustomers(response.data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch customers'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomer(id)
      toast({ title: 'Success', description: 'Customer deleted' })
      fetchCustomers()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Delete failed' })
    }
  }

  const handleSuccess = () => {
    setIsDialogOpen(false)
    setSelectedCustomer(null)
    fetchCustomers()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button onClick={() => setIsDialogOpen(true)}>Add Customer</Button>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <CustomerFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        customer={selectedCustomer}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
```

### 2. Form Dialog Pattern

```typescript
// components/forms/CustomerFormDialog.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { customerSchema, CustomerFormData } from '@/lib/schemas'
import { createCustomer, updateCustomer } from '@/services/customerService'
import { Customer } from '@/types/customer'

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  onSuccess: () => void
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSuccess
}: CustomerFormDialogProps) {
  const { toast } = useToast()
  const isEdit = !!customer

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      code: '',
      name: '',
      industry: '',
      status: 'Active'
    }
  })

  // Reset form when dialog opens/closes or customer changes
  useEffect(() => {
    if (open) {
      if (customer) {
        form.reset({
          code: customer.code,
          name: customer.name,
          industry: customer.industry || '',
          status: customer.status || 'Active'
        })
      } else {
        form.reset({
          code: '',
          name: '',
          industry: '',
          status: 'Active'
        })
      }
    }
  }, [open, customer, form])

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (isEdit) {
        await updateCustomer(customer.id, data)
        toast({ title: 'Success', description: 'Customer updated' })
      } else {
        await createCustomer(data)
        toast({ title: 'Success', description: 'Customer created' })
      }
      onSuccess()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Operation failed'
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Customer' : 'Add Customer'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="CUST001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* More fields... */}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

### 3. Protected Layout Pattern

```typescript
// app/(protected)/layout.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'

export default function ProtectedLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <AppLayout>{children}</AppLayout>
}
```

---

## State Management

### Zustand Store Pattern

```typescript
// store/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { cookieStorage } from '@/lib/cookieStorage'

interface User {
  id: number
  email: string
  username: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  setAuth: (user: User | null, token: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => set({
        user,
        token,
        isAuthenticated: true
      }),

      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false
      }),

      setAuth: (user, token) => set({
        user,
        token,
        isAuthenticated: !!user && !!token
      })
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => cookieStorage),
    }
  )
)
```

### Context Pattern (for providers)

```typescript
// contexts/AuthContext.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import Cookies from 'js-cookie'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated, login: storeLogin, logout: storeLogout } = useAuthStore()

  useEffect(() => {
    // Check for existing auth on mount
    const token = Cookies.get('auth-token')
    if (!token) {
      storeLogout()
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password)
    Cookies.set('auth-token', response.data.token, { expires: 7 })
    storeLogin(response.data.user, response.data.token)
  }

  const logout = () => {
    Cookies.remove('auth-token')
    Cookies.remove('auth-storage')
    storeLogout()
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

---

## API Service Pattern

```typescript
// services/api.ts
import axios from 'axios'
import Cookies from 'js-cookie'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('auth-token')
      Cookies.remove('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// services/customerService.ts
import api from './api'
import { Customer, CreateCustomerDTO, UpdateCustomerDTO } from '@/types/customer'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export async function getCustomers(): Promise<ApiResponse<Customer[]>> {
  const response = await api.get('/customers')
  return response.data
}

export async function getCustomerById(id: number): Promise<ApiResponse<Customer>> {
  const response = await api.get(`/customers/${id}`)
  return response.data
}

export async function createCustomer(data: CreateCustomerDTO): Promise<ApiResponse<Customer>> {
  const response = await api.post('/customers', data)
  return response.data
}

export async function updateCustomer(id: number, data: UpdateCustomerDTO): Promise<ApiResponse<Customer>> {
  const response = await api.put(`/customers/${id}`, data)
  return response.data
}

export async function deleteCustomer(id: number): Promise<ApiResponse<boolean>> {
  const response = await api.delete(`/customers/${id}`)
  return response.data
}
```

---

## Form Validation with Zod

```typescript
// lib/schemas.ts
import { z } from 'zod'

// Customer schema
export const customerSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  industry: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  status: z.enum(['Active', 'Inactive']).default('Active')
})

export type CustomerFormData = z.infer<typeof customerSchema>

// Order schema
export const orderSchema = z.object({
  customer_id: z.number().min(1, 'Customer is required'),
  contact_id: z.number().optional(),
  order_date: z.date(),
  due_date: z.date().optional(),
  notes: z.string().optional(),
  services: z.array(z.object({
    service_id: z.number(),
    method_id: z.number(),
    quantity: z.number().min(1),
    price: z.number().min(0)
  })).min(1, 'At least one service is required')
})

export type OrderFormData = z.infer<typeof orderSchema>

// Reusable field schemas
export const emailField = z.string().email('Invalid email format')
export const phoneField = z.string().regex(/^[0-9+\-\s()]+$/, 'Invalid phone format').optional()
export const requiredString = (fieldName: string) => z.string().min(1, `${fieldName} is required`)
```

---

## Styling with Tailwind CSS

### Design Tokens (CSS Variables)

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode values */
  }
}
```

### Component Styling

```typescript
// Use cn() utility for conditional classes
import { cn } from '@/lib/utils'

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      status === 'Active' && 'bg-green-100 text-green-800',
      status === 'Inactive' && 'bg-gray-100 text-gray-800',
      status === 'Pending' && 'bg-yellow-100 text-yellow-800'
    )}>
      {status}
    </span>
  )
}
```

### Common Tailwind Patterns

```typescript
// Card layout
<div className="bg-card rounded-lg border p-6 shadow-sm">

// Flex layouts
<div className="flex items-center justify-between gap-4">
<div className="flex flex-col gap-2">

// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Form spacing
<form className="space-y-4">

// Button group
<div className="flex justify-end gap-2">

// Page header
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold">Title</h1>
  <Button>Action</Button>
</div>

// Loading state
<div className="flex items-center justify-center min-h-[200px]">
  <Loader2 className="h-6 w-6 animate-spin" />
</div>
```

---

## shadcn/ui Components

### Available Components

Located in `components/ui/`:

- **Layout**: `card`, `separator`, `scroll-area`, `sheet`, `sidebar`
- **Forms**: `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `form`, `label`
- **Data Display**: `table`, `badge`, `avatar`, `calendar`
- **Feedback**: `alert`, `alert-dialog`, `toast`, `skeleton`, `progress`
- **Navigation**: `breadcrumb`, `dropdown-menu`, `navigation-menu`, `tabs`, `command`
- **Overlay**: `dialog`, `popover`, `tooltip`, `hover-card`
- **Inputs**: `date-picker`, `combobox`, `multi-select`

### Usage Example

```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Button variants
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

---

## Custom Hooks

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// Usage
const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 300)

useEffect(() => {
  if (debouncedSearch) {
    // Fetch filtered data
  }
}, [debouncedSearch])
```

```typescript
// hooks/use-mobile.tsx
import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    setIsMobile(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
```

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
| Hooks | `use-kebab-case.ts` | `use-toast.ts`, `use-mobile.tsx` |
| Schemas | `schemas.ts` | `lib/schemas.ts` |
| Types | `camelCase.ts` | `customer.ts` |
| Utilities | `camelCase.ts` | `utils.ts`, `cookieStorage.ts` |

---

## Toast Notifications

```typescript
import { useToast } from '@/hooks/use-toast'

function MyComponent() {
  const { toast } = useToast()

  // Success
  toast({
    title: 'Success',
    description: 'Operation completed successfully'
  })

  // Error
  toast({
    variant: 'destructive',
    title: 'Error',
    description: 'Something went wrong'
  })

  // With action
  toast({
    title: 'Item deleted',
    description: 'The item has been deleted',
    action: (
      <ToastAction altText="Undo" onClick={handleUndo}>
        Undo
      </ToastAction>
    )
  })
}
```

---

## Error Handling

```typescript
// In components
try {
  await someAsyncOperation()
  toast({ title: 'Success', description: 'Operation completed' })
} catch (error: any) {
  // Handle API errors
  const message = error.response?.data?.message
    || error.message
    || 'An unexpected error occurred'

  toast({
    variant: 'destructive',
    title: 'Error',
    description: message
  })
}

// Error boundary (for unhandled errors)
// app/error.tsx
'use client'

export default function Error({
  error,
  reset
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

---

## Common Mistakes to Avoid

1. **Don't forget 'use client'** - Required for components with hooks/state
2. **Don't skip form.reset()** - Always reset form when dialog opens
3. **Don't hardcode API URLs** - Use `NEXT_PUBLIC_API_URL` env variable
4. **Don't ignore loading states** - Show spinner/skeleton during fetch
5. **Don't skip error handling** - Always catch and display errors
6. **Don't mutate state directly** - Use setter functions
7. **Don't forget dependencies** - Include all deps in useEffect array
8. **Don't import from wrong paths** - Use `@/` alias consistently

---

## Testing Checklist

Before committing:

- [ ] Component renders without errors
- [ ] Form validation works correctly
- [ ] API calls handle loading/error states
- [ ] Protected routes redirect unauthenticated users
- [ ] Toast notifications show for success/error
- [ ] Responsive design works on mobile
- [ ] No TypeScript errors
- [ ] No console errors/warnings
