import LRU from 'lru-cache';
import { CacheConfig, CacheEntry } from '@hotel-voice-bot/shared';

export class CacheManager {
  private cache: LRU<string, CacheEntry<any>>;

  constructor(config: CacheConfig) {
    this.cache = new LRU({
      max: config.maxSize,
      ttl: config.ttl * 1000,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.set(key, entry); // Update last accessed
      return entry.value;
    }
    return null;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt: Date.now() + (ttl || this.cache.ttl),
      createdAt: Date.now(),
      hitCount: 0,
      lastAccessedAt: Date.now(),
    };
    this.cache.set(key, entry, ttl ? ttl * 1000 : undefined);
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  reset(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      itemCount: this.cache.size,
      hits: this.cache.hits,
      misses: this.cache.misses,
      maxSize: this.cache.max,
    };
  }
}

// Usage example
const cacheConfig: CacheConfig = {
  ttl: 3600, // 1 hour
  maxSize: 1000,
  enableMetrics: true,
};

export const cacheManager = new CacheManager(cacheConfig);

