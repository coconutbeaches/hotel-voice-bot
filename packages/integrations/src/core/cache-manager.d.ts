import { CacheConfig } from '@hotel-voice-bot/shared';
export declare class CacheManager {
    private cache;
    constructor(config: CacheConfig);
    get<T>(key: string): T | null;
    set<T>(key: string, value: T, ttl?: number): void;
    del(key: string): void;
    reset(): void;
    getStats(): {
        itemCount: any;
        hits: any;
        misses: any;
        maxSize: any;
    };
}
export declare const cacheManager: CacheManager;
