/**
 * Retry utility for handling transient failures
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error) => {
    // Retry on network errors and 5xx status codes
    if (error.code === 'NETWORK_ERROR') return true;
    if (error.status >= 500 && error.status < 600) return true;
    if (error.message?.includes('fetch failed')) return true;
    return false;
  },
  onRetry: () => {}
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error;
      }
      
      opts.onRetry(attempt, error);
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Create a fetch wrapper with automatic retry
 */
export function createRetryFetch(options?: RetryOptions) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    return withRetry(
      async () => {
        try {
          const response = await fetch(url, init);
          
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            return response;
          }
          
          // Throw on server errors to trigger retry
          if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            (error as any).status = response.status;
            throw error;
          }
          
          return response;
        } catch (error) {
          // Wrap network errors
          if (error instanceof TypeError && error.message.includes('fetch')) {
            const netError = new Error('Network error');
            (netError as any).code = 'NETWORK_ERROR';
            (netError as any).originalError = error;
            throw netError;
          }
          throw error;
        }
      },
      options
    );
  };
}