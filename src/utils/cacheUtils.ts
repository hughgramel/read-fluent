/**
 * Simple in-memory cache utility for the spaced repetition system
 * This helps reduce Firebase reads for frequently accessed data
 */

interface CacheItem<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl?: number;
}

class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default TTL
  
  /**
   * Sets a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const now = Date.now();
    
    this.cache.set(key, {
      value,
      timestamp: now,
      expiresAt: now + ttl
    });
  }
  
  /**
   * Gets a value from the cache
   * @param key - Cache key
   * @returns Cached value or null if not found or expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }
  
  /**
   * Deletes a value from the cache
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clears all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Clears expired items from the cache
   */
  clearExpired(): void {
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Gets or sets a value in the cache
   * @param key - Cache key
   * @param fetchFn - Function to fetch the value if not in cache
   * @param options - Cache options
   * @returns Cached or fetched value
   */
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const cachedValue = this.get<T>(key);
    
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    const value = await fetchFn();
    this.set(key, value, options);
    return value;
  }
}

// Export a singleton instance
export const memoryCache = new MemoryCache();

// Run cache cleanup every minute
setInterval(() => {
  memoryCache.clearExpired();
}, 60 * 1000);