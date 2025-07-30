/**
 * Professional Paywall Manager
 * Handles authentication, licensing, and payment flows
 */

import { createLogger } from '../../utils/logger';
import { STRIPE_CONFIG } from '../../config/stripe.config';

const logger = createLogger('Paywall');

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface License {
  licenseKey: string;
  email: string;
  productId: string;
  plan: 'free' | 'basic' | 'pro' | 'lifetime';
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  features: string[];
  validUntil?: string;
  devices: number;
}

export interface PlanDetails {
  id: string;
  name: string;
  price: string;
  interval?: 'month' | 'year';
  features: string[];
  popular?: boolean;
  savings?: string;
}

export class PaywallManager {
  private static instance: PaywallManager;
  private user: User | null = null;
  private license: License | null = null;
  private authToken: string | null = null;
  // @ts-ignore - Will be used for payment processing state
  private isPaymentProcessing: boolean = false;
  // @ts-ignore - Used for device management
  private _deviceId: string | null = null;
  
  // Cache for offline support
  private cache = {
    validationTime: 0,
    validationResult: false
  };
  
  // private readonly API_BASE = 'https://api.smartstreamfilter.com/v1'; // Uncomment in production
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  private constructor() {
    this.init();
    this.setupFocusListener();
  }
  
  static getInstance(): PaywallManager {
    if (!PaywallManager.instance) {
      PaywallManager.instance = new PaywallManager();
    }
    return PaywallManager.instance;
  }
  
  private async init() {
    // Generate/retrieve device ID
    this._deviceId = await this.getOrCreateDeviceId();
    
    // Load cached auth data
    const stored = await chrome.storage.local.get(['authToken', 'licenseKey', 'userEmail', 'license']);
    logger.debug('Loaded from storage:', stored);
    
    // Always set authToken if it exists
    if (stored.authToken) {
      this.authToken = stored.authToken;
      this.user = stored.userEmail ? { id: stored.licenseKey || 'pending', email: stored.userEmail } : null;
      
      // Always validate if we have auth token, even without license key
      // This will fetch the license if it's been created
      this.validateLicense().catch(err => logger.error('License validation failed:', err));
    }
    
    // Set cached license if available
    if (stored.license) {
      this.license = stored.license;
    }
  }
  
  async waitForInit(): Promise<void> {
    // If already initialized, return immediately
    if (this.authToken !== null || this.user !== null || this.license !== null) {
      return;
    }
    
    // Otherwise wait for init to complete
    await this.init();
  }
  
  private async getOrCreateDeviceId(): Promise<string> {
    const stored = await chrome.storage.local.get(['deviceId']);
    if (stored.deviceId) return stored.deviceId;
    
    const deviceId = this.generateDeviceId();
    await chrome.storage.local.set({ deviceId });
    return deviceId;
  }
  
  private generateDeviceId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Check if user has access to a premium feature
   */
  async checkFeatureAccess(feature: string): Promise<boolean> {
    // Check if user has access to the feature without showing paywall
    if (!this.license) return false;
    
    // Check if the license is active
    if (this.license.status !== 'active') return false;
    
    // Check if feature is included in plan
    return this.license.features.includes(feature);
  }
  
  async requirePremium(feature: string): Promise<boolean> {
    // Quick check for cached validation
    if (this.cache.validationResult && 
        Date.now() - this.cache.validationTime < this.CACHE_DURATION) {
      return true;
    }
    
    // Check if user is authenticated
    if (!this.authToken) {
      await this.showAuthFlow();
      return false;
    }
    
    // If we have auth token but no user, try to set user from storage
    if (!this.user && this.authToken) {
      const stored = await chrome.storage.local.get(['userEmail', 'licenseKey']);
      if (stored.userEmail) {
        this.user = { 
          id: stored.licenseKey || 'pending', 
          email: stored.userEmail 
        };
      }
    }
    
    // Validate license
    const isValid = await this.validateLicense();
    if (!isValid) {
      await this.showPaywall(feature);
      return false;
    }
    
    // Check if feature is included in plan
    if (this.license && !this.license.features.includes(feature)) {
      await this.showUpgradeFlow(feature);
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate license with server
   */
  async validateLicense(): Promise<boolean> {
    const stored = await chrome.storage.local.get(['licenseKey', 'authToken']);
    
    // If we have an auth token but no license key, it might be processing
    if (stored.authToken && !stored.licenseKey) {
      logger.info('Auth token found but no license key yet, checking with server...');
      
      // Try to get license from server using auth token
      try {
        logger.info('Fetching licenses with auth token:', stored.authToken);
        const response = await fetch(`${STRIPE_CONFIG.apiBaseUrl}/licenses/me`, {
          headers: {
            'Authorization': `Bearer ${stored.authToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.licenses && data.licenses.length > 0) {
            const license = data.licenses[0];
            
            // Store the license key
            await chrome.storage.local.set({ 
              licenseKey: license.licenseKey 
            });
            
            // Continue with validation
            stored.licenseKey = license.licenseKey;
          }
        } else if (response.status === 401) {
          logger.error('Auth token is invalid or expired. Status:', response.status);
          // Clear invalid token
          await chrome.storage.local.remove(['authToken', 'licenseKey', 'userEmail']);
          this.authToken = null;
          this.user = null;
          throw new Error('Invalid auth token - please authenticate again');
        }
      } catch (error) {
        logger.error('Failed to fetch licenses:', error);
      }
    }
    
    if (!stored.licenseKey || !stored.authToken) return false;
    
    try {
      // Check if demo mode
      if (stored.authToken.startsWith('demo-token')) {
        // Demo mode always valid
        this.cache.validationTime = Date.now();
        this.cache.validationResult = true;
        return true;
      }
      
      // Production mode - validate with API
      const { StripeService } = await import('../stripe/stripe-service');
      const stripeService = StripeService.getInstance();
      
      const result = await stripeService.validateLicense(stored.licenseKey, stored.authToken);
      
      if (!result.success) {
        if (result.error?.message?.includes('Invalid auth token')) {
          // Token expired, need to re-authenticate
          logger.warn('Auth token expired, logging out...');
          await this.logout();
          return false;
        }
        throw new Error(result.error?.message || 'Validation failed');
      }
      
      const data = result.data;
      
      if (data && data.valid && data.license) {
        // Update license data
        const productToPlan: Record<string, 'basic' | 'pro' | 'lifetime'> = {
          'price_basic_monthly': 'basic',
          'price_pro_monthly': 'pro', 
          'price_lifetime': 'lifetime'
        };
        
        this.license = {
          licenseKey: stored.licenseKey,
          email: data.license.email,
          productId: data.license.productId,
          plan: productToPlan[data.license.productId] || 'basic',
          status: data.license.status as any,
          features: this.getPlanFeatures(productToPlan[data.license.productId] || 'basic'),
          devices: data.license.devices
        };
        
        await chrome.storage.local.set({ license: this.license });
      }
      
      // Update cache
      this.cache.validationTime = Date.now();
      this.cache.validationResult = data?.valid || false;
      
      return data?.valid || false;
    } catch (error) {
      logger.error('License validation error:', error);
      
      // Fallback to cached result if available
      if (this.cache.validationResult && 
          Date.now() - this.cache.validationTime < this.CACHE_DURATION) {
        return this.cache.validationResult;
      }
      
      return false;
    }
  }
  
  /**
   * Show authentication flow
   */
  private async showAuthFlow(): Promise<void> {
    const { showAuthModal } = await import('../../ui/components/modals/auth-modal');
    
    const result = await showAuthModal();
    if (result.success && result.email) {
      // For demo mode
      if (result.token?.startsWith('demo-token')) {
        this.authToken = result.token;
        this.user = { id: 'demo-user', email: result.email };
        this.license = {
          licenseKey: 'demo-license',
          email: result.email,
          productId: 'demo',
          plan: 'pro',
          status: 'active',
          features: this.getPlanFeatures('pro'),
          devices: 1
        };
        
        await chrome.storage.local.set({
          authToken: this.authToken,
          licenseKey: 'demo-license',
          userEmail: result.email,
          license: this.license
        });
      }
      
      // Reload to apply changes
      window.location.reload();
    }
  }
  
  /**
   * Show paywall for feature
   */
  async showPaywall(feature: string): Promise<any> {
    const { showPaywallModal } = await import('../../ui/components/modals/paywall-modal');
    
    const plans: PlanDetails[] = [
      {
        id: 'basic',
        name: 'Basic',
        price: '$4.99',
        interval: 'month',
        features: [
          'Advanced video filters',
          'Custom duration presets',
          'Export filter history',
          'Priority support'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$9.99',
        interval: 'month',
        popular: true,
        features: [
          'Everything in Basic',
          'Keyword & channel filters',
          'Unlimited custom presets',
          'Analytics dashboard',
          'Multi-device sync',
          'API access'
        ]
      },
      {
        id: 'lifetime',
        name: 'Lifetime',
        price: '$199',
        savings: 'Save $400+',
        features: [
          'Everything in Pro',
          'Lifetime updates',
          'Early access features',
          'Premium support',
          'Source code access'
        ]
      }
    ];
    
    const result = await showPaywallModal({
      feature,
      plans,
      currentPlan: this.license?.plan || 'free'
    });
    
    if (result.action === 'upgrade' && result.planId) {
      await this.startCheckout(result.planId);
    }
  }
  
  /**
   * Show upgrade flow for higher tier feature
   */
  private async showUpgradeFlow(feature: string): Promise<void> {
    const { showUpgradeModal } = await import('../../ui/components/modals/upgrade-modal');
    
    const result = await showUpgradeModal({
      feature,
      currentPlan: this.license?.plan || 'free',
      requiredPlan: this.getRequiredPlan(feature)
    });
    
    if (result.upgrade && result.planId) {
      await this.startCheckout(result.planId);
    }
  }
  
  /**
   * Start checkout process
   */
  private async startCheckout(planId: string): Promise<void> {
    try {
      // Check if we should use demo mode
      // Only use demo mode if auth token explicitly starts with 'demo-token'
      // Always use real Stripe for production, even without auth token
      let isDemoMode = this.authToken?.startsWith('demo-token') || false;
      
      // Log the decision
      logger.info('Checkout mode decision:', {
        hasAuthToken: !!this.authToken,
        authTokenPrefix: this.authToken?.substring(0, 10),
        isDemoMode
      });
      
      if (isDemoMode) {
        // Demo mode - simulate purchase
        logger.info('Demo mode: Simulating purchase...');
        
        const confirmed = confirm(
          `Demo Mode: This would normally open Stripe Checkout for the ${planId} plan.\n\n` +
          `In production, you would be redirected to a secure payment page.\n\n` +
          `Click OK to simulate a successful purchase.`
        );
        
        if (confirmed) {
          // Create a demo license
          const demoLicense = {
            licenseKey: 'demo-license-' + Date.now(),
            email: this.user?.email || 'demo@example.com',
            productId: 'demo-' + planId,
            plan: planId as any,
            status: 'active' as const,
            features: this.getPlanFeatures(planId),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            devices: 1
          };
          
          this.license = demoLicense;
          await chrome.storage.local.set({ 
            license: demoLicense,
            licenseKey: demoLicense.licenseKey
          });
          
          // Show success
          const { showSuccessToast } = await import('../../ui/components/feedback/toast');
          showSuccessToast(`Successfully upgraded to ${planId} plan!`);
          
          // Reload after a moment
          setTimeout(() => window.location.reload(), 2000);
        }
        return;
      }
      
      // Production mode - use Stripe
      logger.info('Starting Stripe checkout for plan:', planId);
      
      const { StripeService } = await import('../stripe/stripe-service');
      const stripeService = StripeService.getInstance();
      
      // Get email from user or prompt for it
      let email = this.user?.email;
      
      if (!email) {
        // Show email prompt modal
        const { showEmailPrompt } = await import('../../ui/components/modals/email-prompt');
        const promptResult = await showEmailPrompt();
        
        if (!promptResult || !promptResult.email) {
          throw new Error('Email is required for checkout');
        }
        
        email = promptResult.email;
        
        // Store email for future use
        await chrome.storage.local.set({ userEmail: email });
        this.user = { id: this.user?.id || 'pending', email };
      }
      
      const result = await stripeService.createCheckoutSession({
        planId: planId as 'basic' | 'pro' | 'lifetime',
        email: email,
        userId: this.user?.id
      });
      
      if (result.success && result.data) {
        // Open Stripe Checkout in new tab/window
        if (typeof window !== 'undefined') {
          window.open(result.data.url, '_blank');
        } else {
          // Fallback for extension context
          await chrome.tabs.create({ url: result.data.url });
        }
        
        // Start listening for payment success
        this.listenForPaymentSuccess();
      } else {
        throw new Error(result.error?.message || 'Failed to create checkout session');
      }
    } catch (error) {
      logger.error('Checkout error:', error);
      
      // Show user-friendly error
      const { showErrorToast } = await import('../../ui/components/feedback/toast');
      showErrorToast(
        error instanceof Error ? error.message : 'Failed to start checkout. Please try again.'
      );
    }
  }
  
  private getPlanFeatures(plan: string): string[] {
    const features: Record<string, string[]> = {
      basic: ['advanced_filters', 'custom_presets'],
      pro: ['advanced_filters', 'custom_presets', 'keyword_filters', 'channel_filters', 'analytics', 'api_access'],
      lifetime: ['advanced_filters', 'custom_presets', 'keyword_filters', 'channel_filters', 'analytics', 'api_access', 'source_code']
    };
    return features[plan] || [];
  }
  
  /**
   * Listen for payment success
   */
  private listenForPaymentSuccess(): void {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes
    
    const checkInterval = setInterval(async () => {
      attempts++;
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        logger.info('Payment success check timed out');
        return;
      }
      
      // Check if the license has been updated
      const oldPlan = this.license?.plan;
      const isValid = await this.validateLicense();
      
      if (isValid && this.license?.plan !== 'free' && this.license?.plan !== oldPlan) {
        clearInterval(checkInterval);
        logger.info('Payment success detected! New plan:', this.license?.plan);
        
        // Show success message
        const { showSuccessToast } = await import('../../ui/components/feedback/toast');
        showSuccessToast('Premium activated! Enjoy your new features.');
        
        // Reload to apply changes
        setTimeout(() => window.location.reload(), 2000);
      }
    }, 2000);
  }
  
  /**
   * Get required plan for feature
   */
  private getRequiredPlan(feature: string): string {
    const featurePlans: Record<string, string> = {
      'advanced_filters': 'basic',
      'keyword_filters': 'pro',
      'channel_filters': 'pro',
      'analytics': 'pro',
      'api_access': 'pro',
      'source_code': 'lifetime'
    };
    
    return featurePlans[feature] || 'pro';
  }
  
  /**
   * Get current user
   */
  getUser(): User | null {
    return this.user;
  }
  
  /**
   * Get current license
   */
  getLicense(): License | null {
    return this.license;
  }
  
  /**
   * Check if user has premium
   */
  isPremium(): boolean {
    return this.license?.plan !== 'free' && this.license?.status === 'active';
  }
  
  /**
   * Set license info after purchase
   */
  async setLicenseInfo(info: { licenseKey: string; authToken: string; email: string }): Promise<void> {
    this.authToken = info.authToken;
    this.user = { id: info.licenseKey, email: info.email };
    
    await chrome.storage.local.set({
      licenseKey: info.licenseKey,
      authToken: info.authToken,
      userEmail: info.email
    });
  }
  
  /**
   * Logout user
   */
  async logout(): Promise<void> {
    this.user = null;
    this.license = null;
    this.authToken = null;
    this.cache.validationResult = false;
    
    await chrome.storage.local.remove(['authToken', 'licenseKey', 'userEmail', 'license', 'deviceId']);
    window.location.reload();
  }
  
  /**
   * Setup listener for tab focus to refresh license after payment
   */
  private setupFocusListener(): void {
    if (typeof window === 'undefined') return;
    
    let lastValidation = 0;
    const MIN_INTERVAL = 10000; // 10 seconds minimum between checks
    
    window.addEventListener('focus', async () => {
      const now = Date.now();
      
      // Don't check too frequently
      if (now - lastValidation < MIN_INTERVAL) return;
      
      lastValidation = now;
      
      // If we don't have a license or it's free, check for updates
      if (!this.license || this.license.plan === 'free') {
        logger.info('Tab focused - checking for license updates...');
        
        const oldPlan = this.license?.plan;
        const isValid = await this.validateLicense();
        
        if (isValid && this.license?.plan !== 'free' && this.license?.plan !== oldPlan) {
          logger.info('License updated after focus! New plan:', this.license?.plan);
          
          // Show success message
          const { showSuccessToast } = await import('../../ui/components/feedback/toast');
          showSuccessToast('Premium activated! Refreshing to enable new features...');
          
          // Emit event for UI updates
          const { EventBus } = await import('../../core/infrastructure/event-bus');
          const eventBus = EventBus.getInstance();
          eventBus.emit('license-updated', { 
            licensed: true, 
            plan: this.license!.plan 
          });
          
          // Reload after a short delay
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    });
  }
}