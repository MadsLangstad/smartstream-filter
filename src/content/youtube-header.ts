import { VideoCache } from './video-cache';
import { OptimizedObserver } from './optimized-observer';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { ContentPaywall } from './paywall-content';
import { createLogger } from '../utils/logger';

const logger = createLogger('YouTube');

interface FilterSettings {
  minDuration: number;
  maxDuration: number;
  enabled: boolean;
}

logger.info('Loading YouTube integration');
logger.debug('Current URL:', window.location.href);
logger.debug('Document ready state:', document.readyState);

class YouTubeHeaderIntegration {
  private settings: FilterSettings = {
    minDuration: 5,
    maxDuration: 30,
    enabled: true
  };

  private observer: OptimizedObserver | null = null;
  private videoCache = new VideoCache();
  private performanceMonitor = new PerformanceMonitor();
  private paywall = ContentPaywall.getInstance();
  private isPremium = false;
  
  // Premium filters
  private keywordFilters: string[] = [];
  private channelFilters: string[] = [];
  
  // Performance tracking
  private stats = {
    videosShown: 0,
    videosHidden: 0,
    totalTimeHidden: 0
  };
  
  constructor() {
    this.initializeFeatures();
  }

  private async initializeFeatures() {
    // Check premium status
    this.isPremium = await this.paywall.checkPremiumStatus();
    
    // Load premium filters if user has premium
    if (this.isPremium) {
      await this.loadPremiumFilters();
    }
    
    this.waitForHeader();
    this.setupMutationObserver();
  }
  
  private async loadPremiumFilters() {
    const stored = await chrome.storage.local.get(['keywordFilters', 'channelFilters']);
    
    if (stored.keywordFilters) {
      this.keywordFilters = stored.keywordFilters.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean);
    }
    
    if (stored.channelFilters) {
      this.channelFilters = stored.channelFilters.split(',').map((c: string) => c.trim().toLowerCase()).filter(Boolean);
    }
    
    logger.debug('Loaded premium filters:', { keywords: this.keywordFilters, channels: this.channelFilters });
  }

  private waitForHeader() {
    logger.debug('Waiting for YouTube header...');
    
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
        logger.debug('Found header elements, injecting controls');
        clearInterval(checkInterval);
        
        // Find the best insertion point - between voice search and create button
        const voiceSearchContainer = voiceSearchButton.closest('div[id="voice-search-button"]')?.parentElement;
        const insertTarget = voiceSearchContainer || voiceSearchButton.parentElement;
        
        this.injectControls(insertTarget!);
      } else if (attempts > 30) {
        logger.warn('Could not find header elements after 30 attempts');
        logger.debug('Voice button:', !!voiceSearchButton);
        logger.debug('End buttons:', !!endButtons);
        clearInterval(checkInterval);
      }
    }, 1000);
  }

  private injectControls(targetElement: Element) {
    logger.debug('Injecting controls after element:', targetElement);
    
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
               min="0" max="600" value="${this.settings.minDuration}">
        <span class="smartstream-value" id="smartstream-min-value">${this.formatDuration(this.settings.minDuration)}</span>
      </div>
      <div class="smartstream-duration-control">
        <span>Max:</span>
        <input type="range" class="smartstream-slider" id="smartstream-max" 
               min="0" max="600" value="${this.settings.maxDuration}">
        <span class="smartstream-value" id="smartstream-max-value">${this.formatDuration(this.settings.maxDuration)}</span>
      </div>
    `;

    // Add stats display
    const statsDisplay = document.createElement('div');
    statsDisplay.id = 'smartstream-stats';
    statsDisplay.style.cssText = `
      display: flex;
      gap: 12px;
      margin-left: 12px;
      font-size: 12px;
      color: var(--yt-spec-text-secondary);
      font-family: Roboto, Arial, sans-serif;
    `;
    statsDisplay.innerHTML = `
      <span>Videos: 0/0</span>
      <span>Time saved: 0h 0m</span>
    `;
    
    // Premium indicator removed per user preference
    
    container.appendChild(toggle);
    container.appendChild(durationControls);
    container.appendChild(statsDisplay);
    
    // Add advanced filters button
    const advancedBtn = document.createElement('button');
    advancedBtn.className = 'smartstream-advanced-btn';
    advancedBtn.innerHTML = '⚙️ Advanced';
    advancedBtn.style.cssText = `
      margin-left: 12px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      color: var(--yt-spec-text-primary);
      font-size: 12px;
      font-family: Roboto, Arial, sans-serif;
      cursor: pointer;
      transition: all 0.2s;
    `;
    
    advancedBtn.addEventListener('click', async () => {
      const hasAccess = await this.paywall.requirePremium('advanced_filters');
      if (hasAccess) {
        // Show advanced filters UI
        this.showAdvancedFilters();
      }
    });
    
    container.appendChild(advancedBtn);
    
    // Insert after voice search button
    targetElement.insertAdjacentElement('afterend', container);
    
    // Load settings and setup listeners
    this.loadSettings();
    this.setupListeners();
    
    logger.info('Controls injected successfully');
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

    // Listen for messages
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse): boolean | void => {
      if (message.type === 'SETTINGS_UPDATED') {
        this.settings = message.settings;
        this.updateUI();
        this.filterVideos();
      } else if (message.type === 'SHOW_PAYWALL') {
        // Show paywall when requested from popup
        this.paywall.requirePremium('advanced_filters');
      } else if (message.type === 'GET_STATS') {
        // Send current stats to popup
        sendResponse(this.stats);
        return true; // Keep channel open for async response
      } else if (message.type === 'UPDATE_PREMIUM_FILTERS') {
        // Update premium filters
        if (this.isPremium) {
          this.loadPremiumFilters().then(() => {
            this.filterVideos();
          });
        }
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

  private async filterVideos() {
    await this.performanceMonitor.measure('filterVideos', async () => {
      if (!this.settings.enabled) {
        document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer')
          .forEach(video => {
            (video as HTMLElement).style.display = '';
          });
        return;
      }

      const videos = Array.from(document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer'));
      this.performanceMonitor.recordVideosProcessed(videos.length);
      
      this.stats.videosShown = 0;
      this.stats.videosHidden = 0;
      this.stats.totalTimeHidden = 0;
      
      // Process videos in batches
      for (let i = 0; i < videos.length; i += 20) {
        const batch = videos.slice(i, i + 20);
        requestAnimationFrame(() => this.processBatch(batch));
      }
    });
  }

  private processBatch(videos: Element[]) {
    videos.forEach(video => {
      const videoData = this.videoCache.getVideoData(video);
      
      if (videoData) {
        const durationMinutes = Math.floor(videoData.duration / 60);
        let shouldShow = durationMinutes >= this.settings.minDuration && 
                        durationMinutes <= this.settings.maxDuration;
        
        // Apply premium filters if available
        if (shouldShow && this.isPremium) {
          // Keyword filter
          if (this.keywordFilters.length > 0) {
            const title = this.getVideoTitle(video)?.toLowerCase() || '';
            const hasKeyword = this.keywordFilters.some(keyword => title.includes(keyword));
            if (!hasKeyword) {
              shouldShow = false;
            }
          }
          
          // Channel filter
          if (shouldShow && this.channelFilters.length > 0) {
            const channelName = this.getChannelName(video)?.toLowerCase() || '';
            const isBlockedChannel = this.channelFilters.some(channel => channelName.includes(channel));
            if (isBlockedChannel) {
              shouldShow = false;
            }
          }
        }
        
        (video as HTMLElement).style.display = shouldShow ? '' : 'none';
        
        if (shouldShow) {
          this.stats.videosShown++;
        } else {
          this.stats.videosHidden++;
          this.stats.totalTimeHidden += videoData.duration;
        }
      }
    });
    
    // Update UI with stats
    this.updateStatsDisplay();
  }
  
  private getVideoTitle(video: Element): string | null {
    const titleElement = video.querySelector('#video-title');
    return titleElement?.textContent?.trim() || null;
  }
  
  private getChannelName(video: Element): string | null {
    const channelElement = video.querySelector('#channel-name a, ytd-channel-name a');
    return channelElement?.textContent?.trim() || null;
  }

  private updateStatsDisplay() {
    // Update stats in header if elements exist
    const statsElement = document.getElementById('smartstream-stats');
    if (statsElement) {
      const timeSavedHours = Math.floor(this.stats.totalTimeHidden / 3600);
      const timeSavedMinutes = Math.floor((this.stats.totalTimeHidden % 3600) / 60);
      
      statsElement.innerHTML = `
        <span>Videos: ${this.stats.videosShown}/${this.stats.videosShown + this.stats.videosHidden}</span>
        <span>Time saved: ${timeSavedHours}h ${timeSavedMinutes}m</span>
      `;
    }
    
    // Save stats to storage for popup
    chrome.storage.local.set({ stats: this.stats });
  }

  // Removed - now using VideoCache.parseDuration()

  private formatDuration(minutes: number): string {
    if (minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  
  private showAdvancedFilters(): void {
    // Create advanced filters modal
    const modal = document.createElement('div');
    modal.className = 'ssf-advanced-filters-modal';
    modal.innerHTML = `
      <div class="ssf-af-backdrop">
        <div class="ssf-af-content">
          <h3>Advanced Filters</h3>
          <div class="ssf-af-section">
            <label>Filter by keywords in title:</label>
            <input type="text" id="ssf-keyword-filter" placeholder="e.g., tutorial, review" />
          </div>
          <div class="ssf-af-section">
            <label>Block channels:</label>
            <input type="text" id="ssf-channel-filter" placeholder="Channel names, comma separated" />
          </div>
          <div class="ssf-af-section">
            <label>Custom presets:</label>
            <div class="ssf-presets">
              <button data-min="0" data-max="5">Shorts (0-5m)</button>
              <button data-min="10" data-max="20">Medium (10-20m)</button>
              <button data-min="30" data-max="60">Long (30-60m)</button>
            </div>
          </div>
          <div class="ssf-af-actions">
            <button class="ssf-af-cancel">Cancel</button>
            <button class="ssf-af-apply">Apply Filters</button>
          </div>
        </div>
      </div>
    `;
    
    // Add styles
    this.addAdvancedFiltersStyles();
    
    document.body.appendChild(modal);
    
    // Event handlers
    modal.querySelector('.ssf-af-cancel')?.addEventListener('click', () => modal.remove());
    modal.querySelector('.ssf-af-backdrop')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) modal.remove();
    });
    
    // Preset buttons
    modal.querySelectorAll('.ssf-presets button').forEach(btn => {
      btn.addEventListener('click', () => {
        const min = parseInt(btn.getAttribute('data-min') || '0');
        const max = parseInt(btn.getAttribute('data-max') || '60');
        this.updateSettings({ minDuration: min, maxDuration: max });
        modal.remove();
      });
    });
    
    // Animate in
    requestAnimationFrame(() => modal.classList.add('ssf-show'));
  }
  
  private addAdvancedFiltersStyles(): void {
    if (document.getElementById('ssf-advanced-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ssf-advanced-styles';
    style.textContent = `
      .ssf-advanced-filters-modal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        font-family: Roboto, Arial, sans-serif;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .ssf-advanced-filters-modal.ssf-show {
        opacity: 1;
      }
      
      .ssf-af-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ssf-af-content {
        background: var(--yt-spec-base-background);
        border-radius: 12px;
        padding: 24px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }
      
      .ssf-af-content h3 {
        margin: 0 0 20px;
        font-size: 20px;
        color: var(--yt-spec-text-primary);
      }
      
      .ssf-af-section {
        margin-bottom: 20px;
      }
      
      .ssf-af-section label {
        display: block;
        margin-bottom: 8px;
        color: var(--yt-spec-text-secondary);
        font-size: 14px;
      }
      
      .ssf-af-section input {
        width: 100%;
        padding: 8px 12px;
        background: var(--yt-spec-button-chip-background-hover);
        border: 1px solid var(--yt-spec-10-percent-layer);
        border-radius: 8px;
        color: var(--yt-spec-text-primary);
        font-size: 14px;
      }
      
      .ssf-presets {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .ssf-presets button {
        padding: 8px 16px;
        background: var(--yt-spec-button-chip-background-hover);
        border: none;
        border-radius: 20px;
        color: var(--yt-spec-text-primary);
        font-size: 14px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .ssf-presets button:hover {
        background: var(--yt-spec-badge-chip-background);
      }
      
      .ssf-af-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
      }
      
      .ssf-af-actions button {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      
      .ssf-af-cancel {
        background: transparent;
        color: var(--yt-spec-text-secondary);
      }
      
      .ssf-af-apply {
        background: var(--yt-spec-brand-button-background);
        color: var(--yt-spec-text-primary-inverse);
      }
      
      .ssf-af-actions button:hover {
        opacity: 0.8;
      }
    `;
    document.head.appendChild(style);
  }
  
  private setupMutationObserver() {
    // Use optimized observer
    this.observer = new OptimizedObserver((videos) => {
      // Process only new videos
      videos.forEach(video => {
        const videoData = this.videoCache.getVideoData(video);
        
        if (videoData && this.settings.enabled) {
          const durationMinutes = Math.floor(videoData.duration / 60);
          let shouldShow = durationMinutes >= this.settings.minDuration && 
                          durationMinutes <= this.settings.maxDuration;
          
          // Apply premium filters if available
          if (shouldShow && this.isPremium) {
            // Keyword filter
            if (this.keywordFilters.length > 0) {
              const title = this.getVideoTitle(video)?.toLowerCase() || '';
              const hasKeyword = this.keywordFilters.some(keyword => title.includes(keyword));
              if (!hasKeyword) {
                shouldShow = false;
              }
            }
            
            // Channel filter
            if (shouldShow && this.channelFilters.length > 0) {
              const channelName = this.getChannelName(video)?.toLowerCase() || '';
              const isBlockedChannel = this.channelFilters.some(channel => channelName.includes(channel));
              if (isBlockedChannel) {
                shouldShow = false;
              }
            }
          }
          
          (video as HTMLElement).style.display = shouldShow ? '' : 'none';
          
          if (shouldShow) {
            this.stats.videosShown++;
          } else {
            this.stats.videosHidden++;
            this.stats.totalTimeHidden += videoData.duration;
          }
        }
      });
      
      this.updateStatsDisplay();
    }, {
      debounceMs: 100,
      batchSize: 10
    });
    
    // Start observing when body is available
    const startObserving = () => {
      this.observer?.start();
      // Start performance monitoring
      this.performanceMonitor.startMonitoring(30000); // Report every 30s
    };
    
    if (document.body) {
      startObserving();
    } else {
      document.addEventListener('DOMContentLoaded', startObserving);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new YouTubeHeaderIntegration());
} else {
  new YouTubeHeaderIntegration();
}
