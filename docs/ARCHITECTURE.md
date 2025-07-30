# SmartStream Filter Architecture Documentation

## Overview

SmartStream Filter follows Domain-Driven Design (DDD) principles with a clean architecture approach. The system is designed to be extensible, maintainable, and testable.

## Architecture Principles

### 1. Clean Architecture Layers

```
┌─────────────────────────────────────────┐
│          Presentation Layer             │ ← UI Components, Popup
├─────────────────────────────────────────┤
│          Application Layer              │ ← Use Cases, Services
├─────────────────────────────────────────┤
│            Domain Layer                 │ ← Business Logic, Models
├─────────────────────────────────────────┤
│         Infrastructure Layer            │ ← External APIs, Storage
└─────────────────────────────────────────┘
```

### 2. Dependency Rule

Dependencies flow inward:
- Outer layers depend on inner layers
- Inner layers know nothing about outer layers
- Domain layer has no external dependencies

### 3. Separation of Concerns

Each layer has distinct responsibilities:
- **Presentation**: User interface and user interaction
- **Application**: Orchestrates use cases and business workflows
- **Domain**: Core business logic and rules
- **Infrastructure**: Technical implementations and external services

## Core Components

### Domain Layer (`src/core/domain/`)

Contains pure business logic with no external dependencies.

#### Models

```typescript
// Video entity
export class Video {
  constructor(
    public readonly id: string,
    public readonly metadata: VideoMetadata
  ) {}
  
  shouldBeFiltered(filter: Filter): boolean {
    // Business logic for filtering
  }
}

// Filter value object
export class Filter {
  constructor(
    public readonly type: FilterType,
    public readonly criteria: FilterCriteria
  ) {}
  
  matches(video: Video): boolean {
    // Filter matching logic
  }
}
```

### Application Layer (`src/core/application/`)

Contains use cases that orchestrate domain logic.

#### Use Cases

```typescript
export class FilterVideosUseCase {
  constructor(
    private videoRepository: IVideoRepository,
    private eventBus: IEventBus,
    private performanceMonitor: IPerformanceMonitor
  ) {}
  
  async execute(filter: Filter): Promise<void> {
    const videos = await this.videoRepository.findAll();
    const filtered = videos.filter(v => filter.matches(v));
    
    await this.videoRepository.updateVisibility(filtered);
    this.eventBus.emit('videos-filtered', { count: filtered.length });
  }
}
```

### Infrastructure Layer (`src/core/infrastructure/`)

Technical implementations of domain interfaces.

#### Dependency Injection Container

```typescript
export function createContainer(): Container {
  const di = new DIContainer();
  
  // Register services
  di.singleton('eventBus', () => EventBus.getInstance());
  di.singleton('videoRepository', () => new YouTubeAdapter());
  di.singleton('settingsRepository', () => new ChromeStorageRepository());
  
  // Register use cases
  di.singleton('filterVideosUseCase', () => new FilterVideosUseCase(
    di.get('videoRepository'),
    di.get('eventBus'),
    di.get('performanceMonitor')
  ));
  
  return {
    eventBus: di.get('eventBus'),
    filterVideosUseCase: di.get('filterVideosUseCase'),
    // ... other services
  };
}
```

### Adapters Layer (`src/adapters/`)

Platform-specific implementations that adapt external systems to our domain.

#### Platform Adapter Pattern

```typescript
// Abstract adapter
export abstract class BasePlatformAdapter implements IVideoRepository {
  abstract findVideoElements(): Element[];
  abstract extractMetadata(element: Element): VideoMetadata | null;
  
  // Common functionality
  async findAll(): Promise<Video[]> {
    const elements = this.findVideoElements();
    return elements
      .map(el => this.extractMetadata(el))
      .filter(Boolean)
      .map(meta => new Video(meta.id, meta));
  }
}

// Concrete implementation
export class YouTubeAdapter extends BasePlatformAdapter {
  findVideoElements(): Element[] {
    return Array.from(document.querySelectorAll('ytd-video-renderer'));
  }
  
  extractMetadata(element: Element): VideoMetadata | null {
    // YouTube-specific parsing logic
  }
}
```

## Extension Architecture

### Content Script Architecture

```
┌─────────────────────────────────────────┐
│            Content Script               │
│  ┌───────────────────────────────────┐  │
│  │         App Initialization        │  │
│  │  - Container setup                │  │
│  │  - Event listeners                │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │       UI Component Injection      │  │
│  │  - Header controls                │  │
│  │  - Toast notifications            │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │      Video Filter Engine          │  │
│  │  - DOM observation                │  │
│  │  - Filter application             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Background Service Worker

```typescript
// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'VALIDATE_LICENSE':
      handleLicenseValidation(request.data).then(sendResponse);
      return true;
      
    case 'GET_SETTINGS':
      handleGetSettings().then(sendResponse);
      return true;
  }
});

// Lifecycle management
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: 'onboarding.html' });
  }
});
```

## Event-Driven Architecture

### Event Bus Pattern

Central communication hub for decoupled components:

```typescript
export class EventBus implements IEventBus {
  private handlers = new Map<string, Set<Function>>();
  
  emit<T extends AppEvent['type']>(
    type: T,
    data: Extract<AppEvent, { type: T }>
  ): void {
    const handlers = this.handlers.get(type);
    handlers?.forEach(handler => handler(data));
  }
  
  on<T extends AppEvent['type']>(
    type: T,
    handler: (data: Extract<AppEvent, { type: T }>) => void
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    
    this.handlers.get(type)!.add(handler);
    
    // Return unsubscribe function
    return () => this.handlers.get(type)?.delete(handler);
  }
}
```

### Event Flow

```
User Action → UI Component → Use Case → Domain Logic
                ↓                           ↓
            Event Bus ← ← ← ← ← ← ← ← Event Emission
                ↓
          UI Updates / Side Effects
```

## Performance Optimization

### 1. Video Cache

Prevents redundant processing of already-seen videos:

```typescript
export class VideoCache {
  private cache = new Map<string, CachedVideo>();
  private maxSize = 1000;
  
  has(id: string): boolean {
    return this.cache.has(id);
  }
  
  add(video: VideoMetadata): void {
    if (this.cache.size >= this.maxSize) {
      // LRU eviction
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(video.id, {
      metadata: video,
      timestamp: Date.now()
    });
  }
}
```

### 2. Optimized DOM Observer

Efficient mutation observation with debouncing:

```typescript
export class OptimizedObserver {
  private observer: MutationObserver;
  private pendingMutations = new Set<MutationRecord>();
  private processTimer: number | null = null;
  
  observe(target: Element, callback: () => void): void {
    this.observer = new MutationObserver(mutations => {
      mutations.forEach(m => this.pendingMutations.add(m));
      this.scheduleProcess(callback);
    });
    
    this.observer.observe(target, {
      childList: true,
      subtree: true
    });
  }
  
  private scheduleProcess(callback: () => void): void {
    if (this.processTimer) return;
    
    this.processTimer = window.setTimeout(() => {
      this.pendingMutations.clear();
      callback();
      this.processTimer = null;
    }, 100); // Debounce delay
  }
}
```

### 3. Lazy Component Loading

Dynamic imports for on-demand loading:

```typescript
// Lazy load modal components
async function showPaywall(feature: string) {
  const { showPaywallModal } = await import('./ui/components/modals/paywall-modal');
  return showPaywallModal({ feature });
}

// Lazy load heavy services
async function initializeAnalytics() {
  const { Analytics } = await import('./services/analytics');
  return Analytics.getInstance();
}
```

## Security Architecture

### Content Security Policy

Prevents XSS and injection attacks:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'",
    "sandbox": "sandbox allow-scripts; script-src 'self'"
  }
}
```

### Secure Communication

All external API calls use HTTPS with authentication:

```typescript
class SecureAPIClient {
  private async makeRequest(endpoint: string, options: RequestInit) {
    const token = await this.getAuthToken();
    
    return fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'X-Extension-Version': chrome.runtime.getManifest().version
      }
    });
  }
}
```

### Data Validation

Input validation at boundaries:

```typescript
export class LicenseValidator {
  static validate(license: unknown): License {
    if (!isObject(license)) {
      throw new ValidationError('Invalid license format');
    }
    
    if (!isString(license.licenseKey)) {
      throw new ValidationError('Invalid license key');
    }
    
    if (!isValidEmail(license.email)) {
      throw new ValidationError('Invalid email');
    }
    
    return license as License;
  }
}
```

## Testing Strategy

### Unit Testing

Test individual components in isolation:

```typescript
describe('FilterVideosUseCase', () => {
  let useCase: FilterVideosUseCase;
  let mockRepository: jest.Mocked<IVideoRepository>;
  
  beforeEach(() => {
    mockRepository = createMockVideoRepository();
    useCase = new FilterVideosUseCase(mockRepository);
  });
  
  it('should filter videos by duration', async () => {
    const filter = new DurationFilter(60, 300);
    mockRepository.findAll.mockResolvedValue([
      new Video('1', { duration: 30 }),
      new Video('2', { duration: 120 }),
      new Video('3', { duration: 400 })
    ]);
    
    await useCase.execute(filter);
    
    expect(mockRepository.updateVisibility).toHaveBeenCalledWith([
      expect.objectContaining({ id: '2' })
    ]);
  });
});
```

### Integration Testing

Test component interactions:

```typescript
describe('YouTube Integration', () => {
  let adapter: YouTubeAdapter;
  
  beforeEach(async () => {
    await setupTestDOM();
    adapter = new YouTubeAdapter();
  });
  
  it('should find and parse video elements', () => {
    const videos = adapter.findAll();
    
    expect(videos).toHaveLength(3);
    expect(videos[0].metadata.duration).toBe(180);
  });
});
```

## Deployment Architecture

### Build Pipeline

```bash
# Development
npm run dev → Vite Dev Server → Hot Module Replacement

# Production
npm run build → TypeScript Compilation → Vite Build → Minification → dist/
```

### Release Process

1. Version bump in `manifest.json` and `package.json`
2. Build production bundle: `./build.sh --production`
3. Create GitHub release with changelog
4. Upload to Chrome Web Store
5. Update documentation

## Future Architecture Considerations

### Planned Improvements

1. **Multi-Platform Support**
   - Abstract platform detection
   - Plugin-based adapter system
   - Shared UI components

2. **Microservices Backend**
   - Separate auth service
   - License management service
   - Analytics service

3. **Performance Enhancements**
   - Web Workers for heavy processing
   - IndexedDB for large data sets
   - Service Worker caching

4. **Testing Infrastructure**
   - E2E testing with Puppeteer
   - Visual regression testing
   - Performance benchmarking

---

For implementation details, see the source code and API documentation.