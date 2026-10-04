import { describe, it, expect, beforeEach } from "vitest";
import { SearchCache } from "../src/cache.js";

describe("SearchCache", () => {
  let cache: SearchCache;

  beforeEach(() => {
    cache = new SearchCache(10, 1000); // Small cache, 1s TTL for testing
  });

  it("stores and retrieves values", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("builds consistent keys", () => {
    const k1 = SearchCache.key("hello world", 8);
    const k2 = SearchCache.key("  Hello World  ", 8);
    expect(k1).toBe(k2);
  });

  it("expires entries after TTL", async () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 1100));

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("evicts oldest entries when at capacity", () => {
    // Fill cache to capacity (10 entries)
    for (let i = 0; i < 10; i++) {
      cache.set(`key${i}`, `value${i}`);
    }
    expect(cache.size).toBe(10);

    // First entry should still be there
    expect(cache.get("key0")).toBe("value0");

    // Add one more - should evict key1 (now oldest since key0 was accessed)
    cache.set("key10", "value10");

    expect(cache.size).toBe(10);
    expect(cache.get("key0")).toBe("value0"); // Recently accessed, should remain
    expect(cache.get("key1")).toBeUndefined(); // Evicted
    expect(cache.get("key10")).toBe("value10"); // New entry present
  });

  it("updates existing keys without changing size", () => {
    cache.set("key1", "v1");
    cache.set("key1", "v2");
    expect(cache.size).toBe(1);
    expect(cache.get("key1")).toBe("v2");
  });

  it("clears all entries", () => {
    cache.set("key1", "v1");
    cache.set("key2", "v2");
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("key1")).toBeUndefined();
  });

  it("cleanExpired removes expired entries", async () => {
    cache.set("key1", "v1");
    await new Promise((r) => setTimeout(r, 1100));
    cache.cleanExpired();
    expect(cache.size).toBe(0);
  });
});