/**
 * Feature Manager - Bridge between open source and premium features
 */

// Simplified feature manager without external dependencies for now
export const FEATURES = {
  BASIC_DURATION_FILTER: 'basic_duration_filter',
  YOUTUBE_SUPPORT: 'youtube_support',
  ADVANCED_FILTERS: 'advanced_filters',
  CUSTOM_PRESETS: 'custom_presets',
  ANALYTICS: 'analytics',
  SPOTIFY_SUPPORT: 'spotify_support',
  NETFLIX_SUPPORT: 'netflix_support',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

interface UserPlan {
  type: 'free' | 'premium' | 'enterprise';
  validUntil?: Date;
  features: string[];
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  premium: boolean;
}

export class FeatureManager {
  private static instance: FeatureManager;
  private userPlan: UserPlan = { type: 'free', features: [] };
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager();
    }
    return FeatureManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Load user plan from storage
    try {
      const stored = await chrome.storage.sync.get(['userPlan']);
      if (stored.userPlan) {
        this.userPlan = stored.userPlan;
      } else {
        // Default free plan
        this.userPlan = {
          type: 'free',
          features: [FEATURES.BASIC_DURATION_FILTER, FEATURES.YOUTUBE_SUPPORT]
        };
      }
    } catch (error) {
      console.error('[FeatureManager] Error loading plan:', error);
    }
    
    this.initialized = true;
  }

  isEnabled(feature: FeatureKey): boolean {
    if (!this.initialized) {
      console.warn('[FeatureManager] Not initialized, returning false for', feature);
      return false;
    }
    
    // Basic features always enabled
    if (feature === FEATURES.BASIC_DURATION_FILTER || feature === FEATURES.YOUTUBE_SUPPORT) {
      return true;
    }
    
    // Check premium features
    return this.userPlan.type === 'premium' || this.userPlan.type === 'enterprise';
  }

  async checkPremiumFeature(feature: FeatureKey): Promise<boolean> {
    await this.initialize();
    
    if (this.isEnabled(feature)) {
      return true;
    }
    
    this.showUpgradePrompt(feature);
    return false;
  }

  private showUpgradePrompt(feature: FeatureKey): void {
    chrome.runtime.sendMessage({
      type: 'SHOW_UPGRADE_PROMPT',
      feature: feature
    });
  }

  async getPlanInfo() {
    await this.initialize();
    
    const availableFeatures: FeatureFlag[] = [
      { id: FEATURES.BASIC_DURATION_FILTER, name: 'Basic Duration Filter', description: '', enabled: true, premium: false },
      { id: FEATURES.YOUTUBE_SUPPORT, name: 'YouTube Support', description: '', enabled: true, premium: false }
    ];
    
    const premiumFeatures: FeatureFlag[] = [
      { id: FEATURES.ADVANCED_FILTERS, name: 'Advanced Filters', description: '', enabled: true, premium: true },
      { id: FEATURES.CUSTOM_PRESETS, name: 'Custom Presets', description: '', enabled: true, premium: true },
      { id: FEATURES.ANALYTICS, name: 'Analytics', description: '', enabled: true, premium: true }
    ];
    
    return {
      plan: this.userPlan,
      availableFeatures,
      premiumFeatures
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