/**
 * Payment service for handling Stripe/Paddle integration
 */

export interface PaymentConfig {
  provider: 'stripe' | 'paddle';
  publicKey: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  plan: 'monthly' | 'yearly' | 'lifetime';
}

export class PaymentService {
  private config: PaymentConfig = {
    provider: 'stripe',
    publicKey: 'pk_test_YOUR_KEY', // TODO: Replace with actual key
    priceId: 'price_YOUR_PRICE', // TODO: Replace with actual price ID
    successUrl: 'https://smartstreamfilter.com/success',
    cancelUrl: 'https://smartstreamfilter.com/cancel'
  };

  /**
   * Initialize payment provider SDK
   */
  async initialize(): Promise<void> {
    if (this.config.provider === 'stripe') {
      await this.loadStripeSDK();
    } else if (this.config.provider === 'paddle') {
      await this.loadPaddleSDK();
    }
  }

  /**
   * Create checkout session
   */
  async createCheckout(email?: string): Promise<string> {
    const response = await this.callAPI('/create-checkout-session', {
      email,
      priceId: this.config.priceId,
      successUrl: this.config.successUrl,
      cancelUrl: this.config.cancelUrl,
      metadata: {
        extensionId: chrome.runtime.id,
        userId: await this.getUserId()
      }
    });

    return response.url;
  }

  /**
   * Verify subscription status
   */
  async verifySubscription(email: string): Promise<Subscription | null> {
    try {
      const response = await this.callAPI('/verify-subscription', { email });
      
      if (response.subscription) {
        return {
          id: response.subscription.id,
          status: response.subscription.status,
          currentPeriodEnd: new Date(response.subscription.current_period_end * 1000),
          cancelAtPeriodEnd: response.subscription.cancel_at_period_end,
          plan: this.determinePlan(response.subscription)
        };
      }
      
      return null;
    } catch (error) {
      console.error('[PaymentService] Verification failed:', error);
      return null;
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(sessionId: string): Promise<void> {
    const subscription = await this.callAPI('/retrieve-session', { sessionId });
    
    if (subscription) {
      await this.activatePremium(subscription);
    }
  }

  /**
   * Activate premium features
   */
  private async activatePremium(subscription: any): Promise<void> {
    const validUntil = new Date(subscription.current_period_end * 1000);
    
    await chrome.storage.sync.set({
      userPlan: {
        type: 'premium',
        validUntil: validUntil.toISOString(),
        subscriptionId: subscription.id,
        features: [
          'advanced_filters',
          'custom_presets',
          'analytics',
          'export_data',
          'priority_support'
        ]
      }
    });

    // Send activation event
    chrome.runtime.sendMessage({
      type: 'PREMIUM_ACTIVATED',
      subscription
    });
  }

  /**
   * Check if user has valid subscription
   */
  async checkSubscriptionStatus(): Promise<boolean> {
    const stored = await chrome.storage.sync.get(['userPlan']);
    
    if (!stored.userPlan || stored.userPlan.type !== 'premium') {
      return false;
    }

    const validUntil = new Date(stored.userPlan.validUntil);
    
    // Check if subscription is still valid
    if (validUntil < new Date()) {
      // Subscription expired, verify with server
      const email = await this.getUserEmail();
      if (email) {
        const subscription = await this.verifySubscription(email);
        
        if (subscription && subscription.status === 'active') {
          await this.activatePremium(subscription);
          return true;
        }
      }
      
      // No valid subscription found
      await this.deactivatePremium();
      return false;
    }

    return true;
  }

  /**
   * Deactivate premium features
   */
  private async deactivatePremium(): Promise<void> {
    await chrome.storage.sync.set({
      userPlan: {
        type: 'free',
        features: ['basic_duration_filter', 'youtube_support']
      }
    });

    chrome.runtime.sendMessage({
      type: 'PREMIUM_DEACTIVATED'
    });
  }

  /**
   * API call helper
   */
  private async callAPI(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`https://api.smartstreamfilter.com${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-ID': chrome.runtime.id
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user ID for tracking
   */
  private async getUserId(): Promise<string> {
    const stored = await chrome.storage.sync.get(['userId']);
    
    if (!stored.userId) {
      const userId = this.generateUserId();
      await chrome.storage.sync.set({ userId });
      return userId;
    }
    
    return stored.userId;
  }

  /**
   * Get user email if available
   */
  private async getUserEmail(): Promise<string | null> {
    const stored = await chrome.storage.sync.get(['userEmail']);
    return stored.userEmail || null;
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determine plan type from subscription
   */
  private determinePlan(subscription: any): 'monthly' | 'yearly' | 'lifetime' {
    // Logic based on price ID or subscription interval
    if (subscription.price?.recurring?.interval === 'year') {
      return 'yearly';
    }
    return 'monthly';
  }

  /**
   * Load Stripe SDK
   */
  private async loadStripeSDK(): Promise<void> {
    return new Promise((resolve) => {
      if (document.getElementById('stripe-js')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'stripe-js';
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  /**
   * Load Paddle SDK
   */
  private async loadPaddleSDK(): Promise<void> {
    return new Promise((resolve) => {
      if (document.getElementById('paddle-js')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'paddle-js';
      script.src = 'https://cdn.paddle.com/paddle/paddle.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }
}