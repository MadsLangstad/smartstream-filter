/**
 * Stripe Service for SmartStream Filter
 * Handles payment processing and subscription management
 */

import { createLogger } from '../../utils/logger';
import type { APIResponse, CheckoutSession } from '../../types/api';
import { createRetryFetch, withRetry } from '../../utils/retry';

const logger = createLogger('StripeService');

import { STRIPE_CONFIG } from '../../config/stripe.config';

// Create fetch with retry for API calls
const retryFetch = createRetryFetch({
  maxAttempts: 3,
  onRetry: (attempt, error) => {
    logger.warn(`API request failed (attempt ${attempt}):`, error);
  }
});

export interface CreateCheckoutOptions {
  planId: 'basic' | 'pro' | 'lifetime';
  email: string;
  userId?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

export interface LicenseValidationResult {
  valid: boolean;
  license?: {
    email: string;
    productId: string;
    status: string;
    devices: number;
  };
  error?: string;
}

export class StripeService {
  private static instance: StripeService;
  
  private constructor() {}
  
  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }
  
  /**
   * Create a Stripe Checkout session
   */
  async createCheckoutSession(options: CreateCheckoutOptions): Promise<APIResponse<CheckoutSession>> {
    try {
      // Get the current page URL for success/cancel redirects
      // Use window.location in content script context, fallback to YouTube
      const baseUrl = typeof window !== 'undefined' && window.location 
        ? window.location.origin 
        : 'https://www.youtube.com';
      
      const response = await retryFetch(`${STRIPE_CONFIG.apiBaseUrl}/stripe/checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Version': chrome.runtime.getManifest().version
        },
        body: JSON.stringify({
          email: options.email,
          planId: options.planId,
          successUrl: options.successUrl || `${baseUrl}?smartstream_success=true&plan=${options.planId}`,
          cancelUrl: options.cancelUrl || window.location?.href || baseUrl,
          metadata: {
            userId: options.userId || '',
            extensionId: chrome.runtime.id,
            ...options.metadata
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: {
          sessionId: data.sessionId,
          url: data.url,
          plan: options.planId,
          amount: data.amount,
          currency: data.currency
        }
      };
    } catch (error) {
      logger.error('Failed to create checkout session:', error);
      return {
        success: false,
        error: {
          code: 'CHECKOUT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create checkout session'
        }
      };
    }
  }
  
  /**
   * Create a customer portal session for subscription management
   */
  async createPortalSession(): Promise<APIResponse<{ url: string }>> {
    try {
      const returnUrl = typeof window !== 'undefined' && window.location 
        ? window.location.href 
        : 'https://www.youtube.com';
      
      const response = await retryFetch(`${STRIPE_CONFIG.apiBaseUrl}/stripe/portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          returnUrl
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: { url: data.url }
      };
    } catch (error) {
      logger.error('Failed to create portal session:', error);
      return {
        success: false,
        error: {
          code: 'PORTAL_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create customer portal session'
        }
      };
    }
  }
  
  /**
   * Verify payment success
   */
  async verifyPaymentSuccess(sessionId: string): Promise<APIResponse<{ 
    success: boolean; 
    email?: string;
    licenseKey?: string;
    authToken?: string;
  }>> {
    try {
      const response = await retryFetch(`${STRIPE_CONFIG.apiBaseUrl}/stripe/verify-session/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.paid && data.authToken) {
        // Store auth token and whatever else we have
        const toStore: any = {
          authToken: data.authToken,
          userEmail: data.email
        };
        
        // Only store license key if we have it
        if (data.licenseKey) {
          toStore.licenseKey = data.licenseKey;
        }
        
        await chrome.storage.local.set(toStore);
        logger.info('Stored auth credentials:', { hasLicense: !!data.licenseKey });
      }
      
      return {
        success: true,
        data: {
          success: data.paid,
          email: data.email,
          licenseKey: data.licenseKey,
          authToken: data.authToken
        }
      };
    } catch (error) {
      logger.error('Failed to verify payment:', error);
      return {
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: 'Failed to verify payment'
        }
      };
    }
  }
  
  
  /**
   * Get auth token from storage
   */
  private async getAuthToken(): Promise<string> {
    const { authToken } = await chrome.storage.local.get('authToken');
    if (!authToken) {
      throw new Error('Not authenticated');
    }
    return authToken;
  }
  
  /**
   * Listen for payment success from redirect
   */
  async handlePaymentRedirect(): Promise<void> {
    // Check if current page has success parameters
    if (typeof window === 'undefined' || !window.location) return;
    
    const url = new URL(window.location.href);
    const success = url.searchParams.get('smartstream_success');
    const plan = url.searchParams.get('plan');
    const sessionId = url.searchParams.get('session_id');
    
    if (success === 'true' && sessionId) {
      logger.info('Payment success detected, verifying...');
      
      // Verify the payment
      const result = await this.verifyPaymentSuccess(sessionId);
      
      if (result.success && result.data?.success) {
        // Update license in PaywallManager
        const { PaywallManager } = await import('../paywall/paywall-manager');
        const paywallManager = PaywallManager.getInstance();
        
        // Set the license and auth info
        if (result.data?.licenseKey && result.data?.authToken) {
          await paywallManager.setLicenseInfo({
            licenseKey: result.data.licenseKey,
            authToken: result.data.authToken,
            email: result.data.email || ''
          });
        }
        
        // Force license refresh with retry
        await withRetry(
          () => paywallManager.validateLicense(),
          {
            maxAttempts: 3,
            initialDelay: 500,
            onRetry: (attempt) => {
              logger.info(`Retrying license validation (attempt ${attempt})...`);
            }
          }
        );
        
        // Show success message
        const { showSuccessToast } = await import('../../ui/components/feedback/toast');
        showSuccessToast(`Successfully upgraded to ${plan} plan!`);
        
        // Clean URL
        url.searchParams.delete('smartstream_success');
        url.searchParams.delete('plan');
        url.searchParams.delete('session_id');
        
        window.location.href = url.toString();
      }
    }
  }
  
  /**
   * Validate license with server
   */
  async validateLicense(licenseKey: string, authToken: string): Promise<APIResponse<LicenseValidationResult>> {
    try {
      // Get device ID
      const deviceId = await this.getDeviceId();
      
      const response = await retryFetch(`${STRIPE_CONFIG.apiBaseUrl}/licenses/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenseKey,
          authToken,
          deviceId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: data.error || 'License validation failed'
          }
        };
      }
      
      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Failed to validate license:', error);
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate license'
        }
      };
    }
  }
  
  /**
   * Get user licenses
   */
  async getUserLicenses(): Promise<APIResponse<{ licenses: Array<any> }>> {
    try {
      const response = await retryFetch(`${STRIPE_CONFIG.apiBaseUrl}/licenses/me`, {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Failed to get user licenses:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch user licenses'
        }
      };
    }
  }
  
  /**
   * Get or generate device ID
   */
  private async getDeviceId(): Promise<string> {
    const { deviceId } = await chrome.storage.local.get('deviceId');
    if (deviceId) return deviceId;
    
    // Generate new device ID
    const newDeviceId = crypto.randomUUID();
    await chrome.storage.local.set({ deviceId: newDeviceId });
    return newDeviceId;
  }
  
  /**
   * Get Stripe publishable key
   */
  getPublishableKey(): string {
    return STRIPE_CONFIG.publishableKey;
  }
}