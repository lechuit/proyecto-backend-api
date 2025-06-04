import { logger } from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 15 * 60 * 1000; // 15 minutos
  private readonly MAX_ENTRIES = 1000;

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Limpiar cache si está lleno
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });

    logger.debug(`Cache SET: ${key} (TTL: ${ttl}ms, Size: ${this.cache.size})`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      logger.debug(`Cache MISS: ${key}`);
      return null;
    }
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      logger.debug(`Cache EXPIRED: ${key}`);
      return null;
    }
    
    logger.debug(`Cache HIT: ${key}`);
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Cache DELETE: ${key}`);
    }
    return deleted;
  }

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    // Remover entradas expiradas
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    // Si aún está lleno, eliminar entradas más antiguas
    if (this.cache.size >= this.MAX_ENTRIES) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].expiry - b[1].expiry);
      
      const toDelete = entries.slice(0, Math.floor(this.MAX_ENTRIES * 0.2));
      toDelete.forEach(([key]) => this.cache.delete(key));
      
      logger.info(`Cache cleanup: removed ${expiredCount} expired + ${toDelete.length} oldest entries`);
    } else {
      logger.debug(`Cache cleanup: removed ${expiredCount} expired entries`);
    }
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cache cleared: ${size} entries removed`);
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      usage: (this.cache.size / this.MAX_ENTRIES) * 100,
      usageFormatted: `${Math.round((this.cache.size / this.MAX_ENTRIES) * 100)}%`
    };
  }

  // Método para obtener estadísticas detalladas
  getDetailedStats() {
    const now = Date.now();
    let expiredCount = 0;
    let validCount = 0;
    
    for (const [, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        expiredCount++;
      } else {
        validCount++;
      }
    }
    
    return {
      ...this.getStats(),
      validEntries: validCount,
      expiredEntries: expiredCount,
      totalEntries: this.cache.size
    };
  }
}

export const memoryCacheService = new MemoryCacheService();
