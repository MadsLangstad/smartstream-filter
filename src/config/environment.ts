/**
 * Environment configuration for SmartStream Filter
 * Centralizes all environment-specific settings
 */

export const isDevelopment = process.env['NODE_ENV'] === 'development' || 
                            (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version_name?.includes('dev')) ||
                            false;

export const isDemo = process.env['VITE_DEMO_MODE'] === 'true' || isDevelopment;

export const config = {
  api: {
    baseUrl: isDemo 
      ? 'https://demo.smartstreamfilter.com/api/v1' 
      : 'https://api.smartstreamfilter.com/v1',
    timeout: 30000,
    retryAttempts: 3,
  },
  
  auth: {
    tokenKey: 'ssf_auth_token',
    refreshTokenKey: 'ssf_refresh_token',
    userKey: 'ssf_user',
    licenseKey: 'ssf_license',
  },
  
  cache: {
    duration: 5 * 60 * 1000, // 5 minutes
    maxSize: 500,
    ttl: 30 * 60 * 1000, // 30 minutes
  },
  
  features: {
    enableAnalytics: !isDevelopment,
    enableErrorReporting: !isDevelopment,
    enablePerformanceMonitoring: isDevelopment,
    enableDemoMode: isDemo,
  },
  
  stripe: {
    publishableKey: isDemo
      ? 'pk_test_demo_key_here'
      : 'pk_live_production_key_here',
  },
  
  oauth: {
    googleClientId: isDemo
      ? 'demo-client-id.apps.googleusercontent.com'
      : 'production-client-id.apps.googleusercontent.com',
    redirectUri: isDemo
      ? 'https://demo.smartstreamfilter.com/auth/callback'
      : 'https://smartstreamfilter.com/auth/callback',
  },
  
  storage: {
    quotaWarningThreshold: 0.9, // Warn at 90% usage
    syncInterval: 60 * 1000, // 1 minute
  },
  
  performance: {
    mutationObserverDelay: 100,
    videoProcessingBatchSize: 10,
    idleCallbackTimeout: 50,
  },
  
  ui: {
    animationDuration: 300,
    toastDuration: 3000,
    modalZIndex: 999999,
  },
};

// Type-safe feature flags
export const features = {
  advancedFilters: 'advanced_filters',
  keywordFilters: 'keyword_filters',
  channelFilters: 'channel_filters',
  analytics: 'analytics',
  apiAccess: 'api_access',
  customPresets: 'custom_presets',
  exportImport: 'export_import',
  scheduling: 'scheduling',
} as const;

export type FeatureFlag = typeof features[keyof typeof features];

// Helper to check if running in extension context
export function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

// Helper to get manifest version
export function getManifestVersion(): string {
  if (!isExtensionContext()) return 'unknown';
  return chrome.runtime.getManifest().version;
}

// Helper to get extension ID
export function getExtensionId(): string {
  if (!isExtensionContext()) return 'local-dev';
  return chrome.runtime.id;
}