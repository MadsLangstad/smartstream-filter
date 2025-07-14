/**
 * Simple paywall implementation without complex dependencies
 */

export class SimplePaywall {
  private static instance: SimplePaywall;
  
  static getInstance(): SimplePaywall {
    if (!SimplePaywall.instance) {
      SimplePaywall.instance = new SimplePaywall();
    }
    return SimplePaywall.instance;
  }

  async checkPremium(): Promise<boolean> {
    const stored = await chrome.storage.sync.get(['userPlan']);
    if (!stored.userPlan || stored.userPlan.type !== 'premium') {
      return false;
    }
    
    const validUntil = new Date(stored.userPlan.validUntil);
    return validUntil > new Date();
  }

  async requirePremium(featureName: string): Promise<boolean> {
    const isPremium = await this.checkPremium();
    
    if (!isPremium) {
      this.showPaywall(featureName);
      return false;
    }
    
    return true;
  }

  private showPaywall(featureName: string): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
    `;
    
    modal.innerHTML = `
      <div style="
        background: #1a1a1a;
        border-radius: 16px;
        padding: 32px;
        max-width: 500px;
        text-align: center;
        position: relative;
      ">
        <button onclick="this.closest('div[style*=fixed]').remove()" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: #666;
          font-size: 24px;
          cursor: pointer;
        ">×</button>
        
        <h2 style="color: #fff; margin: 0 0 16px 0;">
          🚀 Upgrade to Premium
        </h2>
        
        <p style="color: #aaa; margin-bottom: 24px;">
          To use <strong style="color: #ffd700">${featureName}</strong>, 
          you need a premium subscription.
        </p>
        
        <div style="
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          padding: 24px;
          border-radius: 8px;
          margin-bottom: 24px;
        ">
          <h3 style="color: #ffd700; margin: 0 0 16px 0;">Premium Features</h3>
          <ul style="text-align: left; color: #ccc; margin: 0; padding-left: 20px;">
            <li>Advanced Filters (keywords, channels)</li>
            <li>Custom Presets</li>
            <li>Usage Analytics</li>
            <li>Multi-platform Support</li>
            <li>Priority Support</li>
          </ul>
        </div>
        
        <div style="display: flex; gap: 16px; justify-content: center;">
          <button onclick="window.open('https://smartstreamfilter.com/pricing', '_blank')" style="
            background: #ffd700;
            color: #000;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
          ">View Pricing</button>
          
          <button onclick="this.closest('div[style*=fixed]').remove()" style="
            background: #333;
            color: #aaa;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
          ">Maybe Later</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  // Mock activation for testing
  async activatePremiumTrial(days: number = 7): Promise<void> {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + days);
    
    await chrome.storage.sync.set({
      userPlan: {
        type: 'premium',
        validUntil: validUntil.toISOString(),
        features: ['advanced_filters', 'custom_presets', 'analytics']
      }
    });
    
    alert(`Premium trial activated for ${days} days!`);
    window.location.reload();
  }
}