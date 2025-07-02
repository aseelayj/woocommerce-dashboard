interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Clear entries matching pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check expiry
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Get multiple values at once
  getMultiple<T>(keys: string[]): (T | null)[] {
    return keys.map(key => this.get<T>(key));
  }

  // Set multiple values at once
  setMultiple(items: { key: string; data: any; ttl?: number }[]): void {
    items.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }
}

export const apiCache = new CacheManager();