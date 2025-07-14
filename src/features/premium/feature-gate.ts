/**
 * Feature gate for premium functionality
 */

import { PaywallModal } from './paywall-modal';
import { PaymentService } from './payment-service';

export class FeatureGate {
  private static instance: FeatureGate;
  private paymentService = new PaymentService();
  private isPremium: boolean = false;
  private checkedAt: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): FeatureGate {
    if (!FeatureGate.instance) {
      FeatureGate.instance = new FeatureGate();
    }
    return FeatureGate.instance;
  }

  /**
   * Check if user has access to premium feature
   */
  async requirePremium(featureName: string): Promise<boolean> {
    // Check cache first
    if (this.isCacheValid()) {
      if (!this.isPremium) {
        this.showPaywall(featureName);
        return false;
      }
      return true;
    }

    // Verify subscription status
    this.isPremium = await this.paymentService.checkSubscriptionStatus();
    this.checkedAt = Date.now();

    if (!this.isPremium) {
      this.showPaywall(featureName);
      return false;
    }

    return true;
  }

  /**
   * Check if feature is available (no paywall shown)
   */
  async isAvailable(featureName: string): Promise<boolean> {
    if (this.isCacheValid()) {
      return this.isPremium;
    }

    this.isPremium = await this.paymentService.checkSubscriptionStatus();
    this.checkedAt = Date.now();
    
    return this.isPremium;
  }

  /**
   * Show paywall modal
   */
  private showPaywall(featureName: string): void {
    const modal = new PaywallModal({
      feature: featureName,
      onSuccess: () => {
        // Refresh premium status
        this.isPremium = true;
        this.checkedAt = Date.now();
      }
    });
    
    modal.show();
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.checkedAt < this.CACHE_DURATION;
  }

  /**
   * Force refresh premium status
   */
  async refresh(): Promise<boolean> {
    this.isPremium = await this.paymentService.checkSubscriptionStatus();
    this.checkedAt = Date.now();
    return this.isPremium;
  }
}

// Convenience decorator for premium features
export function Premium(featureName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const gate = FeatureGate.getInstance();
      const hasAccess = await gate.requirePremium(featureName);
      
      if (!hasAccess) {
        console.log(`[Premium] Access denied to ${featureName}`);
        return;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}