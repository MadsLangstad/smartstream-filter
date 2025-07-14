/**
 * Professional Paywall Manager
 * Handles authentication, licensing, and payment flows
 */

import { createLogger } from '../../utils/logger';

const logger = createLogger('Paywall');

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface License {
  id: string;
  userId: string;
  plan: 'free' | 'basic' | 'pro' | 'lifetime';
  status: 'active' | 'expired' | 'cancelled';
  features: string[];
  validUntil: string;
  deviceLimit: number;
  activatedDevices: string[];
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
    const stored = await chrome.storage.local.get(['authToken', 'user', 'license']);
    logger.debug('Loaded from storage:', stored);
    
    if (stored.authToken) {
      this.authToken = stored.authToken;
      this.user = stored.user;
      this.license = stored.license;
      
      // Validate in background
      this.validateLicense().catch(err => logger.error('License validation failed:', err));
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
  async checkFeatureAccess(_feature: string): Promise<boolean> {
    // Check if user has access to the feature without showing paywall
    // Check if the license is valid
    return this.license !== null && new Date(this.license.validUntil) > new Date();
  }
  
  async requirePremium(feature: string): Promise<boolean> {
    // Quick check for cached validation
    if (this.cache.validationResult && 
        Date.now() - this.cache.validationTime < this.CACHE_DURATION) {
      return true;
    }
    
    // Check if user is authenticated
    if (!this.user || !this.authToken) {
      await this.showAuthFlow();
      return false;
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
  private async validateLicense(): Promise<boolean> {
    if (!this.authToken || !this.license) return false;
    
    try {
      // DEMO MODE - In production, remove this block
      if (this.authToken.startsWith('demo-token')) {
        // Check if license is still valid
        const isValid = new Date(this.license.validUntil) > new Date();
        
        // Update cache
        this.cache.validationTime = Date.now();
        this.cache.validationResult = isValid;
        
        return isValid;
      }
      
      // PRODUCTION CODE - Uncomment below
      /*
      const response = await fetch(`${this.API_BASE}/license/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenseId: this.license.id,
          deviceId: this.deviceId
        })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, need to re-authenticate
          await this.logout();
          return false;
        }
        throw new Error(`Validation failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update license data
      this.license = data.license;
      await chrome.storage.local.set({ license: this.license });
      
      // Update cache
      this.cache.validationTime = Date.now();
      this.cache.validationResult = data.valid;
      
      return data.valid;
      */
      
      // For now, return true in demo mode
      this.cache.validationTime = Date.now();
      this.cache.validationResult = true;
      return true;
    } catch (error) {
      logger.error('License validation error:', error);
      
      // Fallback to cached result if available
      if (this.license && new Date(this.license.validUntil) > new Date()) {
        return true;
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
    if (result.success) {
      this.authToken = result.token || null;
      this.user = result.user || null;
      this.license = result.license || null;
      
      await chrome.storage.local.set({
        authToken: this.authToken,
        user: this.user,
        license: this.license
      });
      
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
      // DEMO MODE - In production, use real API
      if (!this.authToken || this.authToken.startsWith('demo-token')) {
        // Simulate checkout by directly upgrading the plan
        alert(`Demo Mode: Simulating ${planId} plan purchase...`);
        
        // Update license to new plan
        if (this.license) {
          this.license.plan = planId as any;
          this.license.features = this.getPlanFeatures(planId);
          this.license.validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
          
          await chrome.storage.local.set({ license: this.license });
          
          // Show success
          const { showSuccessToast } = await import('../../ui/components/feedback/toast');
          showSuccessToast(`Successfully upgraded to ${planId} plan!`);
          
          // Reload after a moment
          setTimeout(() => window.location.reload(), 2000);
        }
        return;
      }
      
      // PRODUCTION CODE
      /*
      const response = await fetch(`${this.API_BASE}/checkout/session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: window.location.href
        })
      });
      
      if (!response.ok) throw new Error('Failed to create checkout session');
      
      const { checkoutUrl } = await response.json();
      
      // Open checkout in new tab
      chrome.tabs.create({ url: checkoutUrl });
      
      // Listen for success
      this.listenForPaymentSuccess();
      */
    } catch (error) {
      logger.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
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
   * TODO: Implement payment success listener
   */
  // TODO: Call this when payment is initiated
  // @ts-ignore - Will be used for payment success handling
  private _listenForPaymentSuccess(): void {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes
    
    const checkInterval = setInterval(async () => {
      attempts++;
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        return;
      }
      
      const isValid = await this.validateLicense();
      if (isValid && this.license?.plan !== 'free') {
        clearInterval(checkInterval);
        
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
   * Logout user
   */
  async logout(): Promise<void> {
    this.user = null;
    this.license = null;
    this.authToken = null;
    this.cache.validationResult = false;
    
    await chrome.storage.local.remove(['authToken', 'user', 'license']);
    window.location.reload();
  }
}