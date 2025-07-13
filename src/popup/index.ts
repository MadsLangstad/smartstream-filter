import type { FilterSettings } from '../types';
import { featureManager } from '../services/feature-manager';

class PopupController {
  private minSlider!: HTMLInputElement;
  private maxSlider!: HTMLInputElement;
  private minValue!: HTMLElement;
  private maxValue!: HTMLElement;
  private enabledToggle!: HTMLInputElement;

  constructor() {
    console.log('[SmartStream] Popup initializing');
    this.init();
  }

  private async init() {
    await featureManager.initialize();
    await this.setupElements();
    await this.loadSettings();
    await this.setupPremiumFeatures();
    this.setupListeners();
    this.setupMessageListener();
  }

  private async setupElements() {
    this.minSlider = document.getElementById('min-duration') as HTMLInputElement;
    this.maxSlider = document.getElementById('max-duration') as HTMLInputElement;
    this.minValue = document.getElementById('min-value') as HTMLElement;
    this.maxValue = document.getElementById('max-value') as HTMLElement;
    this.enabledToggle = document.getElementById('filter-enabled') as HTMLInputElement;
  }

  private async loadSettings() {
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings: FilterSettings) => {
        console.log('[SmartStream] Loaded settings:', settings);
        this.minSlider.value = settings.minDuration.toString();
        this.maxSlider.value = settings.maxDuration.toString();
        this.enabledToggle.checked = settings.enabled;
        this.updateDisplayValues();
        this.updateSyncStatus(settings.enabled);
        resolve();
      });
    });
  }

  private setupListeners() {
    this.enabledToggle.addEventListener('change', () => {
      this.updateSettings({ enabled: this.enabledToggle.checked });
      this.updateSyncStatus(this.enabledToggle.checked);
    });

    this.minSlider.addEventListener('input', () => {
      const value = parseInt(this.minSlider.value);
      if (value > parseInt(this.maxSlider.value)) {
        this.maxSlider.value = this.minSlider.value;
      }
      this.updateDisplayValues();
      this.updateSettings({ minDuration: value });
    });

    this.maxSlider.addEventListener('input', () => {
      const value = parseInt(this.maxSlider.value);
      if (value < parseInt(this.minSlider.value)) {
        this.minSlider.value = this.maxSlider.value;
      }
      this.updateDisplayValues();
      this.updateSettings({ maxDuration: value });
    });
  }

  private updateDisplayValues() {
    this.minValue.textContent = this.formatDuration(parseInt(this.minSlider.value));
    this.maxValue.textContent = this.formatDuration(parseInt(this.maxSlider.value));
  }

  private formatDuration(minutes: number): string {
    if (minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  private updateSettings(update: Partial<FilterSettings>) {
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: update });
  }
  
  private updateSyncStatus(enabled: boolean) {
    const syncStatus = document.getElementById('sync-status');
    const syncText = document.getElementById('sync-text');
    
    if (syncStatus && syncText) {
      if (enabled) {
        syncStatus.classList.remove('paused');
        syncStatus.classList.add('connected');
        syncText.textContent = 'Real-time sync enabled';
      } else {
        syncStatus.classList.remove('connected');
        syncStatus.classList.add('paused');
        syncText.textContent = 'Filter paused';
      }
    }
  }

  private async setupPremiumFeatures() {
    const planInfo = await featureManager.getPlanInfo();
    console.log('[SmartStream] Plan info:', planInfo);

    // Add premium status indicator
    const header = document.querySelector('.header');
    if (header && planInfo.plan.type === 'premium') {
      const premiumBadge = document.createElement('div');
      premiumBadge.style.cssText = 'position: absolute; top: 10px; right: 10px; font-size: 20px;';
      premiumBadge.innerHTML = '⭐';
      premiumBadge.title = 'Premium Active';
      header.appendChild(premiumBadge);
    }

    // Show upgrade section if not premium
    if (planInfo.plan.type === 'free') {
      const upgradeSection = document.createElement('div');
      upgradeSection.id = 'upgrade-section';
      upgradeSection.style.cssText = `
        padding: 15px;
        margin: 15px;
        background: rgba(255, 215, 0, 0.1);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 8px;
        text-align: center;
      `;
      upgradeSection.innerHTML = `
        <h3 style="color: #ffd700; margin: 0 0 10px 0; font-size: 14px;">Unlock Premium Features</h3>
        <ul style="text-align: left; margin: 10px 0; padding-left: 20px; font-size: 12px; color: #aaa;">
          <li>Advanced filters (keywords, channels)</li>
          <li>Custom presets</li>
          <li>Usage analytics</li>
          <li>Spotify & Netflix support (coming soon)</li>
        </ul>
        <button id="upgrade-btn" style="
          background: #ffd700;
          color: #000;
          border: none;
          padding: 8px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
        ">Upgrade to Premium</button>
      `;
      
      const footer = document.querySelector('.footer');
      if (footer) {
        footer.parentElement?.insertBefore(upgradeSection, footer);
        
        document.getElementById('upgrade-btn')?.addEventListener('click', () => {
          chrome.tabs.create({ url: 'https://smartstreamfilter.com/upgrade' });
        });
      }
    }
  }

  private setupMessageListener() {
    // Listen for settings updates from content script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SETTINGS_UPDATED') {
        console.log('[SmartStream] Popup received settings update:', message.settings);
        this.minSlider.value = message.settings.minDuration.toString();
        this.maxSlider.value = message.settings.maxDuration.toString();
        this.enabledToggle.checked = message.settings.enabled;
        this.updateDisplayValues();
        this.updateSyncStatus(message.settings.enabled);
      } else if (message.type === 'SHOW_UPGRADE_PROMPT') {
        // Handle upgrade prompts
        this.showUpgradePrompt(message.feature);
      }
    });
  }

  private showUpgradePrompt(_feature: string) {
    // Show inline upgrade prompt
    const upgradePrompt = document.createElement('div');
    upgradePrompt.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1a;
      border: 2px solid #ffd700;
      padding: 20px;
      border-radius: 8px;
      z-index: 1000;
      max-width: 300px;
    `;
    upgradePrompt.innerHTML = `
      <h3 style="color: #ffd700; margin: 0 0 10px 0;">Premium Feature</h3>
      <p style="color: #aaa; margin: 0 0 15px 0;">This feature requires a premium subscription.</p>
      <button onclick="this.parentElement.remove()" style="
        background: #333;
        color: #fff;
        border: 1px solid #555;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-right: 10px;
      ">Cancel</button>
      <button onclick="chrome.tabs.create({url: 'https://smartstreamfilter.com/upgrade'}); this.parentElement.remove();" style="
        background: #ffd700;
        color: #000;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
      ">Upgrade</button>
    `;
    document.body.appendChild(upgradePrompt);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
  });
} else {
  new PopupController();
}