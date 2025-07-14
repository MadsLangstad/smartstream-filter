/**
 * High-performance video caching system
 */

interface CachedVideo {
  element: Element;
  duration: number;
  title: string;
  timestamp: number;
}

export class VideoCache {
  private cache = new WeakMap<Element, CachedVideo>();
  private durationCache = new Map<string, number>();
  
  /**
   * Get cached video data or parse and cache it
   */
  getVideoData(element: Element): CachedVideo | null {
    // Check if we already have this video cached
    const cached = this.cache.get(element);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
      return cached;
    }
    
    // Parse video data
    const durationElement = element.querySelector(
      'span.ytd-thumbnail-overlay-time-status-renderer, ' +
      'ytd-thumbnail-overlay-time-status-renderer'
    );
    
    if (!durationElement) return null;
    
    const durationText = durationElement.textContent?.trim() || '';
    const duration = this.parseDuration(durationText);
    
    const titleElement = element.querySelector('#video-title');
    const title = titleElement?.textContent?.trim() || '';
    
    // Cache the parsed data
    const videoData: CachedVideo = {
      element,
      duration,
      title,
      timestamp: Date.now()
    };
    
    this.cache.set(element, videoData);
    return videoData;
  }
  
  /**
   * Parse duration with caching
   */
  private parseDuration(durationText: string): number {
    // Check duration cache first
    if (this.durationCache.has(durationText)) {
      return this.durationCache.get(durationText)!;
    }
    
    const cleanText = durationText.trim().split('\n')[0].trim();
    const parts = cleanText.split(':').map(p => parseInt(p));
    
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      seconds = parts[0];
    }
    
    // Cache the parsed duration
    this.durationCache.set(durationText, seconds);
    return seconds;
  }
  
  /**
   * Clear old cache entries
   */
  cleanup() {
    // WeakMap cleans itself, but we should clear duration cache
    if (this.durationCache.size > 1000) {
      this.durationCache.clear();
    }
  }
}