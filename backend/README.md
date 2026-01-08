# Laboratory System - Backend

Backend API for Laboratory Management System built with Express.js, TypeScript, and Prisma.

## Technologies

- **Node.js**: v24.12.0
- **Express.js**: v5.2.1
- **TypeScript**: v5.7.2
- **Prisma ORM**: v7.2.0
- **MySQL**: v8.0.04

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Update the `DATABASE_URL` with your MySQL credentials:
   ```
   DATABASE_URL="mysql://username:password@localhost:3306/laboratory_system"
   ```

## Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and run migrations
npm run prisma:migrate

# Open Prisma Studio (optional)
npm run prisma:studio
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── config/
│   │   └── database.ts     # Prisma client configuration
│   └── index.ts            # Main application entry point
├── .env                    # Environment variables (git-ignored)
├── .env.example            # Example environment variables
├── package.json
└── tsconfig.json
```

## API Endpoints

### Health Check
- **GET** `/health` - Server health status

### API Routes
- **GET** `/api` - API information
- **GET** `/api/users` - Get all users

## Adding New Routes

1. Create route handlers in `src/routes/`
2. Import and use them in `src/index.ts`
3. Update Prisma schema if database changes are needed
4. Run migrations: `npm run prisma:migrate`

## Prisma Commands

```bash
# Generate Prisma Client after schema changes
npm run prisma:generate

# Create a new migration
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio

# Reset database (dev only)
npx prisma migrate reset
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment mode | development |
| DATABASE_URL | MySQL connection string | - |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |
