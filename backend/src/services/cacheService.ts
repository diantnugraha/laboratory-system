/**
 * Cache Entry with expiration
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache Service Configuration
 */
interface CacheConfig {
  defaultTTL: number; // milliseconds
  maxEntries: number;
  cleanupInterval: number; // milliseconds
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 300000, // 5 minutes
  maxEntries: 1000,
  cleanupInterval: 60000, // 1 minute
};

/**
 * In-Memory Cache Service
 *
 * A simple but effective caching solution for reducing database queries
 * and improving response times.
 *
 * Features:
 * - TTL-based expiration
 * - Automatic cleanup of expired entries
 * - Max entries limit with LRU-like eviction
 * - getOrSet pattern for cache-aside usage
 */
class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    // Don't block process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Remove all expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get a value from cache
   * Returns undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Enforce max entries (LRU-like behavior - remove oldest)
    if (this.cache.size >= this.config.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.config.defaultTTL),
    });
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   * This is the recommended pattern for cache-aside usage
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxEntries: number } {
    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
    };
  }

  /**
   * Shutdown the cache service
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// General purpose cache instance
export const cacheService = new CacheService();

// Specialized cache for order code sequences (short TTL)
export const orderCodeCache = new CacheService({
  defaultTTL: 60000, // 1 minute - code sequences change frequently
  maxEntries: 100,
  cleanupInterval: 30000,
});

// Specialized cache for customer data (longer TTL)
export const customerCache = new CacheService({
  defaultTTL: 300000, // 5 minutes
  maxEntries: 500,
  cleanupInterval: 60000,
});

// Export class for custom cache instances
export { CacheService, CacheConfig };
