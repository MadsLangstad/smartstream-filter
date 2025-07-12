import { FilterSettings } from '../types';
import '../style.css';

class PopupController {
  private minSlider!: HTMLInputElement;
  private maxSlider!: HTMLInputElement;
  private minValue!: HTMLElement;
  private maxValue!: HTMLElement;
  private enabledToggle!: HTMLInputElement;

  constructor() {
    this.init();
  }

  private async init() {
    await this.setupElements();
    await this.loadSettings();
    this.setupListeners();
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
        this.minSlider.value = settings.minDuration.toString();
        this.maxSlider.value = settings.maxDuration.toString();
        this.enabledToggle.checked = settings.enabled;
        this.updateDisplayValues();
        resolve();
      });
    });
  }

  private setupListeners() {
    this.enabledToggle.addEventListener('change', () => {
      this.updateSettings({ enabled: this.enabledToggle.checked });
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
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});