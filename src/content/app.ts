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
          criteria.keywordFilters = premiumFilters.premiumFilters.keywords || [];
          criteria.channelFilters = premiumFilters.premiumFilters.channels || [];
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
    this.observer = new OptimizedObserver(async (_videos) => {
      // Process only new videos through our use case
      const criteria = await this.container.settingsRepository.getFilterCriteria();
      const enabled = await this.container.settingsRepository.isEnabled();
      
      if (enabled) {
        await this.container.filterVideosUseCase.execute(criteria, enabled);
      }
    });

    this.observer.start();
  }

  private async handleCriteriaChange(criteria: FilterCriteria): Promise<void> {
    await this.container.settingsRepository.saveFilterCriteria(criteria);
    await this.filterVideos();
  }

  private async handleToggle(enabled: boolean): Promise<void> {
    await this.container.settingsRepository.setEnabled(enabled);
    await this.filterVideos();
  }

  private async filterVideos(): Promise<void> {
    const criteria = await this.container.settingsRepository.getFilterCriteria();
    const enabled = await this.container.settingsRepository.isEnabled();
    
    await this.container.filterVideosUseCase.execute(criteria, enabled);
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
          criteria.keywordFilters = message.filters.keywords || [];
          criteria.channelFilters = message.filters.channels || [];
          await this.container.settingsRepository.saveFilterCriteria(criteria);
          await this.filterVideos();
        }
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