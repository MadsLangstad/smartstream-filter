# SmartStream Filter - Clean Architecture

## 🏗️ Architecture Overview

This project follows **Clean Architecture** principles with a hexagonal (ports & adapters) pattern.

```
┌─────────────────────────────────────────────────────┐
│                   Presentation Layer                 │
│  (Popup UI, Content Scripts, Header Controls)       │
├─────────────────────────────────────────────────────┤
│                  Application Layer                   │
│  (Use Cases: FilterVideos, SaveSettings, etc.)      │
├─────────────────────────────────────────────────────┤
│                    Domain Layer                      │
│  (Entities: Video, Filter, User)                    │
├─────────────────────────────────────────────────────┤
│                 Infrastructure Layer                 │
│  (Adapters, Repositories, External Services)        │
└─────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
src/
├── core/
│   ├── domain/           # Business entities & logic
│   │   ├── video.ts      # Video entity
│   │   └── filter.ts     # Filter logic
│   ├── application/      # Use cases
│   │   └── filter-videos-use-case.ts
│   └── infrastructure/   # Framework & external concerns
│       ├── event-bus.ts
│       ├── container.ts  # DI container
│       └── chrome-storage-repository.ts
├── adapters/            # Platform-specific adapters
│   ├── base-adapter.ts
│   └── youtube/
│       └── youtube-adapter.ts
├── features/            # Feature modules
│   └── filtering/
│       └── header-controls.ts
├── shared/              # Shared interfaces & types
│   └── interfaces/
│       ├── repositories.ts
│       ├── event-bus.ts
│       └── performance.ts
└── content/            # Entry points
    └── app.ts          # Main application
```

## 🔑 Key Concepts

### 1. **Domain Layer**
- Contains business logic independent of any framework
- Entities like `Video` and `Filter` 
- No dependencies on external libraries

### 2. **Application Layer**
- Use cases orchestrate the flow of data
- `FilterVideosUseCase` handles the filtering logic
- Depends only on domain layer

### 3. **Infrastructure Layer**
- Implements interfaces defined in domain/application layers
- Handles external concerns (storage, DOM, etc.)
- Can be swapped out without affecting business logic

### 4. **Adapters**
- Platform-specific implementations
- `YouTubeAdapter`, `SpotifyAdapter`, etc.
- Inherit from `BasePlatformAdapter`

## 🔄 Data Flow

1. **User Action** → Header Controls
2. **UI Event** → Application Layer (Use Case)
3. **Use Case** → Domain Logic (Filters)
4. **Domain Result** → Infrastructure (Repository)
5. **Side Effects** → Event Bus → UI Update

## 🧩 Adding New Features

### Adding a New Platform (e.g., Netflix)

1. Create adapter:
```typescript
// src/adapters/netflix/netflix-adapter.ts
export class NetflixAdapter extends BasePlatformAdapter {
  getPlatformName(): string { return 'netflix'; }
  findVideoElements(): Element[] { /* ... */ }
  extractMetadata(element: Element): VideoMetadata { /* ... */ }
}
```

2. Register in container:
```typescript
// src/core/infrastructure/container.ts
if (hostname.includes('netflix.com')) {
  return new NetflixAdapter();
}
```

### Adding a New Filter Type

1. Create filter in domain:
```typescript
// src/core/domain/filter.ts
export class KeywordFilter extends Filter {
  matches(video: Video): boolean {
    return this.criteria.keywords?.some(keyword => 
      video.metadata.title.toLowerCase().includes(keyword.toLowerCase())
    ) ?? true;
  }
}
```

2. Add to composite filter:
```typescript
if (this.criteria.keywords?.length) {
  this.filters.push(new KeywordFilter(this.criteria));
}
```

## 🧪 Testing Strategy

### Unit Tests
- Domain logic (filters, entities)
- Use cases with mocked dependencies
- Individual adapters

### Integration Tests
- Repository implementations
- Event bus communication
- Platform adapter integration

### E2E Tests
- Full user flows
- Cross-platform compatibility
- Performance benchmarks

## 🚀 Migration from Old Architecture

### Phase 1: Parallel Implementation ✅
- New architecture runs alongside old code
- Gradual migration of features

### Phase 2: Feature Parity
- Ensure all features work in new architecture
- Performance testing
- Bug fixes

### Phase 3: Cleanup
- Remove old `youtube-header.ts`
- Update all imports
- Documentation updates

## 📊 Benefits

1. **Testability**: Each layer can be tested independently
2. **Maintainability**: Clear separation of concerns
3. **Scalability**: Easy to add new platforms/features
4. **Flexibility**: Can swap implementations without changing business logic
5. **Performance**: Better caching and optimization strategies

## 🔧 Development Guidelines

1. **Dependency Rule**: Dependencies only point inward
2. **Interface Segregation**: Small, focused interfaces
3. **Single Responsibility**: Each class has one reason to change
4. **Open/Closed**: Open for extension, closed for modification
5. **DRY**: Don't repeat yourself - use composition

## 📚 Further Reading

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)