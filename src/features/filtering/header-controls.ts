/**
 * Platform-agnostic header controls
 */

import { FilterCriteria } from '../../core/domain/filter';
import { IEventBus } from '../../shared/interfaces/event-bus';

export interface HeaderControlsConfig {
  criteria: FilterCriteria;
  enabled: boolean;
  isPremium: boolean;
  onCriteriaChange: (criteria: FilterCriteria) => void;
  onToggle: (enabled: boolean) => void;
}

export class HeaderControls {
  private container: HTMLElement;
  private minSlider: HTMLInputElement | null = null;
  private maxSlider: HTMLInputElement | null = null;
  private toggleSwitch: HTMLElement | null = null;

  constructor(
    private config: HeaderControlsConfig,
    private eventBus: IEventBus
  ) {
    this.container = this.createElement();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'smartstream-container';
    container.className = this.config.enabled ? '' : 'disabled';

    // Add styles
    this.injectStyles();

    // Create toggle
    const toggle = document.createElement('div');
    toggle.className = 'smartstream-toggle';
    toggle.innerHTML = `
      <div class="smartstream-switch ${this.config.enabled ? 'active' : ''}" 
           id="smartstream-toggle"></div>
    `;

    // Create duration controls
    const minMinutes = Math.floor((this.config.criteria.minDuration || 300) / 60);
    const maxMinutes = Math.floor((this.config.criteria.maxDuration || 1800) / 60);

    const durationControls = document.createElement('div');
    durationControls.className = 'smartstream-duration-controls';
    durationControls.innerHTML = `
      <div class="smartstream-duration-control">
        <span>Min:</span>
        <input type="range" class="smartstream-slider" id="smartstream-min" 
               min="0" max="600" value="${minMinutes}">
        <span class="smartstream-value" id="smartstream-min-value">
          ${this.formatMinutes(minMinutes)}
        </span>
      </div>
      <div class="smartstream-duration-control">
        <span>Max:</span>
        <input type="range" class="smartstream-slider" id="smartstream-max" 
               min="0" max="600" value="${maxMinutes}">
        <span class="smartstream-value" id="smartstream-max-value">
          ${this.formatMinutes(maxMinutes)}
        </span>
      </div>
    `;

    // Stats display
    const statsDisplay = document.createElement('div');
    statsDisplay.id = 'smartstream-stats';
    statsDisplay.className = 'smartstream-stats';
    statsDisplay.innerHTML = `
      <span>Videos: 0/0</span>
      <span>Time saved: 0h 0m</span>
    `;

    // Premium badge
    if (this.config.isPremium) {
      const premiumBadge = document.createElement('div');
      premiumBadge.className = 'smartstream-premium-badge';
      premiumBadge.innerHTML = '⭐';
      premiumBadge.title = 'Premium features active';
      container.appendChild(premiumBadge);
    }

    container.appendChild(toggle);
    container.appendChild(durationControls);
    container.appendChild(statsDisplay);

    return container;
  }

  private setupEventListeners(): void {
    // Cache elements
    this.toggleSwitch = this.container.querySelector('#smartstream-toggle');
    this.minSlider = this.container.querySelector('#smartstream-min');
    this.maxSlider = this.container.querySelector('#smartstream-max');

    // Toggle listener
    this.toggleSwitch?.addEventListener('click', () => {
      const newState = !this.config.enabled;
      this.config.enabled = newState;
      this.toggleSwitch.classList.toggle('active');
      this.container.classList.toggle('disabled');
      this.config.onToggle(newState);
    });

    // Slider listeners
    this.minSlider?.addEventListener('input', () => {
      const minMinutes = parseInt(this.minSlider!.value);
      const maxMinutes = parseInt(this.maxSlider!.value);

      if (minMinutes > maxMinutes) {
        this.maxSlider!.value = minMinutes.toString();
        this.updateSliderDisplay('max', minMinutes);
      }

      this.updateSliderDisplay('min', minMinutes);
      this.updateCriteria({
        minDuration: minMinutes * 60
      });
    });

    this.maxSlider?.addEventListener('input', () => {
      const minMinutes = parseInt(this.minSlider!.value);
      const maxMinutes = parseInt(this.maxSlider!.value);

      if (maxMinutes < minMinutes) {
        this.minSlider!.value = maxMinutes.toString();
        this.updateSliderDisplay('min', maxMinutes);
      }

      this.updateSliderDisplay('max', maxMinutes);
      this.updateCriteria({
        maxDuration: maxMinutes * 60
      });
    });

    // Listen for stats updates
    this.eventBus.on('videos-filtered', (data: any) => {
      this.updateStats(data);
    });
  }

  private updateCriteria(update: Partial<FilterCriteria>): void {
    this.config.criteria = {
      ...this.config.criteria,
      ...update
    };
    this.config.onCriteriaChange(this.config.criteria);
  }

  private updateSliderDisplay(type: 'min' | 'max', value: number): void {
    const element = document.getElementById(`smartstream-${type}-value`);
    if (element) {
      element.textContent = this.formatMinutes(value);
    }
  }

  private updateStats(data: { shown: any[], hidden: any[], totalTimeSaved: number }): void {
    const statsElement = document.getElementById('smartstream-stats');
    if (statsElement) {
      const totalVideos = data.shown.length + data.hidden.length;
      const hours = Math.floor(data.totalTimeSaved / 3600);
      const minutes = Math.floor((data.totalTimeSaved % 3600) / 60);
      
      statsElement.innerHTML = `
        <span>Videos: ${data.shown.length}/${totalVideos}</span>
        <span>Time saved: ${hours}h ${minutes}m</span>
      `;
    }
  }

  private formatMinutes(minutes: number): string {
    if (minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  private injectStyles(): void {
    if (document.getElementById('smartstream-styles')) return;

    const style = document.createElement('style');
    style.id = 'smartstream-styles';
    style.textContent = `
      #smartstream-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0px 12px;
        height: 40px;
        font-family: Roboto, Arial, sans-serif;
      }

      #smartstream-container.disabled {
        opacity: 0.5;
      }

      .smartstream-toggle {
        cursor: pointer;
      }

      .smartstream-switch {
        position: relative;
        width: 32px;
        height: 18px;
        background-color: rgba(255, 255, 255, 0.3);
        border-radius: 20px;
        transition: background-color 0.3s;
      }

      .smartstream-switch.active {
        background-color: #ff0000;
      }

      .smartstream-switch::after {
        content: "";
        position: absolute;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background-color: white;
        top: 2px;
        left: 2px;
        transition: transform 0.3s;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      .smartstream-switch.active::after {
        transform: translateX(14px);
      }

      .smartstream-duration-controls {
        display: flex;
        gap: 12px;
        align-items: center;
        font-size: 12px;
        color: var(--yt-spec-text-secondary, #aaa);
      }

      .smartstream-duration-control {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .smartstream-slider {
        width: 60px;
        height: 3px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.2);
        outline: none;
        border-radius: 2px;
        cursor: pointer;
      }

      .smartstream-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 10px;
        height: 10px;
        background: #ff0000;
        cursor: pointer;
        border-radius: 50%;
      }

      .smartstream-value {
        min-width: 32px;
        text-align: right;
        color: var(--yt-spec-text-primary, #fff);
      }

      .smartstream-stats {
        display: flex;
        gap: 12px;
        margin-left: 12px;
        font-size: 12px;
        color: var(--yt-spec-text-secondary, #aaa);
      }

      .smartstream-premium-badge {
        font-size: 16px;
        margin-left: 4px;
        cursor: pointer;
      }

      @media (max-width: 950px) {
        #smartstream-container {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  getElement(): HTMLElement {
    return this.container;
  }

  destroy(): void {
    this.container.remove();
  }
}