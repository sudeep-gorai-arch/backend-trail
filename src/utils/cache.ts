import NodeCache from "node-cache";

class CacheManager {
    private cache: NodeCache;

    constructor() {
        this.cache = new NodeCache({
            stdTTL: 60 * 10, // 10 minutes
            checkperiod: 120,
            useClones: false,
        });
    }

    /**
     * Get cached value
     */
    get<T>(key: string): T | undefined {
        return this.cache.get<T>(key);
    }

    /**
     * Store value
     */
    set<T>(
        key: string,
        value: T,
        ttl?: number
    ): boolean {
        if (ttl) {
            return this.cache.set(key, value, ttl);
        }

        return this.cache.set(key, value);
    }

    /**
     * Remove one key
     */
    del(key: string): number {
        return this.cache.del(key);
    }

    /**
     * Remove multiple keys
     */
    delMany(keys: string[]): number {
        return this.cache.del(keys);
    }

    /**
     * Remove everything
     */
    flush(): void {
        this.cache.flushAll();
    }

    /**
     * Check key exists
     */
    has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Cache statistics
     */
    stats() {
        return this.cache.getStats();
    }

    /**
     * Get all cache keys
     */
    keys(): string[] {
        return this.cache.keys();
    }

    /**
     * Delete keys starting with prefix
     */
    clearByPrefix(prefix: string) {
        const keys = this.cache.keys();

        const matched = keys.filter((key) =>
            key.startsWith(prefix)
        );

        if (matched.length) {
            this.cache.del(matched);
        }
    }

    /**
     * Remember helper
     * Returns cached value or executes callback.
     */
    async remember<T>(
        key: string,
        ttl: number,
        callback: () => Promise<T>
    ): Promise<T> {
        const cached = this.get<T>(key);

        if (cached !== undefined) {
            return cached;
        }

        const value = await callback();

        this.set(key, value, ttl);

        return value;
    }
}

export const cache = new CacheManager();

export default cache;