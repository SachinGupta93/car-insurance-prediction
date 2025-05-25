/**
 * A simple API response cache to reduce redundant network requests.
 * This is especially useful for GET requests that don't change frequently.
 */

interface CacheOptions {
  /** Time in milliseconds before cached item expires (default: 5 minutes) */
  ttl?: number; 
  /** Cache key to use. If not provided, endpoint plus stringified params will be used */
  cacheKey?: string;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class ApiCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get an item from the cache
   * @param key The cache key
   * @returns The cached data or undefined if not found/expired
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    // Check if the item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.data;
  }

  /**
   * Store an item in the cache
   * @param key The cache key
   * @param data The data to cache
   * @param options Cache options including TTL
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? this.defaultTTL;
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
  }

  /**
   * Remove an item from the cache
   * @param key The cache key
   * @returns True if an item was found and deleted
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Generate a cache key from an endpoint and parameters
   * @param endpoint API endpoint
   * @param params Parameters for the request
   * @returns A unique cache key
   */
  generateKey(endpoint: string, params?: Record<string, any>): string {
    if (!params) {
      return endpoint;
    }
    
    // Sort keys to ensure consistent key generation regardless of object key order
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);
    
    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  }
  
  /**
   * Get the number of items currently in the cache
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Remove all expired items from the cache
   * @returns Number of items removed
   */
  removeExpiredItems(): number {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }
}

// Create and export a singleton instance
const apiCache = new ApiCache();
export default apiCache;