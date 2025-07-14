/**
 * High-performance video cache with memory management
 * Uses WeakMap for automatic garbage collection and LRU for duration cache
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('VideoCache');

interface CacheEntry {
  duration: number;
  timestamp: number;
}

export class VideoCache {
  // WeakMap for automatic garbage collection of video elements
  private elementCache = new WeakMap<Element, boolean>();
  
  // LRU cache for video durations with max size limit
  private durationCache = new Map<string, CacheEntry>();
  private readonly MAX_CACHE_SIZE = 500; // Reduced from 1000
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  
  // Performance tracking
  private hits = 0;
  private misses = 0;
  
  /**
   * Check if a video has been processed
   */
  has(video: Element): boolean {
    const cached = this.elementCache.has(video);
    if (cached) this.hits++;
    else this.misses++;
    return cached;
  }
  
  /**
   * Mark a video as processed
   */
  set(video: Element, hidden: boolean): void {
    this.elementCache.set(video, hidden);
  }
  
  /**
   * Get cached visibility state
   */
  get(video: Element): boolean | undefined {
    return this.elementCache.get(video);
  }
  
  /**
   * Cache video duration with LRU eviction
   */
  setDuration(videoId: string, duration: number): void {
    // Remove oldest entries if cache is full
    if (this.durationCache.size >= this.MAX_CACHE_SIZE) {
      const entriesToRemove = this.durationCache.size - this.MAX_CACHE_SIZE + 1;
      const iterator = this.durationCache.keys();
      
      for (let i = 0; i < entriesToRemove; i++) {
        const oldestKey = iterator.next().value;
        if (oldestKey) {
          this.durationCache.delete(oldestKey);
        }
      }
    }
    
    this.durationCache.set(videoId, {
      duration,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get cached duration with TTL check
   */
  getDuration(videoId: string): number | null {
    const entry = this.durationCache.get(videoId);
    
    if (!entry) {
      return null;
    }
    
    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.durationCache.delete(videoId);
      return null;
    }
    
    // Move to end (LRU behavior)
    this.durationCache.delete(videoId);
    this.durationCache.set(videoId, entry);
    
    return entry.duration;
  }
  
  /**
   * Clear expired entries periodically
   */
  cleanExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.durationCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.durationCache.delete(key));
    
    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned ${keysToDelete.length} expired cache entries`);
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.hits + this.misses > 0 
      ? (this.hits / (this.hits + this.misses)) * 100 
      : 0;
      
    return {
      durationCacheSize: this.durationCache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(1) + '%'
    };
  }
  
  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Clear all caches
   */
  clear(): void {
    this.durationCache.clear();
    this.resetStats();
    logger.info('Cache cleared');
  }
  
  /**
   * Get video data from DOM element
   */
  getVideoData(video: Element): { duration: number } | null {
    // Check if already cached
    const videoId = this.getVideoId(video);
    if (videoId) {
      const cachedDuration = this.getDuration(videoId);
      if (cachedDuration !== null) {
        return { duration: cachedDuration };
      }
    }
    
    // Extract duration from DOM
    const duration = this.parseDuration(video);
    if (duration > 0 && videoId) {
      this.setDuration(videoId, duration);
      return { duration };
    }
    
    return null;
  }
  
  /**
   * Extract video ID from element
   */
  private getVideoId(video: Element): string | null {
    const link = video.querySelector('a#video-title') as HTMLAnchorElement;
    if (!link?.href) return null;
    
    const match = link.href.match(/(?:v=|\/v\/|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] ?? null : null;
  }
  
  /**
   * Parse duration from video element
   */
  private parseDuration(video: Element): number {
    const timeElement = video.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
    if (!timeElement?.textContent) return 0;
    
    const timeText = timeElement.textContent.trim();
    const parts = timeText.split(':').map(p => parseInt(p, 10));
    
    if (parts.length === 3 && parts[0] !== undefined && parts[1] !== undefined && parts[2] !== undefined) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1 && parts[0] !== undefined) {
      // SS
      return parts[0];
    }
    
    return 0;
  }
}

// Singleton instance
export const videoCache = new VideoCache();

// Clean expired entries every 5 minutes
setInterval(() => {
  videoCache.cleanExpiredEntries();
}, 5 * 60 * 1000);