# Laboratory System - Frontend

Frontend application for Laboratory Management System built with Next.js, TypeScript, Zustand, and Axios.

## Technologies

- **Next.js**: v16.1.1
- **React**: v19.0.0
- **TypeScript**: v5.7.2
- **Zustand**: v5.0.2 (State Management)
- **Axios**: v1.7.9 (HTTP Client)

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env.local`
2. Update API URL if needed:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Production Mode
```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── globals.css     # Global styles
│   ├── lib/
│   │   └── axios.ts        # Axios configuration
│   └── store/
│       └── userStore.ts    # Zustand user store
├── .env.local              # Environment variables (git-ignored)
├── .env.example            # Example environment variables
├── next.config.ts          # Next.js configuration
├── package.json
└── tsconfig.json
```

## State Management (Zustand)

The application uses Zustand for state management. Example usage:

```typescript
import { useUserStore } from '@/store/userStore';

function Component() {
  const { user, setUser, logout } = useUserStore();

  // Use state and actions
}
```

## API Calls (Axios)

The application includes a pre-configured Axios instance with:
- Automatic base URL configuration
- Request interceptor for authentication tokens
- Response interceptor for error handling
- Automatic redirect on 401 (unauthorized)

Example usage:

```typescript
import axios from '@/lib/axios';

// GET request
const response = await axios.get('/users');

// POST request
const response = await axios.post('/users', { name: 'John' });
```

## Adding New Pages

1. Create a new folder in `src/app/`
2. Add `page.tsx` file for the route
3. Optionally add `layout.tsx` for route-specific layout

Example:
```
src/app/dashboard/page.tsx → /dashboard route
```

## Adding New Stores

1. Create a new file in `src/store/`
2. Define your store using Zustand's `create` function
3. Export and use in components

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:5000/api |

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Path Aliases

The project uses `@/*` alias for imports from the `src` directory:

```typescript
import axios from '@/lib/axios';
import { useUserStore } from '@/store/userStore';
```
