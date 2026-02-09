import Redis from 'ioredis';

/**
 * Redis client configuration for caching
 */
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  keyPrefix: 'lab-system:',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Connection event handlers
redis.on('connect', () => {
  console.log('✓ Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('✗ Redis connection error:', err.message);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redis.quit();
});
