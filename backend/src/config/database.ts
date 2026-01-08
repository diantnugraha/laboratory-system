import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// Parse DATABASE_URL to extract connection parameters
// Format: mysql://user:password@host:port/database
const parseDatabaseUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return {
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port) || 3306,
      user: decodeURIComponent(parsedUrl.username),
      password: decodeURIComponent(parsedUrl.password),
      database: parsedUrl.pathname.slice(1), // Remove leading '/'
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Get database connection parameters
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const dbConfig = parseDatabaseUrl(databaseUrl);

// Create MariaDB adapter with direct configuration (recommended for Prisma 7.2.0)
// The adapter will manage the connection pool internally
const adapter = new PrismaMariaDb({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  connectionLimit: 10,
  acquireTimeout: 60000, // 60 seconds
  connectTimeout: 10000, // 10 seconds
  allowPublicKeyRetrieval: true, // Required for MySQL with caching_sha2_password
});

// Initialize Prisma Client with MariaDB adapter
// Prisma v7 requires adapter for direct database connections
// MariaDB adapter is compatible with MySQL
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Test connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully via Prisma');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Database connection error:', errorMessage);
    return false;
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };
