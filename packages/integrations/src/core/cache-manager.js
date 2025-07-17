import LRU from 'lru-cache';
export class CacheManager {
    cache;
    constructor(config) {
        this.cache = new LRU({
            max: config.maxSize,
            ttl: config.ttl * 1000,
            updateAgeOnGet: true,
            updateAgeOnHas: true,
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (entry) {
            this.cache.set(key, entry);
            return entry.value;
        }
        return null;
    }
    set(key, value, ttl) {
        const entry = {
            key,
            value,
            expiresAt: Date.now() + (ttl || this.cache.ttl),
            createdAt: Date.now(),
            hitCount: 0,
            lastAccessedAt: Date.now(),
        };
        this.cache.set(key, entry, ttl ? ttl * 1000 : undefined);
    }
    del(key) {
        this.cache.delete(key);
    }
    reset() {
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
const cacheConfig = {
    ttl: 3600,
    maxSize: 1000,
    enableMetrics: true,
};
export const cacheManager = new CacheManager(cacheConfig);
