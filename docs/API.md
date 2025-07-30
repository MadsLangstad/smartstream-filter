# SmartStream Filter API Documentation

Complete API reference for SmartStream Filter services and components.

## Table of Contents

- [Core Services](#core-services)
  - [StripeService](#stripeservice)
  - [PaywallManager](#paywallmanager)
  - [FeatureManager](#featuremanager)
- [Domain Models](#domain-models)
- [Platform Adapters](#platform-adapters)
- [UI Components](#ui-components)
- [Event System](#event-system)
- [Storage API](#storage-api)
- [Error Handling](#error-handling)

## Core Services

### StripeService

Singleton service for handling Stripe payment operations.

#### Methods

##### `createCheckoutSession(options: CreateCheckoutOptions): Promise<APIResponse<CheckoutSession>>`

Creates a Stripe checkout session for subscription purchase.

**Parameters:**
```typescript
interface CreateCheckoutOptions {
  planId: 'basic' | 'pro' | 'lifetime';
  email: string;
  userId?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}
```

**Returns:**
```typescript
interface CheckoutSession {
  sessionId: string;
  url: string;
  plan: string;
  amount: number;
  currency: string;
}
```

**Example:**
```typescript
const stripeService = StripeService.getInstance();
const result = await stripeService.createCheckoutSession({
  planId: 'pro',
  email: 'user@example.com'
});

if (result.success) {
  window.open(result.data.url);
}
```

##### `validateLicense(licenseKey: string, authToken: string): Promise<APIResponse<LicenseValidationResult>>`

Validates a license key with the server.

**Parameters:**
- `licenseKey`: The license key to validate
- `authToken`: User authentication token

**Returns:**
```typescript
interface LicenseValidationResult {
  valid: boolean;
  license?: {
    email: string;
    productId: string;
    status: string;
    devices: number;
  };
  error?: string;
}
```

##### `verifyPaymentSuccess(sessionId: string): Promise<APIResponse<PaymentVerification>>`

Verifies payment completion after checkout redirect.

**Returns:**
```typescript
interface PaymentVerification {
  success: boolean;
  email?: string;
  licenseKey?: string;
  authToken?: string;
}
```

### PaywallManager

Manages authentication, licensing, and feature access control.

#### Properties

- `user: User | null` - Current authenticated user
- `license: License | null` - Current license information

#### Methods

##### `checkFeatureAccess(feature: string): Promise<boolean>`

Checks if user has access to a feature without showing UI.

**Parameters:**
- `feature`: Feature identifier (e.g., 'advanced_filters', 'keyword_filters')

**Returns:** `boolean` - true if user has access

**Example:**
```typescript
const paywallManager = PaywallManager.getInstance();
const hasAccess = await paywallManager.checkFeatureAccess('keyword_filters');
```

##### `requirePremium(feature: string): Promise<boolean>`

Checks access and shows paywall UI if needed.

**Parameters:**
- `feature`: Feature identifier

**Returns:** `boolean` - true if access granted after UI interaction

##### `validateLicense(): Promise<boolean>`

Validates the current license with the server.

**Returns:** `boolean` - true if license is valid

##### `setLicenseInfo(info: LicenseInfo): Promise<void>`

Updates license information after purchase.

**Parameters:**
```typescript
interface LicenseInfo {
  licenseKey: string;
  authToken: string;
  email: string;
}
```

##### `logout(): Promise<void>`

Clears authentication and reloads the page.

### FeatureManager

Controls feature flags and premium feature access.

#### Methods

##### `isFeatureEnabled(feature: string): boolean`

Checks if a feature is enabled.

**Feature Keys:**
- `durationFilter` - Basic duration filtering (free)
- `advancedFilters` - Advanced filtering options
- `keywordFilters` - Filter by keywords
- `channelFilters` - Filter by channel
- `analytics` - Usage analytics
- `apiAccess` - API access

## Domain Models

### Video

```typescript
interface VideoMetadata {
  id: string;
  title: string;
  duration: number; // in seconds
  channel?: string;
  channelName?: string;
  viewCount?: number;
  uploadDate?: Date;
  platform: string;
}
```

### Filter

```typescript
interface Filter {
  type: 'duration' | 'keyword' | 'channel';
  enabled: boolean;
  criteria: FilterCriteria;
}

interface DurationFilterCriteria {
  min: number; // seconds
  max: number; // seconds
}
```

### License

```typescript
interface License {
  licenseKey: string;
  email: string;
  productId: string;
  plan: 'free' | 'basic' | 'pro' | 'lifetime';
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  features: string[];
  validUntil?: string;
  devices: number;
}
```

## Platform Adapters

### BasePlatformAdapter

Abstract base class for platform-specific implementations.

```typescript
abstract class BasePlatformAdapter {
  abstract getPlatformName(): string;
  abstract findVideoElements(): Element[];
  abstract extractMetadata(element: Element): VideoMetadata | null;
  abstract injectControls(container: Element): void;
  
  // Shared functionality
  protected generateId(element: Element): string;
  shouldHideVideo(video: VideoMetadata, filter: Filter): boolean;
}
```

### YouTubeAdapter

YouTube-specific implementation.

```typescript
class YouTubeAdapter extends BasePlatformAdapter {
  getPlatformName(): string; // Returns 'youtube'
  findVideoElements(): Element[]; // Finds video elements
  extractMetadata(element: Element): VideoMetadata | null;
  injectControls(container: Element): void;
}
```

## UI Components

### Toast Notifications

```typescript
// Success toast
showSuccessToast(message: string, duration?: number): void;

// Error toast
showErrorToast(message: string, duration?: number): void;

// Info toast
showInfoToast(message: string, duration?: number): void;
```

### Modal Components

#### AuthModal

```typescript
interface AuthModalOptions {
  title?: string;
  message?: string;
}

showAuthModal(options?: AuthModalOptions): Promise<{
  success: boolean;
  email?: string;
  token?: string;
}>;
```

#### PaywallModal

```typescript
interface PaywallModalOptions {
  feature: string;
  plans: PlanDetails[];
  currentPlan: string;
}

showPaywallModal(options: PaywallModalOptions): Promise<{
  action: 'upgrade' | 'cancel';
  planId?: string;
}>;
```

## Event System

### EventBus

Central event system for decoupled communication.

```typescript
class EventBus {
  emit<T extends AppEvent['type']>(
    type: T,
    data: Extract<AppEvent, { type: T }>
  ): void;
  
  on<T extends AppEvent['type']>(
    type: T,
    handler: (data: Extract<AppEvent, { type: T }>) => void
  ): () => void;
}
```

### Event Types

```typescript
type AppEvent = 
  | { type: 'filter-changed'; filter: Filter }
  | { type: 'videos-filtered'; count: number }
  | { type: 'license-updated'; licensed: boolean; plan: string }
  | { type: 'error'; error: Error; context?: string };
```

## Storage API

### ChromeStorageRepository

Handles persistent storage using Chrome Storage API.

```typescript
class ChromeStorageRepository {
  // Get settings
  async getSettings(): Promise<AppSettings>;
  
  // Save settings
  async saveSettings(settings: Partial<AppSettings>): Promise<void>;
  
  // Get specific key
  async get<T>(key: string): Promise<T | null>;
  
  // Set specific key
  async set<T>(key: string, value: T): Promise<void>;
}
```

### Storage Schema

```typescript
interface StorageSchema {
  // User preferences
  settings: AppSettings;
  
  // Authentication
  authToken?: string;
  licenseKey?: string;
  userEmail?: string;
  
  // License cache
  license?: License;
  
  // Device identification
  deviceId: string;
  
  // Feature flags
  features?: Record<string, boolean>;
}
```

## Error Handling

### Error Types

```typescript
// API errors
interface APIError {
  code: string;
  message: string;
  details?: any;
}

// Response wrapper
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
}
```

### Error Codes

- `AUTH_REQUIRED` - Authentication needed
- `INVALID_LICENSE` - License validation failed
- `PAYMENT_FAILED` - Payment processing error
- `NETWORK_ERROR` - Network request failed
- `VALIDATION_ERROR` - Input validation error

### Error Handling Example

```typescript
try {
  const result = await stripeService.createCheckoutSession(options);
  
  if (!result.success) {
    switch (result.error?.code) {
      case 'AUTH_REQUIRED':
        await paywallManager.showAuthFlow();
        break;
      case 'PAYMENT_FAILED':
        showErrorToast('Payment failed. Please try again.');
        break;
      default:
        showErrorToast(result.error?.message || 'An error occurred');
    }
    return;
  }
  
  // Handle success
  window.open(result.data.url);
} catch (error) {
  logger.error('Unexpected error:', error);
  showErrorToast('Something went wrong. Please try again.');
}
```

## Best Practices

### Singleton Usage

Most services use singleton pattern:

```typescript
// Get singleton instance
const stripeService = StripeService.getInstance();
const paywallManager = PaywallManager.getInstance();
const eventBus = EventBus.getInstance();
```

### Async Operations

Always use async/await with proper error handling:

```typescript
async function performAction() {
  try {
    await paywallManager.waitForInit();
    const hasAccess = await paywallManager.checkFeatureAccess('feature');
    
    if (!hasAccess) {
      return;
    }
    
    // Perform action
  } catch (error) {
    logger.error('Action failed:', error);
  }
}
```

### Type Safety

Use TypeScript types for all API interactions:

```typescript
import type { 
  VideoMetadata, 
  Filter, 
  License 
} from '@/types';
```

---

For more examples and implementation details, see the source code in the `src/` directory.