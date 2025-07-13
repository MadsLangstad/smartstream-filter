import type { FilterSettings } from '../types';

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
    await this.setupElements();
    await this.loadSettings();
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
      }
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