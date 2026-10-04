interface CacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * Simple in-memory LRU cache with TTL.
 * - TTL: 10 minutes (default)
 * - Max entries: 200
 * - Evicts oldest entries when full
 */
export class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private maxEntries: number;
  private ttlMs: number;
  private accessOrder: string[] = [];

  constructor(maxEntries = 200, ttlMs = 10 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  /**
   * Build a cache key from the query and options.
   */
  static key(query: string, maxResults: number): string {
    return `${query.toLowerCase().trim()}|${maxResults}`;
  }

  /**
   * Get a cached value. Returns undefined if not found or expired.
   */
  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      return undefined;
    }

    // Move to end (most recently used)
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);

    return entry.value;
  }

  /**
   * Store a value in the cache.
   * Evicts oldest entries if at capacity.
   */
  set(key: string, value: string): void {
    // If key exists, update it
    if (this.cache.has(key)) {
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
    }

    // Evict oldest if at capacity
    while (this.accessOrder.length >= this.maxEntries) {
      const oldest = this.accessOrder.shift();
      if (oldest) this.cache.delete(oldest);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });

    this.accessOrder.push(key);
  }

  /**
   * Remove expired entries. Call periodically.
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter((k) => k !== key);
      }
    }
  }

  /**
   * Number of entries in the cache (including expired).
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}