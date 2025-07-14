/**
 * Dependency Injection Container
 */

import { EventBus } from './event-bus';
import { FilterVideosUseCase } from '../application/filter-videos-use-case';
import { YouTubeAdapter } from '../../adapters/youtube/youtube-adapter';
import { ChromeStorageRepository } from './chrome-storage-repository';
import { PerformanceMonitor } from '../../utils/performance-monitor';
import { IVideoRepository, ISettingsRepository } from '../../shared/interfaces/repositories';
import { IEventBus } from '../../shared/interfaces/event-bus';
import { IPerformanceMonitor } from '../../shared/interfaces/performance';

export interface Container {
  // Infrastructure
  eventBus: IEventBus;
  performanceMonitor: IPerformanceMonitor;
  
  // Repositories
  videoRepository: IVideoRepository;
  settingsRepository: ISettingsRepository;
  
  // Use Cases
  filterVideosUseCase: FilterVideosUseCase;
  
  // Platform Adapters
  currentAdapter: BasePlatformAdapter;
}

class DIContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  register<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  get<T>(name: string): T {
    if (!this.services.has(name)) {
      const factory = this.factories.get(name);
      if (!factory) {
        throw new Error(`Service ${name} not registered`);
      }
      this.services.set(name, factory());
    }
    return this.services.get(name);
  }

  // Singleton helper
  singleton<T>(name: string, factory: () => T): void {
    this.register(name, () => {
      if (!this.services.has(name)) {
        this.services.set(name, factory());
      }
      return this.services.get(name);
    });
  }
}

// Create and configure container
export function createContainer(): Container {
  const di = new DIContainer();

  // Register singletons
  di.singleton('eventBus', () => EventBus.getInstance());
  di.singleton('performanceMonitor', () => new PerformanceMonitor());
  
  // Register platform adapter based on current site
  di.singleton('videoRepository', () => {
    const hostname = window.location.hostname;
    if (hostname.includes('youtube.com')) {
      return new YouTubeAdapter();
    }
    // Add more adapters as needed
    throw new Error(`No adapter for ${hostname}`);
  });

  di.singleton('settingsRepository', () => new ChromeStorageRepository());

  // Register use cases
  di.singleton('filterVideosUseCase', () => new FilterVideosUseCase(
    di.get('videoRepository'),
    di.get('eventBus'),
    di.get('performanceMonitor')
  ));

  // Return typed container
  return {
    eventBus: di.get('eventBus'),
    performanceMonitor: di.get('performanceMonitor'),
    videoRepository: di.get('videoRepository'),
    settingsRepository: di.get('settingsRepository'),
    filterVideosUseCase: di.get('filterVideosUseCase'),
    currentAdapter: di.get('videoRepository')
  };
}