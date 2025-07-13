/**
 * Feature Manager - Bridge between open source and premium features
 */

import { FeatureFlagService, FEATURES, type FeatureKey } from '../../packages/premium/feature-flags';

export class FeatureManager {
  private static instance: FeatureManager;
  private featureService: FeatureFlagService;
  private initialized: boolean = false;

  private constructor() {
    this.featureService = new FeatureFlagService();
  }

  static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager();
    }
    return FeatureManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.featureService.loadUserPlan();
    this.initialized = true;
  }

  isEnabled(feature: FeatureKey): boolean {
    if (!this.initialized) {
      console.warn('[FeatureManager] Not initialized, returning false for', feature);
      return false;
    }
    return this.featureService.isFeatureEnabled(feature);
  }

  async checkPremiumFeature(feature: FeatureKey): Promise<boolean> {
    await this.initialize();
    
    if (this.isEnabled(feature)) {
      return true;
    }
    
    // If feature is premium and not enabled, show upgrade prompt
    const premiumFeatures = this.featureService.getPremiumFeatures();
    const isPremium = premiumFeatures.some(f => f.id === feature);
    
    if (isPremium) {
      this.showUpgradePrompt(feature);
    }
    
    return false;
  }

  private showUpgradePrompt(feature: FeatureKey): void {
    // Send message to show upgrade UI
    chrome.runtime.sendMessage({
      type: 'SHOW_UPGRADE_PROMPT',
      feature: feature
    });
  }

  async getPlanInfo() {
    await this.initialize();
    return {
      plan: this.featureService.getUserPlan(),
      availableFeatures: this.featureService.getAvailableFeatures(),
      premiumFeatures: this.featureService.getPremiumFeatures()
    };
  }

  // Convenience methods for common features
  canUseAdvancedFilters(): boolean {
    return this.isEnabled(FEATURES.ADVANCED_FILTERS);
  }

  canUseCustomPresets(): boolean {
    return this.isEnabled(FEATURES.CUSTOM_PRESETS);
  }

  canUseAnalytics(): boolean {
    return this.isEnabled(FEATURES.ANALYTICS);
  }

  canUseSpotify(): boolean {
    return this.isEnabled(FEATURES.SPOTIFY_SUPPORT);
  }

  canUseNetflix(): boolean {
    return this.isEnabled(FEATURES.NETFLIX_SUPPORT);
  }
}

// Export singleton instance
export const featureManager = FeatureManager.getInstance();