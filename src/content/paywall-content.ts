/**
 * Paywall integration for content scripts
 * This wraps the PaywallManager to work in content script context
 */

import { InlinePaywall } from './inline-paywall';

// Since content scripts can't use dynamic imports, we need to handle the UI differently
export class ContentPaywall {
  private static instance: ContentPaywall;
  
  private constructor() {}
  
  static getInstance(): ContentPaywall {
    if (!ContentPaywall.instance) {
      ContentPaywall.instance = new ContentPaywall();
    }
    return ContentPaywall.instance;
  }
  
  async requirePremium(feature: string): Promise<boolean> {
    // Check if user has premium via storage
    const stored = await chrome.storage.local.get(['user', 'license']);
    
    if (stored.license && stored.license.status === 'active' && 
        stored.license.features.includes(feature)) {
      return true;
    }
    
    // Show inline paywall
    return await InlinePaywall.show(feature);
  }
  
  isPremium(): boolean {
    // This will be set during initialization
    return false;
  }
  
  async checkPremiumStatus(): Promise<boolean> {
    const stored = await chrome.storage.local.get(['license']);
    return stored.license?.status === 'active' && stored.license?.plan !== 'free';
  }
}