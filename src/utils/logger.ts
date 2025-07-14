/**
 * Logger utility for SmartStream Filter
 * Provides environment-aware logging with proper production handling
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LoggerConfig {
  level: LogLevel;
  prefix: string;
  enableInProduction: boolean;
}

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.isDevelopment = process.env['NODE_ENV'] === 'development' || 
                         (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version_name?.includes('dev')) ||
                         false;
    
    this.config = {
      level: this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR,
      prefix: '[SSF]',
      enableInProduction: false,
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment && !this.config.enableInProduction) {
      return false;
    }
    return level >= this.config.level;
  }

  private formatMessage(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const prefix = `${this.config.prefix} [${timestamp}] [${level}]`;
    
    switch (level) {
      case 'DEBUG':
      case 'INFO':
        console.log(prefix, message, ...args);
        break;
      case 'WARN':
        console.warn(prefix, message, ...args);
        break;
      case 'ERROR':
        console.error(prefix, message, ...args);
        break;
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.formatMessage('DEBUG', message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.formatMessage('INFO', message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.formatMessage('WARN', message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.formatMessage('ERROR', message, ...args);
    }
  }

  // Performance logging (always enabled in development)
  performance(operation: string, duration: number): void {
    if (this.isDevelopment) {
      this.formatMessage('PERF', `${operation} took ${duration.toFixed(2)}ms`);
    }
  }

  // Group logging for better organization
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(`${this.config.prefix} ${label}`);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for specific module loggers
export const createLogger = (prefix: string, config?: Partial<LoggerConfig>) => {
  return new Logger({ prefix: `[SSF:${prefix}]`, ...config });
};