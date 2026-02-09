import { redis } from '../config/redis.js';

/**
 * Cache Helper for Redis operations
 * Provides caching utilities with TTL and invalidation support
 */
export class CacheHelper {
  /**
   * Cache data with TTL (Time To Live)
   * @param key - Cache key
   * @param fetchFn - Function to fetch data if cache miss
   * @param ttl - Time to live in seconds (default: 300 = 5 minutes)
   * @returns Cached or fresh data
   */
  static async cache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    try {
      const cached = await redis.get(key);

      if (cached !== null) {
        return JSON.parse(cached) as T;
      }

      const data = await fetchFn();
      await redis.setex(key, ttl, JSON.stringify(data));

      return data;
    } catch (error) {
      console.error(`Cache error for key ${key}:`, error);
      // Fallback to fetching data if Redis fails
      return fetchFn();
    }
  }

  /**
   * Invalidate cache by pattern
   * @param pattern - Pattern to match keys (e.g., 'worksheet:*')
   */
  static async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`✓ Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }
    } catch (error) {
      console.error(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Invalidate specific keys
   * @param keys - Array of keys to delete
   */
  static async invalidateKeys(keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`✓ Invalidated ${keys.length} cache keys`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Get cached data without setting new value
   * @param key - Cache key
   * @returns Cached data or null
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cache data with TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in seconds
   */
  static async set<T>(key: string, data: T, ttl: number = 300): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Check if key exists
   * @param key - Cache key
   * @returns true if exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }
}
