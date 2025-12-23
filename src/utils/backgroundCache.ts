/**
 * Optimized background image caching system
 * Requirements: 7.1 - Background image loading and caching optimization
 */

interface CacheEntry {
  image: HTMLImageElement;
  timestamp: number;
  size: number;
  url: string;
}

interface CacheStats {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  missCount: number;
  hitCount: number;
}

/**
 * Advanced image cache with LRU eviction and size limits
 */
class BackgroundImageCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private maxAge: number;
  private stats: CacheStats = {
    totalSize: 0,
    entryCount: 0,
    hitRate: 0,
    missCount: 0,
    hitCount: 0,
  };

  constructor(maxSize = 50 * 1024 * 1024, maxAge = 30 * 60 * 1000) { // 50MB, 30 minutes
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  /**
   * Preload and cache an image
   */
  async preload(url: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<HTMLImageElement> {
    // Check if already cached and not expired
    const cached = this.get(url);
    if (cached) {
      this.stats.hitCount++;
      this.updateHitRate();
      return cached;
    }

    this.stats.missCount++;
    this.updateHitRate();

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set loading priority
      if ('loading' in img) {
        img.loading = priority === 'high' ? 'eager' : 'lazy';
      }

      // Set decoding for better performance
      if ('decoding' in img) {
        img.decoding = 'async';
      }

      img.onload = () => {
        try {
          this.set(url, img);
          resolve(img);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };

      // Start loading
      img.src = url;
    });
  }

  /**
   * Get cached image
   */
  get(url: string): HTMLImageElement | null {
    const entry = this.cache.get(url);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.delete(url);
      return null;
    }

    // Update access time (LRU)
    entry.timestamp = Date.now();
    this.cache.set(url, entry);

    return entry.image;
  }

  /**
   * Cache an image
   */
  private set(url: string, image: HTMLImageElement): void {
    // Estimate image size (rough approximation)
    const size = this.estimateImageSize(image);

    // Check if we need to evict entries
    this.evictIfNeeded(size);

    const entry: CacheEntry = {
      image,
      timestamp: Date.now(),
      size,
      url,
    };

    this.cache.set(url, entry);
    this.stats.totalSize += size;
    this.stats.entryCount++;
  }

  /**
   * Remove image from cache
   */
  delete(url: string): boolean {
    const entry = this.cache.get(url);
    if (entry) {
      this.cache.delete(url);
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      return true;
    }
    return false;
  }

  /**
   * Clear all cached images
   */
  clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.entryCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Preload multiple images with priority
   */
  async preloadBatch(
    urls: string[], 
    priority: 'high' | 'normal' | 'low' = 'normal',
    concurrency = 3
  ): Promise<(HTMLImageElement | Error)[]> {
    const results: (HTMLImageElement | Error)[] = [];
    
    // Process in batches to avoid overwhelming the browser
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(url => 
        this.preload(url, priority).catch(error => error)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Estimate image size for cache management
   */
  private estimateImageSize(image: HTMLImageElement): number {
    // Rough estimation: width * height * 4 bytes per pixel (RGBA)
    // This is an approximation since we don't have access to actual file size
    const width = image.naturalWidth || image.width || 1024;
    const height = image.naturalHeight || image.height || 768;
    return width * height * 4;
  }

  /**
   * Evict entries if cache is too large
   */
  private evictIfNeeded(newEntrySize: number): void {
    // If adding this entry would exceed max size, evict oldest entries
    while (this.stats.totalSize + newEntrySize > this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }
  }

  /**
   * Evict the oldest (least recently used) entry
   */
  private evictOldest(): void {
    let oldestUrl = '';
    let oldestTime = Date.now();

    for (const [url, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      this.delete(oldestUrl);
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredUrls: string[] = [];

    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        expiredUrls.push(url);
      }
    }

    expiredUrls.forEach(url => this.delete(url));
  }

  /**
   * Check if browser supports WebP format
   */
  static async supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==';
    });
  }

  /**
   * Get optimal image format based on browser support
   */
  static async getOptimalFormat(baseUrl: string): Promise<string> {
    const supportsWebP = await BackgroundImageCache.supportsWebP();
    
    if (supportsWebP && baseUrl.includes('.jpg')) {
      return baseUrl.replace('.jpg', '.webp');
    }
    
    return baseUrl;
  }
}

// Global cache instance
export const backgroundCache = new BackgroundImageCache();

// Cleanup expired entries periodically
setInterval(() => {
  backgroundCache.cleanup();
}, 5 * 60 * 1000); // Every 5 minutes

/**
 * Utility function to preload background images with caching
 */
export const preloadBackgroundImage = async (
  url: string, 
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<HTMLImageElement> => {
  const optimalUrl = await BackgroundImageCache.getOptimalFormat(url);
  return backgroundCache.preload(optimalUrl, priority);
};

/**
 * Utility function to preload multiple background images
 */
export const preloadBackgroundImages = async (
  urls: string[],
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<(HTMLImageElement | Error)[]> => {
  const optimalUrls = await Promise.all(
    urls.map(url => BackgroundImageCache.getOptimalFormat(url))
  );
  
  return backgroundCache.preloadBatch(optimalUrls, priority);
};

/**
 * Get cache statistics for monitoring
 */
export const getCacheStats = (): CacheStats => {
  return backgroundCache.getStats();
};

export default BackgroundImageCache;