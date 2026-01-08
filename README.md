# Laboratory System

A full-stack laboratory management system built with modern technologies.

## Tech Stack

### Backend
- **Node.js**: v24.12.0
- **TypeScript**: Latest
- **Express.js**: v5.2.1
- **Prisma**: v7.2.0
- **MySQL**: v8.0.04

### Frontend
- **Next.js**: v16.1.1
- **TypeScript**: Latest
- **Zustand**: State management
- **Axios**: HTTP client

## Project Structure

```
laboratory-system/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   └── index.ts
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── globals.css
    │   ├── lib/
    │   │   └── axios.ts
    │   └── store/
    │       └── userStore.ts
    ├── .env.local
    ├── .env.example
    ├── next.config.ts
    ├── package.json
    └── tsconfig.json
```

## Prerequisites

- Node.js v24.12.0 or higher
- MySQL v8.0.04 or higher
- npm or yarn package manager

## Setup Instructions

### 1. Database Setup

Create a MySQL database for the project:

```sql
CREATE DATABASE laboratory_system;
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Edit .env file and update DATABASE_URL with your MySQL credentials
# Format: mysql://username:password@localhost:3306/laboratory_system

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

The backend server will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables (optional)
# Edit .env.local if you need to change API URL

# Start development server
npm run dev
```

The frontend application will run on `http://localhost:3000`

## Available Scripts

### Backend

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## API Endpoints

### Health Check
- `GET /health` - Check server status

### API Routes
- `GET /api` - API information
- `GET /api/users` - Get all users (example endpoint)

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
DATABASE_URL="mysql://username:password@localhost:3306/laboratory_system"
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Development

### Adding New Database Models

1. Edit `backend/prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Run `npm run prisma:generate` to update Prisma Client

### State Management (Zustand)

The frontend uses Zustand for state management. Example store is located at `frontend/src/store/userStore.ts`

### API Calls (Axios)

A configured Axios instance is available at `frontend/src/lib/axios.ts` with interceptors for authentication and error handling.

## License

ISC
