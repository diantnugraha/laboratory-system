import puppeteer, { Browser } from 'puppeteer';

/**
 * Browser Pool Configuration
 */
interface BrowserPoolConfig {
  minInstances: number;
  maxInstances: number;
  maxUseCount: number; // Recycle browser after N uses to prevent memory leaks
  maxIdleTime: number; // ms before closing idle browser
  acquireTimeout: number; // ms to wait for available browser
}

/**
 * Pooled Browser Entry
 */
interface PooledBrowser {
  browser: Browser;
  inUse: boolean;
  createdAt: Date;
  useCount: number;
}

const DEFAULT_CONFIG: BrowserPoolConfig = {
  minInstances: 1,
  maxInstances: 3,
  maxUseCount: 50,
  maxIdleTime: 300000, // 5 minutes
  acquireTimeout: 30000, // 30 seconds
};

/**
 * Browser Connection Pool for PDF Generation
 *
 * Reuses Puppeteer browser instances to avoid the expensive
 * browser launch overhead (~2-3 seconds) on each PDF generation.
 *
 * Features:
 * - Connection pooling with configurable min/max instances
 * - Automatic browser recycling after max use count
 * - Idle cleanup to release unused resources
 * - Graceful shutdown support
 */
class BrowserPool {
  private pool: PooledBrowser[] = [];
  private config: BrowserPoolConfig;
  private initPromise: Promise<void> | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(config: Partial<BrowserPoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the pool with minimum instances
   */
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    // Create minimum instances
    const promises = Array(this.config.minInstances)
      .fill(null)
      .map(() => this.createBrowserInstance());

    await Promise.all(promises);

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);

    // Handle process shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Create a new browser instance and add to pool
   */
  private async createBrowserInstance(): Promise<PooledBrowser> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
      ],
    });

    const pooledBrowser: PooledBrowser = {
      browser,
      inUse: false,
      createdAt: new Date(),
      useCount: 0,
    };

    this.pool.push(pooledBrowser);
    return pooledBrowser;
  }

  /**
   * Check if browser is still connected
   */
  private async isBrowserConnected(browser: Browser): Promise<boolean> {
    try {
      // Try to get browser version - this will fail if disconnected
      await browser.version();
      return browser.connected;
    } catch {
      return false;
    }
  }

  /**
   * Acquire a browser from the pool
   * Returns a browser and a release function to return it to the pool
   */
  async acquire(): Promise<{ browser: Browser; release: () => void }> {
    if (this.isShuttingDown) {
      throw new Error('Browser pool is shutting down');
    }

    await this.initialize();

    const startTime = Date.now();

    while (Date.now() - startTime < this.config.acquireTimeout) {
      // Find available browser that hasn't exceeded max use count
      const availableIndex = this.pool.findIndex(
        (pb) => !pb.inUse && pb.useCount < this.config.maxUseCount
      );

      if (availableIndex !== -1) {
        const available = this.pool[availableIndex];

        // Check if browser is still connected
        const isConnected = await this.isBrowserConnected(available.browser);
        if (!isConnected) {
          // Remove disconnected browser and continue
          await this.removeBrowser(availableIndex);
          continue;
        }

        available.inUse = true;
        available.useCount++;

        return {
          browser: available.browser,
          release: () => {
            available.inUse = false;
          },
        };
      }

      // Create new instance if under max or pool is empty
      if (this.pool.length < this.config.maxInstances || this.pool.length === 0) {
        try {
          const newBrowser = await this.createBrowserInstance();
          newBrowser.inUse = true;
          newBrowser.useCount++;

          return {
            browser: newBrowser.browser,
            release: () => {
              newBrowser.inUse = false;
            },
          };
        } catch (error) {
          console.error('Failed to create browser instance:', error);
          // Continue to wait for available browser
        }
      }

      // Wait and retry
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error('Browser pool acquire timeout - all browsers are busy');
  }

  /**
   * Cleanup expired or overused browsers
   */
  private async cleanup(): Promise<void> {
    if (this.isShuttingDown) return;

    const now = Date.now();

    for (let i = this.pool.length - 1; i >= 0; i--) {
      const pb = this.pool[i];

      // Skip in-use browsers
      if (pb.inUse) continue;

      // Remove if exceeded max use count
      if (pb.useCount >= this.config.maxUseCount) {
        await this.removeBrowser(i);
        continue;
      }

      // Remove idle browsers (keep minimum)
      if (
        this.pool.length > this.config.minInstances &&
        now - pb.createdAt.getTime() > this.config.maxIdleTime
      ) {
        await this.removeBrowser(i);
      }
    }
  }

  /**
   * Remove a browser from the pool and close it
   */
  private async removeBrowser(index: number): Promise<void> {
    const pb = this.pool[index];
    this.pool.splice(index, 1);

    try {
      await pb.browser.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }

  /**
   * Gracefully shutdown the pool
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Wait for in-use browsers to be released (max 10 seconds)
    const waitStart = Date.now();
    while (
      this.pool.some((pb) => pb.inUse) &&
      Date.now() - waitStart < 10000
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Close all browsers
    await Promise.all(
      this.pool.map(async (pb) => {
        try {
          await pb.browser.close();
        } catch (error) {
          console.error('Error closing browser during shutdown:', error);
        }
      })
    );

    this.pool = [];
    console.log('Browser pool shutdown complete');
  }

  /**
   * Get pool statistics for monitoring
   */
  getStats(): { total: number; inUse: number; available: number } {
    const inUse = this.pool.filter((pb) => pb.inUse).length;
    return {
      total: this.pool.length,
      inUse,
      available: this.pool.length - inUse,
    };
  }
}

// Export singleton instance
export const browserPool = new BrowserPool();

// Export class for custom configurations
export { BrowserPool, BrowserPoolConfig };
