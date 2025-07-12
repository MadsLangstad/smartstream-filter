import { FilterSettings, VideoMetadata } from '../types';
import { injectStyles } from './youtube-styles';

class YouTubeFilter {
  private settings: FilterSettings = {
    minDuration: 5,
    maxDuration: 30,
    enabled: true
  };
  private observer: MutationObserver | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    injectStyles();
    await this.loadSettings();
    this.setupMessageListeners();
    this.injectUI();
    this.startObserving();
  }

  private async loadSettings() {
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings: FilterSettings) => {
        this.settings = settings;
        resolve();
      });
    });
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATED') {
        this.settings = message.settings;
        this.filterVideos();
      }
    });
  }

  private injectUI() {
    const checkHeader = setInterval(() => {
      const header = document.querySelector('#masthead-container') || 
                     document.querySelector('#header') ||
                     document.querySelector('ytd-masthead');
      
      if (header) {
        clearInterval(checkHeader);
        this.createFilterControls(header);
      }
    }, 1000);
  }

  private createFilterControls(header: Element) {
    const existingControls = document.getElementById('smartstream-controls');
    if (existingControls) return;

    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'smartstream-controls';
    controlsContainer.className = 'smartstream-controls';
    
    controlsContainer.innerHTML = `
      <div class="smartstream-toggle">
        <label class="smartstream-switch">
          <input type="checkbox" id="smartstream-enabled" ${this.settings.enabled ? 'checked' : ''}>
          <span class="smartstream-slider"></span>
        </label>
      </div>
      <div class="smartstream-duration-controls">
        <label>
          <span>Min:</span>
          <input type="range" id="smartstream-min" min="0" max="240" value="${this.settings.minDuration}">
          <span id="smartstream-min-value">${this.formatDuration(this.settings.minDuration)}</span>
        </label>
        <label>
          <span>Max:</span>
          <input type="range" id="smartstream-max" min="0" max="240" value="${this.settings.maxDuration}">
          <span id="smartstream-max-value">${this.formatDuration(this.settings.maxDuration)}</span>
        </label>
      </div>
    `;

    const endContainer = header.querySelector('#end') || header.querySelector('#buttons');
    if (endContainer) {
      endContainer.parentElement?.insertBefore(controlsContainer, endContainer);
    } else {
      header.appendChild(controlsContainer);
    }

    this.setupControlListeners();
  }

  private setupControlListeners() {
    const enabledToggle = document.getElementById('smartstream-enabled') as HTMLInputElement;
    const minSlider = document.getElementById('smartstream-min') as HTMLInputElement;
    const maxSlider = document.getElementById('smartstream-max') as HTMLInputElement;
    const minValue = document.getElementById('smartstream-min-value');
    const maxValue = document.getElementById('smartstream-max-value');

    enabledToggle?.addEventListener('change', (e) => {
      this.updateSettings({ enabled: (e.target as HTMLInputElement).checked });
    });

    minSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      if (minValue) minValue.textContent = this.formatDuration(value);
      this.updateSettings({ minDuration: value });
    });

    maxSlider?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      if (maxValue) maxValue.textContent = this.formatDuration(value);
      this.updateSettings({ maxDuration: value });
    });
  }

  private updateSettings(update: Partial<FilterSettings>) {
    this.settings = { ...this.settings, ...update };
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: update });
    this.filterVideos();
  }

  private startObserving() {
    this.observer = new MutationObserver(() => {
      this.filterVideos();
    });

    const targetNode = document.querySelector('#content') || document.body;
    this.observer.observe(targetNode, {
      childList: true,
      subtree: true
    });
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
      const metadata = this.extractVideoMetadata(video);
      if (metadata && metadata.duration !== null) {
        const shouldShow = metadata.duration >= this.settings.minDuration * 60 && 
                          metadata.duration <= this.settings.maxDuration * 60;
        (video as HTMLElement).style.display = shouldShow ? '' : 'none';
      }
    });
  }

  private extractVideoMetadata(videoElement: Element): VideoMetadata | null {
    const durationElement = videoElement.querySelector('span.ytd-thumbnail-overlay-time-status-renderer, ytd-thumbnail-overlay-time-status-renderer');
    const titleElement = videoElement.querySelector('#video-title');
    const channelElement = videoElement.querySelector('#channel-name a, ytd-channel-name a');

    if (!durationElement || !titleElement) return null;

    const duration = this.parseDuration(durationElement.textContent?.trim() || '');
    
    return {
      id: videoElement.getAttribute('data-video-id') || '',
      title: titleElement.textContent?.trim() || '',
      duration,
      channel: channelElement?.textContent?.trim() || ''
    };
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
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

new YouTubeFilter();