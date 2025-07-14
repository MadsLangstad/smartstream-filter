/**
 * Premium Feature Flags System
 * PROPRIETARY - All rights reserved
 */

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  premium: boolean;
  experimental?: boolean;
}

export interface UserPlan {
  type: 'free' | 'premium' | 'enterprise';
  validUntil?: Date;
  features: string[];
}

export const FEATURES = {
  // Free
  BASIC_DURATION_FILTER: 'basic_duration_filter',
  YOUTUBE_SUPPORT: 'youtube_support',

  // Premium
  ADVANCED_FILTERS: 'advanced_filters',
  MULTI_PLATFORM: 'multi_platform',
  CUSTOM_PRESETS: 'custom_presets',
  ANALYTICS: 'analytics',
  EXPORT_DATA: 'export_data',
  NO_ADS: 'no_ads',
  PRIORITY_SUPPORT: 'priority_support',

  // Platform-specific Premium
  SPOTIFY_SUPPORT: 'spotify_support',
  NETFLIX_SUPPORT: 'netflix_support',
  TWITCH_SUPPORT: 'twitch_support',
  VIMEO_SUPPORT: 'vimeo_support',
  TIKTOK_SUPPORT: 'tiktok_support',
  DISNEY_SUPPORT: 'disney_support',
  PRIME_SUPPORT: 'prime_support',
  APPLE_TV_SUPPORT: 'apple_tv_support',
  CRUNCHYROLL_SUPPORT: 'crunchyroll_support',

  APPLE_MUSIC_SUPPORT: 'apple_music_support',
  TIDAL_SUPPORT: 'tidal_support',
  POCKETCASTS_SUPPORT: 'pocketcasts_support',
  YTMUSIC_SUPPORT: 'ytmusic_support',
  SOUNDCLOUD_SUPPORT: 'soundcloud_support',

  KHAN_SUPPORT: 'khan_support',
  COURSERA_SUPPORT: 'coursera_support',
  UDEMY_SUPPORT: 'udemy_support',
  SKILLSHARE_SUPPORT: 'skillshare_support',
  EDX_SUPPORT: 'edx_support',

  // Experimental
  AI_RECOMMENDATIONS: 'ai_recommendations',
  COLLABORATIVE_FILTERS: 'collaborative_filters'
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

export class FeatureFlagService {
  private flags: Map<string, FeatureFlag>;
  private userPlan: UserPlan;

  constructor() {
    this.flags = new Map();
    this.userPlan = { type: 'free', features: [] };
    this.initializeFlags();
  }

  private initializeFlags(): void {
    const flagDefinitions: FeatureFlag[] = [
      // Free features
      {
        id: FEATURES.BASIC_DURATION_FILTER,
        name: 'Basic Duration Filter',
        description: 'Filter content by duration',
        enabled: true,
        premium: false
      },
      {
        id: FEATURES.YOUTUBE_SUPPORT,
        name: 'YouTube Support',
        description: 'Filter YouTube videos',
        enabled: true,
        premium: false
      },
      
      // Premium features
      {
        id: FEATURES.ADVANCED_FILTERS,
        name: 'Advanced Filters',
        description: 'Multiple filter criteria, keywords, channels, and more',
        enabled: true,
        premium: true
      },
      {
        id: FEATURES.CUSTOM_PRESETS,
        name: 'Custom Presets',
        description: 'Save and switch between filter presets easily',
        enabled: true,
        premium: true
      },
      {
        id: FEATURES.ANALYTICS,
        name: 'Usage Analytics',
        description: 'Track your viewing habits and time saved by filtering',
        enabled: true,
        premium: true
      },
      {
        id: FEATURES.SPOTIFY_SUPPORT,
        name: 'Spotify Support',
        description: 'Filter Spotify podcasts and songs',
        enabled: false,
        premium: true,
        experimental: true
      },
      {
        id: FEATURES.NETFLIX_SUPPORT,
        name: 'Netflix Support',
        description: 'Filter Netflix content by duration',
        enabled: false,
        premium: true,
        experimental: true
      }
    ];

    flagDefinitions.forEach(flag => {
      this.flags.set(flag.id, flag);
    });
  }

  async loadUserPlan(): Promise<void> {
    const stored = await chrome.storage.sync.get(['userPlan']);
    if (stored.userPlan) {
      this.userPlan = stored.userPlan;
    } else {
      // Default free plan
      this.userPlan = {
        type: 'free',
        features: [
          FEATURES.BASIC_DURATION_FILTER,
          FEATURES.YOUTUBE_SUPPORT
        ]
      };
    }
  }

  isFeatureEnabled(featureId: FeatureKey | string): boolean {
    const flag = this.flags.get(featureId);
    if (!flag || !flag.enabled) return false;
    
    // Free features always available
    if (!flag.premium) return true;
    
    // Check if user has access to premium feature
    return this.userPlan.features.includes(featureId) || 
           this.userPlan.type === 'premium' || 
           this.userPlan.type === 'enterprise';
  }

  getUserPlan(): UserPlan {
    return this.userPlan;
  }

  async upgradeToPremium(validUntil: Date): Promise<void> {
    this.userPlan = {
      type: 'premium',
      validUntil,
      features: Object.values(FEATURES).filter(f => {
        const flag = this.flags.get(f);
        return flag && flag.premium && flag.enabled && !flag.experimental;
      })
    };
    
    await chrome.storage.sync.set({ userPlan: this.userPlan });
  }

  getAvailableFeatures(): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => {
      return this.isFeatureEnabled(flag.id);
    });
  }

  getPremiumFeatures(): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => flag.premium);
  }
}