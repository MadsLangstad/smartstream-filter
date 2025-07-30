# SmartStream Filter - Comprehensive Documentation

A powerful Chrome extension for filtering YouTube content with advanced features and a robust monetization system. Built with TypeScript, modern web standards, and a clean architecture.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation & Setup](#installation--setup)
- [Development Guide](#development-guide)
- [API Documentation](#api-documentation)
- [Key Features](#key-features)
- [System Design](#system-design)
- [Security & Privacy](#security--privacy)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Overview

SmartStream Filter is a browser extension that enhances your YouTube experience by providing advanced filtering capabilities. It features:

- 🎯 **Real-time Duration Filtering**: Filter videos by min/max duration
- 💳 **Stripe Integration**: Complete payment system with subscriptions
- 🏗️ **Clean Architecture**: Domain-driven design with clear separation
- 🔐 **License Management**: Device-based licensing system
- 🎨 **Native UI Integration**: Seamless YouTube header integration
- 📊 **Performance Optimized**: Efficient DOM manipulation and caching

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────┬───────────────────┬──────────────────────┤
│  Content Script │  Background Worker │    Popup Interface   │
├─────────────────┴───────────────────┴──────────────────────┤
│                    Core Business Logic                       │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │  Adapters  │  │  Use Cases  │  │  Domain Models   │    │
│  └────────────┘  └─────────────┘  └──────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                      │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │ Storage    │  │  Event Bus  │  │  DI Container    │    │
│  └────────────┘  └─────────────┘  └──────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   External API   │
                    │  (Stripe/Auth)   │
                    └─────────────────┘
```

### Directory Structure

```
src/
├── adapters/           # Platform-specific implementations
│   ├── base-adapter.ts # Abstract base class
│   └── youtube/        # YouTube-specific adapter
├── background/         # Service worker
├── config/            # Configuration files
├── content/           # Content scripts
├── core/              # Core business logic (DDD)
│   ├── application/   # Use cases
│   ├── domain/        # Domain models
│   └── infrastructure/# Technical implementations
├── services/          # Application services
│   ├── paywall/       # License & payment management
│   └── stripe/        # Stripe integration
├── ui/                # UI components
│   └── components/    # Reusable UI elements
└── utils/             # Utility functions
```

## Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- Chrome browser (latest version)
- Stripe account (for payment processing)
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/smartstream-filter.git
cd smartstream-filter

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration:
# VITE_API_URL=http://localhost:3001/api/v1
# STRIPE_PUBLISHABLE_KEY=pk_test_...

# Build the extension
./build.sh

# For development with hot reload
npm run dev
```

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder from your project

## Development Guide

### Build System

The project uses Vite for fast builds and TypeScript for type safety:

```bash
# Development build with source maps
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

### Key Technologies

- **TypeScript**: Type-safe development
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first styling
- **Chrome Extensions API**: Browser integration
- **Stripe API**: Payment processing

### Code Standards

- Follow TypeScript best practices
- Use async/await over promises
- Implement proper error handling
- Add JSDoc comments for public APIs
- Follow the existing code style

## API Documentation

### StripeService

Handles all payment-related operations.

```typescript
class StripeService {
  /**
   * Create a Stripe checkout session
   * @param options - Checkout configuration
   * @returns Checkout session details or error
   */
  async createCheckoutSession(options: CreateCheckoutOptions): Promise<APIResponse<CheckoutSession>>

  /**
   * Validate a license key
   * @param licenseKey - The license key to validate
   * @param authToken - User authentication token
   * @returns Validation result
   */
  async validateLicense(licenseKey: string, authToken: string): Promise<APIResponse<LicenseValidationResult>>

  /**
   * Create customer portal session
   * @returns Portal URL
   */
  async createPortalSession(): Promise<APIResponse<{ url: string }>>
}
```

### PaywallManager

Manages licensing, authentication, and feature access.

```typescript
class PaywallManager {
  /**
   * Check if user has access to a feature
   * @param feature - Feature identifier
   * @returns true if user has access
   */
  async checkFeatureAccess(feature: string): Promise<boolean>

  /**
   * Require premium access for a feature
   * @param feature - Feature identifier
   * @returns true if access granted
   */
  async requirePremium(feature: string): Promise<boolean>

  /**
   * Validate current license
   * @returns true if license is valid
   */
  async validateLicense(): Promise<boolean>
}
```

### YouTubeAdapter

Platform-specific implementation for YouTube.

```typescript
class YouTubeAdapter extends BasePlatformAdapter {
  /**
   * Find all video elements on the page
   * @returns Array of video elements
   */
  findVideoElements(): Element[]

  /**
   * Extract metadata from a video element
   * @param element - Video DOM element
   * @returns Video metadata or null
   */
  extractMetadata(element: Element): VideoMetadata | null

  /**
   * Inject filter controls into the page
   * @param container - Control container element
   */
  injectControls(container: Element): void
}
```

## Key Features

### 1. Duration Filtering

Real-time filtering of YouTube videos based on duration:

```typescript
// Filter configuration
interface DurationFilter {
  min: number; // Minimum duration in seconds
  max: number; // Maximum duration in seconds
  enabled: boolean;
}
```

### 2. Payment Integration

Complete Stripe integration with:
- Checkout sessions
- Subscription management
- Customer portal
- Webhook handling

### 3. License Management

Device-based licensing system:
- Unique device ID generation
- License validation
- Multi-device support
- Offline grace period

### 4. Premium Features

Tiered feature access:
- **Basic**: Advanced filters, custom presets
- **Pro**: Keyword filters, analytics, API access
- **Lifetime**: Source code access, priority support

## System Design

### Event-Driven Architecture

The extension uses an event bus for decoupled communication:

```typescript
// Event types
type AppEvent = 
  | { type: 'filter-changed'; filter: Filter }
  | { type: 'videos-filtered'; count: number }
  | { type: 'license-updated'; licensed: boolean }
```

### Dependency Injection

Clean dependency management using a DI container:

```typescript
const container = createContainer();
const filterUseCase = container.filterVideosUseCase;
```

### Performance Optimization

- **Video caching**: Prevents redundant processing
- **Optimized observers**: Efficient DOM monitoring
- **Debounced filtering**: Reduces computation
- **Lazy loading**: On-demand component loading

## Security & Privacy

### Data Protection

- No user data collection
- All filtering happens locally
- Secure payment processing via Stripe
- Device IDs are anonymized

### Permissions

Minimal required permissions:
- `storage`: Save user preferences
- `activeTab`: Access current tab
- `host_permissions`: YouTube access only

### Content Security Policy

Strict CSP headers prevent XSS attacks:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

## Deployment

### Building for Production

```bash
# Clean build with optimizations
./build.sh --clean --production

# This creates:
# - dist/ folder with optimized code
# - smartstream-filter.zip for Chrome Web Store
```

### Chrome Web Store Submission

1. Build the production version
2. Create developer account
3. Upload the ZIP file
4. Add store listing details
5. Submit for review

### Version Management

Follow semantic versioning:
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes

Update version in:
- `manifest.json`
- `package.json`

## Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Create Pull Request

### Code Review Process

- All changes require PR review
- Maintain test coverage
- Update documentation
- Follow coding standards

### Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Test extension manually
npm run dev
```

## Support & Resources

- **Documentation**: This file and inline code comments
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for features
- **Email**: support@smartstreamfilter.com

## License

Dual-licensed:
- **MIT License**: Core components (see LICENSE-MIT)
- **Proprietary**: Premium features (see LICENSE-PROPRIETARY)

---

Built with ❤️ by the SmartStream Filter team