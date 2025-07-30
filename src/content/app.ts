/**
 * Main application entry point - Clean architecture implementation
 */

import { createContainer } from '../core/infrastructure/container';
import { HeaderControls } from '../ui/components/controls/header-controls';
import { OptimizedObserver } from './optimized-observer';
import { FilterCriteria } from '../core/domain/filter';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { InlinePaywall } from '../ui/components/modals/inline-paywall';

export class SmartStreamApp {
  private container = createContainer();
  private headerControls: HeaderControls | null = null;
  private observer: OptimizedObserver | null = null;
  private initialized = false;
  // VideoCache is available for future use
  // private videoCache = VideoCache.getInstance();
  private performanceMonitor = PerformanceMonitor.getInstance();
  private videosWithMissingDuration = new Set<Element>();
  private retryTimer: number | null = null;
  private filterDebounceTimer: number | null = null;
  private lastFilterTime = 0;
  private quickHideStyleElement: HTMLStyleElement | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[SmartStream] Initializing with clean architecture...');

    try {
      // Load initial settings
      const criteria = await this.container.settingsRepository.getFilterCriteria();
      const enabled = await this.container.settingsRepository.isEnabled();
      
      // Check premium status
      const userPlan = await chrome.storage.sync.get(['userPlan']);
      const isPremium = userPlan.userPlan?.type === 'premium';
      
      // Load premium filters if available
      if (isPremium) {
        const premiumFilters = await chrome.storage.sync.get(['premiumFilters']);
        if (premiumFilters.premiumFilters) {
          criteria.keywords = premiumFilters.premiumFilters.keywords || [];
          criteria.channels = premiumFilters.premiumFilters.channels || [];
          criteria.excludeChannels = premiumFilters.premiumFilters.excludeChannels || [];
          await this.container.settingsRepository.saveFilterCriteria(criteria);
        }
      }

      // Wait for header
      await this.waitForHeader();

      // Create UI controls
      this.headerControls = new HeaderControls({
        criteria,
        enabled,
        isPremium,
        onCriteriaChange: (newCriteria) => this.handleCriteriaChange(newCriteria),
        onToggle: (newEnabled) => this.handleToggle(newEnabled)
      }, this.container.eventBus);

      // Inject controls
      this.container.currentAdapter.injectControls(this.headerControls.getElement());

      // Setup video observer
      this.setupObserver();

      // Initial filtering
      await this.filterVideos();

      // Listen for storage changes
      this.container.settingsRepository.onChange(async (criteria, enabled) => {
        // Update header controls when storage changes
        if (this.headerControls) {
          this.headerControls.updateEnabled(enabled);
          this.headerControls.updateCriteriaValues(criteria);
        }
        await this.filterVideos();
      });

      // Listen for messages from popup/background
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        this.handleMessage(message, sendResponse);
        return true; // Keep channel open for async response
      });

      this.initialized = true;
      console.log('[SmartStream] Initialization complete');
      
      // Start performance monitoring
      this.performanceMonitor.start();
      
      // Listen for YouTube navigation changes
      this.setupNavigationListener();
      
      // Setup instant hide style element
      this.setupInstantHideStyles();

    } catch (error) {
      console.error('[SmartStream] Initialization failed:', error);
    }
  }

  private async waitForHeader(): Promise<void> {
    return new Promise((resolve) => {
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        
        const voiceButton = document.querySelector('#voice-search-button');
        const endButtons = document.querySelector('#end');
        
        if (voiceButton && endButtons && !document.getElementById('smartstream-container')) {
          clearInterval(checkInterval);
          resolve();
        } else if (attempts > 30) {
          clearInterval(checkInterval);
          console.warn('[SmartStream] Header not found after 30 attempts');
          resolve(); // Resolve anyway to prevent hanging
        }
      }, 1000);
    });
  }

  private setupObserver(): void {
    this.observer = new OptimizedObserver(async (newVideos) => {
      console.log(`[SmartStream] Observer triggered, processing ${newVideos.length} new videos`);
      
      // Only process the new videos, not all videos on the page
      const criteria = await this.container.settingsRepository.getFilterCriteria();
      const enabled = await this.container.settingsRepository.isEnabled();
      
      if (enabled && newVideos.length > 0) {
        // Process only the new videos
        await this.filterNewVideos(newVideos, criteria);
      }
    });

    this.observer.start();
    
    // Setup chip button click detection
    this.setupChipButtonListeners();
  }

  private async handleCriteriaChange(criteria: FilterCriteria): Promise<void> {
    await this.container.settingsRepository.saveFilterCriteria(criteria);
    await this.filterVideos();
  }

  private async handleToggle(enabled: boolean): Promise<void> {
    await this.container.settingsRepository.setEnabled(enabled);
    await this.filterVideos();
  }
  
  private setupChipButtonListeners(): void {
    // Use event delegation on the document to catch all chip button clicks
    document.addEventListener('click', (event) => {
      const target = event.target as Element;
      
      // Check if the clicked element is inside a chip button
      const chipButton = target.closest('yt-chip-cloud-chip-renderer button, chip-shape button');
      
      if (chipButton) {
        console.log('[SmartStream] Chip button clicked, triggering instant filter...');
        
        // INSTANTLY hide videos using CSS (no async, no waiting)
        this.instantHideVideos();
        
        // Then do the proper filtering in the background
        this.scheduleFullFilter();
      }
    }, true); // Use capture to ensure we get the event
  }
  
  private setupInstantHideStyles(): void {
    // Create a style element for instant hiding
    this.quickHideStyleElement = document.createElement('style');
    this.quickHideStyleElement.id = 'smartstream-quick-hide';
    document.head.appendChild(this.quickHideStyleElement);
  }
  
  private instantHideVideos(): void {
    const startTime = performance.now();
    
    // Check if filtering is enabled
    const enabledStr = localStorage.getItem('smartstream-filter-enabled');
    if (enabledStr && JSON.parse(enabledStr) === false) return;
    
    // Get filter criteria synchronously from localStorage for speed
    const stored = localStorage.getItem('smartstream-filter-criteria');
    if (!stored) return;
    
    const criteria = JSON.parse(stored) as FilterCriteria;
    const minDuration = criteria.minDuration || 0;
    const maxDuration = criteria.maxDuration || Infinity;
    
    // Build CSS selectors for instant hiding
    const hideSelectors: string[] = [];
    
    // Find all videos and check their duration immediately
    const videos = document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer');
    
    videos.forEach((video, index) => {
      const durationEl = video.querySelector('span.ytd-thumbnail-overlay-time-status-renderer, ytd-thumbnail-overlay-time-status-renderer');
      if (!durationEl) return;
      
      const durationText = durationEl.textContent?.trim() || '';
      const duration = this.quickParseDuration(durationText);
      
      // If duration is outside range, add to hide list
      if (duration < minDuration || duration > maxDuration) {
        // Add a unique attribute to this video for CSS targeting
        video.setAttribute('data-smartstream-hide', 'true');
        hideSelectors.push(`[data-smartstream-hide="true"]:nth-child(${index + 1})`);
      } else {
        // Make sure it's visible
        video.removeAttribute('data-smartstream-hide');
      }
    });
    
    // Apply instant CSS hiding
    if (this.quickHideStyleElement) {
      this.quickHideStyleElement.textContent = `
        [data-smartstream-hide="true"] {
          display: none !important;
        }
      `;
    }
    
    const endTime = performance.now();
    console.log(`[SmartStream] Instant hide completed in ${(endTime - startTime).toFixed(2)}ms`);
  }
  
  private quickParseDuration(text: string): number {
    const parts = text.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 3 && parts[0] !== undefined && parts[1] !== undefined && parts[2] !== undefined) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
  }
  
  private scheduleFullFilter(): void {
    // Do the full filtering with proper async handling
    requestAnimationFrame(async () => {
      await this.quickFilterExistingVideos();
      await this.waitForYouTubeContentLoadFast();
      await this.filterVideos();
    });
  }
  
  private async quickFilterExistingVideos(): Promise<void> {
    const criteria = await this.container.settingsRepository.getFilterCriteria();
    const enabled = await this.container.settingsRepository.isEnabled();
    
    if (!enabled) return;
    
    // Immediately filter existing videos without waiting
    const elements = this.container.currentAdapter.findVideoElements();
    await this.filterNewVideos(elements, criteria);
  }
  
  
  private async waitForYouTubeContentLoadFast(): Promise<void> {
    return new Promise((resolve) => {
      let checkCount = 0;
      const maxChecks = 20; // Max 1 second
      
      const checkInterval = setInterval(() => {
        checkCount++;
        
        // More aggressive loading detection
        const hasVideos = document.querySelector('ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer') !== null;
        const isLoading = document.querySelector('ytd-skeleton-renderer, paper-spinner-lite[active]') !== null;
        
        // If we have videos and no loading indicators, we're done
        if ((hasVideos && !isLoading) || checkCount >= maxChecks) {
          clearInterval(checkInterval);
          // Minimal delay - just one frame
          requestAnimationFrame(() => resolve());
        }
      }, 50); // Check every 50ms instead of 100ms
    });
  }
  
  private setupNavigationListener(): void {
    // YouTube uses the yt-navigate-finish event for SPA navigation
    window.addEventListener('yt-navigate-finish', async () => {
      console.log('[SmartStream] YouTube navigation detected, re-filtering...');
      // Use the fast content load detection
      requestAnimationFrame(async () => {
        await this.waitForYouTubeContentLoadFast();
        await this.filterVideos();
      });
    });
  }

  private async filterVideos(): Promise<void> {
    // Debounce rapid filter calls
    const now = Date.now();
    if (now - this.lastFilterTime < 100) {
      // If we're calling too rapidly, debounce
      if (this.filterDebounceTimer) {
        clearTimeout(this.filterDebounceTimer);
      }
      
      this.filterDebounceTimer = window.setTimeout(() => {
        this.filterVideos();
      }, 100);
      return;
    }
    
    this.lastFilterTime = now;
    
    const criteria = await this.container.settingsRepository.getFilterCriteria();
    const enabled = await this.container.settingsRepository.isEnabled();
    
    await this.container.filterVideosUseCase.execute(criteria, enabled);
    
    // Check for videos with missing durations and schedule retry
    this.checkForMissingDurations();
  }
  
  private checkForMissingDurations(): void {
    // Clear any existing retry timer
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    
    // Find videos with 0 duration that might need retry
    const elements = this.container.currentAdapter.findVideoElements();
    this.videosWithMissingDuration.clear();
    
    let videosNeedingRetry = 0;
    
    for (const element of elements) {
      const metadata = this.container.currentAdapter.extractMetadata(element);
      if (metadata && metadata.duration === 0) {
        // Check if this is actually a video that should have duration
        const liveIndicators = element.querySelectorAll('span.ytd-badge-supported-renderer');
        let isLive = false;
        
        for (const indicator of liveIndicators) {
          const text = indicator.textContent?.toUpperCase() || '';
          if (text.includes('LIVE') || text.includes('PREMIERE')) {
            isLive = true;
            break;
          }
        }
        
        if (!isLive) {
          // Not a live video, so it should have duration - needs retry
          this.videosWithMissingDuration.add(element);
          videosNeedingRetry++;
        }
      }
    }
    
    // If we have videos with missing durations, schedule a single retry
    if (videosNeedingRetry > 0) {
      console.log(`[SmartStream] Found ${videosNeedingRetry} videos with missing durations, scheduling retry...`);
      
      // Schedule a single retry after 2 seconds
      this.retryTimer = window.setTimeout(() => {
        this.retryMissingDurations();
      }, 2000);
    }
  }
  
  private async retryMissingDurations(): Promise<void> {
    if (this.videosWithMissingDuration.size === 0) return;
    
    console.log(`[SmartStream] Retrying ${this.videosWithMissingDuration.size} videos with missing durations...`);
    
    // Only re-filter the videos that had missing durations
    const criteria = await this.container.settingsRepository.getFilterCriteria();
    const enabled = await this.container.settingsRepository.isEnabled();
    
    if (enabled) {
      const videosToRetry = Array.from(this.videosWithMissingDuration);
      await this.filterNewVideos(videosToRetry, criteria);
    }
    
    this.videosWithMissingDuration.clear();
  }

  private async handleMessage(message: any, sendResponse: (response: any) => void): Promise<void> {
    switch (message.type) {
      case 'GET_SETTINGS':
        const criteria = await this.container.settingsRepository.getFilterCriteria();
        const enabled = await this.container.settingsRepository.isEnabled();
        sendResponse({
          minDuration: Math.floor((criteria.minDuration || 300) / 60),
          maxDuration: Math.floor((criteria.maxDuration || 1800) / 60),
          enabled
        });
        break;

      case 'UPDATE_SETTINGS':
        if (message.settings.minDuration !== undefined) {
          const criteria = await this.container.settingsRepository.getFilterCriteria();
          criteria.minDuration = message.settings.minDuration * 60;
          await this.container.settingsRepository.saveFilterCriteria(criteria);
        }
        if (message.settings.maxDuration !== undefined) {
          const criteria = await this.container.settingsRepository.getFilterCriteria();
          criteria.maxDuration = message.settings.maxDuration * 60;
          await this.container.settingsRepository.saveFilterCriteria(criteria);
        }
        if (message.settings.enabled !== undefined) {
          await this.container.settingsRepository.setEnabled(message.settings.enabled);
        }
        await this.filterVideos();
        break;
        
      case 'SETTINGS_UPDATED':
        await this.filterVideos();
        sendResponse({ success: true });
        break;
        
      case 'SHOW_PAYWALL':
        await InlinePaywall.show(message.feature || 'Premium Feature');
        break;
        
      case 'GET_STATS':
        const stats = await this.getStats();
        sendResponse(stats);
        break;
        
      case 'UPDATE_PREMIUM_FILTERS':
        if (message.filters) {
          const criteria = await this.container.settingsRepository.getFilterCriteria();
          
          // Update all filter properties
          if (message.filters.keywords !== undefined) {
            criteria.keywords = message.filters.keywords;
          }
          if (message.filters.channels !== undefined) {
            criteria.channels = message.filters.channels;
          }
          if (message.filters.excludeChannels !== undefined) {
            criteria.excludeChannels = message.filters.excludeChannels;
          }
          if (message.filters.uploadedAfter !== undefined) {
            criteria.uploadedAfter = message.filters.uploadedAfter;
          }
          if (message.filters.minViews !== undefined) {
            criteria.minViews = message.filters.minViews;
          }
          if (message.filters.maxViews !== undefined) {
            criteria.maxViews = message.filters.maxViews;
          }
          
          await this.container.settingsRepository.saveFilterCriteria(criteria);
          await this.filterVideos();
        }
        break;
        
      case 'PAYMENT_PROCESSING':
        console.log('[SmartStream] Payment processing:', message);
        
        // Show processing toast
        const { showInfoToast } = await import('../ui/components/feedback/toast');
        showInfoToast(message.message || 'Processing payment...');
        break;
        
      case 'PAYMENT_SUCCESS':
        console.log('[SmartStream] Payment success received:', message);
        
        // Show success toast
        const { showSuccessToast } = await import('../ui/components/feedback/toast');
        showSuccessToast(`Successfully upgraded to ${message.plan} plan!`);
        
        // Refresh UI components to show premium features
        this.container.eventBus.emit('license-updated', { 
          licensed: true,
          plan: message.plan 
        });
        
        // Reinitialize UI to show premium features
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        break;
    }
  }
  
  private async getStats(): Promise<any> {
    // Get stats from the last filter operation
    return new Promise((resolve) => {
      this.container.eventBus.once('videos-filtered', (data: any) => {
        resolve({
          videosShown: data.shown.length,
          videosHidden: data.hidden.length,
          totalTimeHidden: data.totalTimeSaved
        });
      });
      // Trigger a filter to get current stats
      this.filterVideos();
    });
  }

  destroy(): void {
    this.observer?.stop();
    this.headerControls?.destroy();
    this.container.eventBus.clear();
    
    // Clear timers
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
      this.filterDebounceTimer = null;
    }
    
    // Remove quick hide styles
    if (this.quickHideStyleElement) {
      this.quickHideStyleElement.remove();
      this.quickHideStyleElement = null;
    }
    
    this.videosWithMissingDuration.clear();
  }
  
  private async filterNewVideos(elements: Element[], criteria: FilterCriteria): Promise<void> {
    // Extract metadata and create Video objects for new elements only
    const videos = [];
    
    for (const element of elements) {
      const metadata = this.container.currentAdapter.extractMetadata(element);
      if (metadata) {
        const video = new (await import('../core/domain/video')).Video(metadata, element);
        videos.push(video);
      }
    }
    
    if (videos.length === 0) return;
    
    // Apply filters to only these new videos
    const filter = new (await import('../core/domain/filter')).CompositeFilter(criteria);
    let hiddenCount = 0;
    let totalTimeSaved = 0;
    
    for (const video of videos) {
      if (filter.matches(video)) {
        this.container.currentAdapter.show(video);
      } else {
        this.container.currentAdapter.hide(video);
        hiddenCount++;
        totalTimeSaved += video.metadata.duration;
      }
    }
    
    // Check for videos with missing durations
    for (const element of elements) {
      const metadata = this.container.currentAdapter.extractMetadata(element);
      if (metadata && metadata.duration === 0) {
        // Check if this is actually a video that should have duration
        const liveIndicators = element.querySelectorAll('span.ytd-badge-supported-renderer');
        let isLive = false;
        
        for (const indicator of liveIndicators) {
          const text = indicator.textContent?.toUpperCase() || '';
          if (text.includes('LIVE') || text.includes('PREMIERE')) {
            isLive = true;
            break;
          }
        }
        
        if (!isLive) {
          this.videosWithMissingDuration.add(element);
        }
      }
    }
    
    // Schedule retry only if needed and not already scheduled
    if (this.videosWithMissingDuration.size > 0 && !this.retryTimer) {
      console.log(`[SmartStream] ${this.videosWithMissingDuration.size} new videos need duration retry`);
      this.retryTimer = window.setTimeout(() => {
        this.retryMissingDurations();
      }, 2000);
    }
    
    console.log(`[SmartStream] Filtered ${videos.length} new videos, hidden: ${hiddenCount}`);
  }
}

// Auto-start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SmartStreamApp().initialize();
  });
} else {
  new SmartStreamApp().initialize();
}