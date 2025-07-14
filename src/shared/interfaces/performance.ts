/**
 * Performance monitoring interface
 */

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsed: number;
  itemsProcessed: number;
}

export interface IPerformanceMonitor {
  measure<T>(name: string, fn: () => T | Promise<T>): Promise<T>;
  recordMetric(name: string, value: number): void;
  getMetrics(): PerformanceMetrics;
  startTransaction(name: string): () => void;
}