/**
 * Performance monitoring and benchmarking
 */

interface PerformanceMetrics {
  filterTime: number;
  videosProcessed: number;
  cacheHitRate: number;
  memoryUsed: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    filterTime: 0,
    videosProcessed: 0,
    cacheHitRate: 0,
    memoryUsed: 0
  };
  
  private cacheHits = 0;
  private cacheMisses = 0;
  
  /**
   * Measure function execution time
   */
  async measure<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      
      if (name === 'filterVideos') {
        this.metrics.filterTime = duration;
      }
      
      return result;
    } catch (error) {
      console.error(`[Performance] ${name} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Record cache hit/miss
   */
  recordCacheAccess(hit: boolean) {
    if (hit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    
    const total = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
  }
  
  /**
   * Record videos processed
   */
  recordVideosProcessed(count: number) {
    this.metrics.videosProcessed = count;
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    // Estimate memory usage
    if ('memory' in performance) {
      this.metrics.memoryUsed = (performance as any).memory.usedJSHeapSize;
    }
    
    return { ...this.metrics };
  }
  
  /**
   * Log performance report
   */
  logReport() {
    const metrics = this.getMetrics();
    console.group('[Performance Report]');
    console.log(`Filter Time: ${metrics.filterTime.toFixed(2)}ms`);
    console.log(`Videos Processed: ${metrics.videosProcessed}`);
    console.log(`Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%`);
    console.log(`Memory Used: ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Avg Time per Video: ${(metrics.filterTime / metrics.videosProcessed).toFixed(2)}ms`);
    console.groupEnd();
  }
  
  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs = 10000) {
    setInterval(() => {
      this.logReport();
    }, intervalMs);
  }
}