import type { FilterSettings } from '../types';

console.log('[SmartStream] Loading YouTube integration');
console.log('[SmartStream] Current URL:', window.location.href);
console.log('[SmartStream] Document ready state:', document.readyState);

class YouTubeHeaderIntegration {
  private settings: FilterSettings = {
    minDuration: 5,
    maxDuration: 30,
    enabled: true
  };

  constructor() {
    this.waitForHeader();
  }

  private waitForHeader() {
    console.log('[SmartStream] Waiting for YouTube header...');
    
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      
      // Try multiple selectors for the voice search button
      const voiceSearchButton = document.querySelector('#voice-search-button') ||
                               document.querySelector('button[aria-label*="voice search" i]') ||
                               document.querySelector('button[aria-label*="søk med stemmen" i]');
      
      // Try to find the right side buttons container
      const endButtons = document.querySelector('#end') ||
                        document.querySelector('ytd-masthead #buttons') ||
                        document.querySelector('#container #end');
      
      if (voiceSearchButton && endButtons && !document.getElementById('smartstream-container')) {
        console.log('[SmartStream] Found header elements, injecting controls');
        clearInterval(checkInterval);
        
        // Find the best insertion point - between voice search and create button
        const voiceSearchContainer = voiceSearchButton.closest('div[id="voice-search-button"]')?.parentElement;
        const insertTarget = voiceSearchContainer || voiceSearchButton.parentElement;
        
        this.injectControls(insertTarget!);
      } else if (attempts > 30) {
        console.log('[SmartStream] Could not find header elements after 30 attempts');
        console.log('[SmartStream] Voice button:', !!voiceSearchButton);
        console.log('[SmartStream] End buttons:', !!endButtons);
        clearInterval(checkInterval);
      }
    }, 1000);
  }

  private injectControls(targetElement: Element) {
    console.log('[SmartStream] Injecting controls after element:', targetElement);
    
    // Create styles
    const style = document.createElement('style');
    style.textContent = `
      #smartstream-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0px 12px;
        height: 40px;
      }

      #smartstream-container.disabled {
        opacity: 0.5;
      }

      .smartstream-toggle {
        display: flex;
        align-items: center;
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
        color: var(--yt-spec-text-secondary);
        font-family: Roboto, Arial, sans-serif;
      }

      .smartstream-duration-control {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .smartstream-duration-control span:first-child {
        color: var(--yt-spec-text-secondary);
        font-weight: 400;
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
        transition: background 0.2s;
      }
      
      .smartstream-slider:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .smartstream-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 10px;
        height: 10px;
        background: #ff0000;
        cursor: pointer;
        border-radius: 50%;
        transition: transform 0.1s;
      }
      
      .smartstream-slider:hover::-webkit-slider-thumb {
        transform: scale(1.2);
      }

      .smartstream-slider::-moz-range-thumb {
        width: 10px;
        height: 10px;
        background: #ff0000;
        cursor: pointer;
        border-radius: 50%;
        border: none;
        transition: transform 0.1s;
      }
      
      .smartstream-slider:hover::-moz-range-thumb {
        transform: scale(1.2);
      }

      .smartstream-value {
        min-width: 32px;
        text-align: right;
        font-weight: 400;
        font-family: Roboto, Arial, sans-serif;
        color: var(--yt-spec-text-primary);
      }

      @media (max-width: 1100px) {
        .smartstream-slider {
          width: 50px;
        }
        
        .smartstream-duration-controls {
          gap: 8px;
        }
      }

      @media (max-width: 950px) {
        #smartstream-container {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);

    // Create container
    const container = document.createElement('div');
    container.id = 'smartstream-container';
    container.className = this.settings.enabled ? '' : 'disabled';
    
    // Create toggle
    const toggle = document.createElement('div');
    toggle.className = 'smartstream-toggle';
    toggle.innerHTML = `<div class="smartstream-switch ${this.settings.enabled ? 'active' : ''}" id="smartstream-toggle"></div>`;
    
    // Create duration controls
    const durationControls = document.createElement('div');
    durationControls.className = 'smartstream-duration-controls';
    durationControls.innerHTML = `
      <div class="smartstream-duration-control">
        <span>Min:</span>
        <input type="range" class="smartstream-slider" id="smartstream-min" 
               min="0" max="240" value="${this.settings.minDuration}">
        <span class="smartstream-value" id="smartstream-min-value">${this.formatDuration(this.settings.minDuration)}</span>
      </div>
      <div class="smartstream-duration-control">
        <span>Max:</span>
        <input type="range" class="smartstream-slider" id="smartstream-max" 
               min="0" max="240" value="${this.settings.maxDuration}">
        <span class="smartstream-value" id="smartstream-max-value">${this.formatDuration(this.settings.maxDuration)}</span>
      </div>
    `;
    
    container.appendChild(toggle);
    container.appendChild(durationControls);
    
    // Insert after voice search button
    targetElement.insertAdjacentElement('afterend', container);
    
    // Load settings and setup listeners
    this.loadSettings();
    this.setupListeners();
    
    console.log('[SmartStream] Controls injected successfully');
  }

  private setupListeners() {
    const toggleElement = document.getElementById('smartstream-toggle');
    const minSlider = document.getElementById('smartstream-min') as HTMLInputElement;
    const maxSlider = document.getElementById('smartstream-max') as HTMLInputElement;
    const minValue = document.getElementById('smartstream-min-value');
    const maxValue = document.getElementById('smartstream-max-value');
    const container = document.getElementById('smartstream-container');

    toggleElement?.addEventListener('click', () => {
      this.settings.enabled = !this.settings.enabled;
      toggleElement.classList.toggle('active');
      container?.classList.toggle('disabled');
      this.updateSettings({ enabled: this.settings.enabled });
      this.filterVideos();
    });

    minSlider?.addEventListener('input', () => {
      const value = parseInt(minSlider.value);
      if (value > parseInt(maxSlider.value)) {
        maxSlider.value = minSlider.value;
        if (maxValue) maxValue.textContent = this.formatDuration(value);
      }
      if (minValue) minValue.textContent = this.formatDuration(value);
      this.settings.minDuration = value;
      this.updateSettings({ minDuration: value });
      this.filterVideos();
    });

    maxSlider?.addEventListener('input', () => {
      const value = parseInt(maxSlider.value);
      if (value < parseInt(minSlider.value)) {
        minSlider.value = maxSlider.value;
        if (minValue) minValue.textContent = this.formatDuration(value);
      }
      if (maxValue) maxValue.textContent = this.formatDuration(value);
      this.settings.maxDuration = value;
      this.updateSettings({ maxDuration: value });
      this.filterVideos();
    });
  }

  private loadSettings() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings: FilterSettings) => {
      if (settings) {
        this.settings = settings;
        this.updateUI();
      }
    });

    // Listen for settings updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SETTINGS_UPDATED') {
        this.settings = message.settings;
        this.updateUI();
        this.filterVideos();
      }
    });
  }

  private updateUI() {
    const toggle = document.getElementById('smartstream-toggle');
    const minSlider = document.getElementById('smartstream-min') as HTMLInputElement;
    const maxSlider = document.getElementById('smartstream-max') as HTMLInputElement;
    const minValue = document.getElementById('smartstream-min-value');
    const maxValue = document.getElementById('smartstream-max-value');
    const container = document.getElementById('smartstream-container');

    if (toggle) toggle.classList.toggle('active', this.settings.enabled);
    if (container) container.classList.toggle('disabled', !this.settings.enabled);
    if (minSlider) minSlider.value = this.settings.minDuration.toString();
    if (maxSlider) maxSlider.value = this.settings.maxDuration.toString();
    if (minValue) minValue.textContent = this.formatDuration(this.settings.minDuration);
    if (maxValue) maxValue.textContent = this.formatDuration(this.settings.maxDuration);
  }

  private updateSettings(update: Partial<FilterSettings>) {
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: update });
  }

  private filterVideos() {
    if (!this.settings.enabled) {
      document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer')
        .forEach(video => {
          (video as HTMLElement).style.display = '';
        });
      return;
    }

    const videos = document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer');
    
    videos.forEach(video => {
      const durationElement = video.querySelector('span.ytd-thumbnail-overlay-time-status-renderer, ytd-thumbnail-overlay-time-status-renderer');
      if (durationElement) {
        const duration = this.parseDuration(durationElement.textContent?.trim() || '');
        const shouldShow = duration >= this.settings.minDuration * 60 && 
                          duration <= this.settings.maxDuration * 60;
        (video as HTMLElement).style.display = shouldShow ? '' : 'none';
      }
    });
  }

  private parseDuration(durationText: string): number {
    const parts = durationText.split(':').map(p => parseInt(p));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }

  private formatDuration(minutes: number): string {
    if (minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new YouTubeHeaderIntegration());
} else {
  new YouTubeHeaderIntegration();
}
