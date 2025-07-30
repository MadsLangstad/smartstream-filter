# SmartStream Filter - AI Assistant Context

This document provides essential context for AI assistants working with the SmartStream Filter codebase.

## Project Overview

SmartStream Filter is a Chrome extension for filtering YouTube content with advanced features and Stripe payment integration. It follows clean architecture principles with domain-driven design.

## Architecture Summary

```
src/
├── adapters/          # Platform-specific implementations (YouTube, etc.)
├── background/        # Service worker for extension lifecycle
├── content/          # Content scripts injected into web pages
├── core/             # Business logic (DDD)
│   ├── application/  # Use cases
│   ├── domain/       # Domain models
│   └── infrastructure/ # Technical implementations
├── services/         # Application services
│   ├── paywall/      # License & payment management
│   └── stripe/       # Stripe payment integration
└── ui/               # UI components and modals
```

## Key Patterns & Conventions

### 1. Singleton Services
Most services use singleton pattern:
```typescript
const stripeService = StripeService.getInstance();
const paywallManager = PaywallManager.getInstance();
```

### 2. Event-Driven Communication
Use EventBus for decoupled communication:
```typescript
eventBus.emit('filter-changed', { filter });
eventBus.on('license-updated', (data) => { /* handle */ });
```

### 3. Error Handling
Always use typed responses:
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; };
}
```

### 4. Async/Await Pattern
Prefer async/await over promises:
```typescript
try {
  const result = await service.method();
  if (!result.success) throw new Error(result.error?.message);
  // handle success
} catch (error) {
  logger.error('Operation failed:', error);
}
```

## Core Services

### StripeService (`src/services/stripe/stripe-service.ts`)
- Handles payment processing
- Creates checkout sessions
- Validates licenses
- Key methods: `createCheckoutSession()`, `validateLicense()`

### PaywallManager (`src/services/paywall/paywall-manager.ts`)
- Manages feature access control
- Handles authentication flow
- Caches license validation
- Key methods: `checkFeatureAccess()`, `requirePremium()`

### YouTubeAdapter (`src/adapters/youtube/youtube-adapter.ts`)
- Finds video elements on page
- Extracts video metadata
- Injects UI controls
- Implements platform-specific logic

## Important Files

- `manifest.json` - Extension configuration
- `build.sh` - Build script with environment handling
- `src/config/stripe.config.ts` - Stripe configuration
- `src/core/infrastructure/container.ts` - Dependency injection setup

## Common Tasks

### Adding a New Feature
1. Check feature access: `await paywallManager.checkFeatureAccess('feature_name')`
2. Implement in appropriate layer (domain/application/ui)
3. Add event emissions for state changes
4. Update TypeScript types

### Modifying Payment Flow
1. Update `StripeService` for API changes
2. Modify `PaywallManager` for feature access
3. Update UI modals in `src/ui/components/modals/`
4. Test with demo mode (auth token starting with 'demo-token')

### Adding Platform Support
1. Create new adapter extending `BasePlatformAdapter`
2. Implement abstract methods for platform
3. Register in DI container
4. Add host permissions in manifest

## Security Considerations

- Never log sensitive data (licenses, tokens, emails)
- Always validate external inputs
- Use HTTPS for all API calls
- Implement proper CSP headers
- Store auth tokens securely in chrome.storage

## Testing Approach

- Unit test domain logic and use cases
- Mock external dependencies
- Test adapters with DOM fixtures
- Use demo mode for payment testing

## Build & Deploy

```bash
# Development
npm run dev

# Production build
./build.sh --production

# Type check
npm run typecheck

# Lint
npm run lint
```

## Performance Notes

- Videos are cached to prevent reprocessing
- DOM observations are debounced
- UI components are lazy-loaded
- Heavy operations use performance monitoring

## Common Pitfalls

1. **Forgetting async initialization**: Always `await paywallManager.waitForInit()`
2. **Direct DOM manipulation**: Use adapters for platform-specific code
3. **Synchronous storage access**: Chrome storage is async
4. **Hardcoded URLs**: Use config files for API endpoints
5. **Missing error handling**: Always handle API failures

## Environment Variables

Set in `.env` file:
- `VITE_API_URL` - Backend API endpoint
- `STRIPE_PUBLISHABLE_KEY` - Stripe public key

## License Types

- **free**: Basic duration filtering only
- **basic**: Advanced filters, custom presets
- **pro**: Keywords, channels, analytics, API
- **lifetime**: Everything + source code access

## Key Dependencies

- TypeScript - Type safety
- Vite - Build tool
- Tailwind CSS - Styling
- Chrome Extensions API - Browser integration

## Quick Command Reference

```typescript
// Check premium feature
if (await paywallManager.requirePremium('advanced_filters')) {
  // Feature available
}

// Show toast notification
showSuccessToast('Operation completed');

// Emit event
eventBus.emit('videos-filtered', { count: 10 });

// Validate license
const isValid = await paywallManager.validateLicense();
```

---

When working with this codebase:
- Follow existing patterns and conventions
- Maintain clean architecture boundaries
- Add proper error handling
- Update types when changing interfaces
- Test with both free and premium modes