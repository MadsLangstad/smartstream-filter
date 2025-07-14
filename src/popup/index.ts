import type { FilterSettings, FilterStats } from '../types';
import { PaywallManager } from '../services/paywall/paywall-manager';
import { createLogger } from '../utils/logger';

const logger = createLogger('Popup');

class PopupController {
  private minSlider!: HTMLInputElement;
  private maxSlider!: HTMLInputElement;
  private minValue!: HTMLElement;
  private maxValue!: HTMLElement;
  private enabledToggle!: HTMLInputElement;
  private paywall = PaywallManager.getInstance();

  constructor() {
    logger.info('Popup initializing');
    this.init();
  }

  private async init() {
    await this.setupElements();
    await this.loadSettings();
    await this.setupPremiumFeatures();
    this.setupListeners();
    this.setupMessageListener();
    this.loadStats();
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
        logger.debug('Loaded settings:', settings);
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
    // Wait for PaywallManager to initialize
    await this.paywall.waitForInit();
    
    const user = this.paywall.getUser();
    const license = this.paywall.getLicense();
    
    // More robust premium check - check if plan exists and is not free
    const isPremium = license?.plan && license.plan !== 'free' && license.status === 'active';
    
    logger.debug('User:', user);
    logger.debug('License:', license);
    logger.debug('Is Premium:', isPremium);

    // Show user section if logged in
    const userSection = document.getElementById('user-section');
    const premiumSection = document.getElementById('premium-section');
    
    if (user && userSection) {
      userSection.style.display = 'block';
      const emailEl = userSection.querySelector('.user-email');
      const planEl = userSection.querySelector('.user-plan');
      
      if (emailEl) emailEl.textContent = user.email;
      if (planEl) {
        const planName = license?.plan ? 
          license.plan.charAt(0).toUpperCase() + license.plan.slice(1) : 
          'Free';
        planEl.textContent = `${planName} Plan`;
      }
      
      // Account button
      const accountBtn = document.getElementById('account-btn');
      accountBtn?.addEventListener('click', async () => {
        if (isPremium) {
          // Show account management
          alert('Account management coming soon!');
        } else {
          // Trigger paywall
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'SHOW_PAYWALL' });
            window.close();
          }
        }
      });
    }

    // Premium status indicator removed - star only shows in YouTube header

    // Setup unlock button for premium section
    const unlockBtn = document.getElementById('unlock-btn');
    unlockBtn?.addEventListener('click', async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SHOW_PAYWALL' });
        window.close();
      }
    });

    // Show premium features for premium users
    const premiumFeatures = document.getElementById('premium-features');
    if (premiumFeatures) {
      if (isPremium) {
        logger.info('Showing premium features section');
        premiumFeatures.style.display = 'block';
        this.setupPremiumFeatureHandlers();
      } else {
        logger.info('Hiding premium features section - user is not premium');
        premiumFeatures.style.display = 'none';
      }
    } else {
      logger.warn('Premium features section not found in DOM');
    }

    // Hide the upgrade section that's built into HTML if premium
    const upgradeSection = document.querySelector('#upgrade-section');
    if (isPremium && upgradeSection) {
      upgradeSection.remove();
    }

    // Show upgrade section only if not premium AND not logged in
    if (!isPremium && !user) {
      const newUpgradeSection = document.createElement('div');
      newUpgradeSection.id = 'upgrade-section';
      newUpgradeSection.style.cssText = `
        padding: 15px;
        margin: 15px;
        background: rgba(255, 215, 0, 0.1);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 8px;
        text-align: center;
      `;
      newUpgradeSection.innerHTML = `
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
        footer.parentElement?.insertBefore(newUpgradeSection, footer);
        
        document.getElementById('upgrade-btn')?.addEventListener('click', async () => {
          // Close popup and trigger paywall in main tab
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'SHOW_PAYWALL' });
            window.close();
          }
        });
      }
    }
  }

  private setupMessageListener() {
    // Listen for settings updates from content script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SETTINGS_UPDATED') {
        logger.debug('Popup received settings update:', message.settings);
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

  private async loadStats() {
    // Get stats from storage
    const stored = await chrome.storage.local.get(['stats']);
    if (stored.stats) {
      this.updateStatsDisplay(stored.stats);
    }

    // Request fresh stats from content script
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id && tabs[0].url?.includes('youtube.com')) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATS' }, (stats) => {
        // Check for errors (tab might not have content script)
        if (chrome.runtime.lastError) {
          console.debug('Content script not ready:', chrome.runtime.lastError.message);
          return;
        }
        
        if (stats) {
          this.updateStatsDisplay(stats);
        }
      });
    }
  }

  private updateStatsDisplay(stats: FilterStats) {
    const videosValue = document.querySelector('.stat-card.videos .stat-value');
    const timeValue = document.querySelector('.stat-card.time .stat-value');
    
    if (videosValue && stats.videosShown !== undefined && stats.videosHidden !== undefined) {
      videosValue.textContent = `${stats.videosShown}/${stats.videosShown + stats.videosHidden}`;
    }
    
    if (timeValue && stats.totalTimeHidden !== undefined) {
      const hours = Math.floor(stats.totalTimeHidden / 3600);
      const minutes = Math.floor((stats.totalTimeHidden % 3600) / 60);
      if (hours > 0) {
        timeValue.textContent = `${hours}h ${minutes}m`;
      } else {
        timeValue.textContent = `${minutes}m`;
      }
    }
  }

  private async setupPremiumFeatureHandlers() {
    // Load saved premium filters
    const stored = await chrome.storage.local.get(['keywordFilters', 'channelFilters']);
    
    // Keyword filter
    const keywordInput = document.getElementById('keyword-filter') as HTMLInputElement;
    if (keywordInput) {
      if (stored.keywordFilters) {
        keywordInput.value = stored.keywordFilters;
      }
      
      // Save on change with debounce
      let keywordTimer: number;
      keywordInput.addEventListener('input', () => {
        clearTimeout(keywordTimer);
        keywordTimer = window.setTimeout(() => {
          const keywords = keywordInput.value.trim();
          chrome.storage.local.set({ keywordFilters: keywords });
          // Notify content script
          chrome.runtime.sendMessage({ 
            type: 'UPDATE_PREMIUM_FILTERS', 
            filters: { keywords } 
          });
        }, 500);
      });
    }
    
    // Channel filter
    const channelInput = document.getElementById('channel-filter') as HTMLInputElement;
    if (channelInput) {
      if (stored.channelFilters) {
        channelInput.value = stored.channelFilters;
      }
      
      // Save on change with debounce
      let channelTimer: number;
      channelInput.addEventListener('input', () => {
        clearTimeout(channelTimer);
        channelTimer = window.setTimeout(() => {
          const channels = channelInput.value.trim();
          chrome.storage.local.set({ channelFilters: channels });
          // Notify content script
          chrome.runtime.sendMessage({ 
            type: 'UPDATE_PREMIUM_FILTERS', 
            filters: { channels } 
          });
        }, 500);
      });
    }
    
    // Preset buttons
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const minDuration = parseInt(btn.getAttribute('data-min') || '0');
        const maxDuration = parseInt(btn.getAttribute('data-max') || '600');
        
        // Update sliders
        this.minSlider.value = minDuration.toString();
        this.maxSlider.value = maxDuration.toString();
        this.updateDisplayValues();
        
        // Update settings
        this.updateSettings({ 
          minDuration, 
          maxDuration 
        });
        
        // Visual feedback
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 200);
      });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
  });
} else {
  new PopupController();
}