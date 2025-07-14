/**
 * YouTube-specific adapter
 */

import { BasePlatformAdapter } from '../base-adapter';
import { VideoMetadata } from '../../core/domain/video';

export class YouTubeAdapter extends BasePlatformAdapter {
  private readonly selectors = {
    videos: 'ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer',
    duration: 'span.ytd-thumbnail-overlay-time-status-renderer, ytd-thumbnail-overlay-time-status-renderer',
    title: '#video-title',
    channel: '#channel-name',
    views: '#metadata-line span:first-child',
    voiceButton: '#voice-search-button',
    headerEnd: '#end'
  };

  getPlatformName(): string {
    return 'youtube';
  }

  findVideoElements(): Element[] {
    return Array.from(document.querySelectorAll(this.selectors.videos));
  }

  extractMetadata(element: Element): VideoMetadata | null {
    const durationElement = element.querySelector(this.selectors.duration);
    if (!durationElement) return null;

    const titleElement = element.querySelector(this.selectors.title);
    const channelElement = element.querySelector(this.selectors.channel);

    const durationText = durationElement.textContent?.trim() || '';
    const duration = this.parseDuration(durationText);

    return {
      id: this.generateId(element),
      title: titleElement?.textContent?.trim() || 'Unknown',
      duration,
      channel: channelElement?.textContent?.trim(),
      platform: 'youtube'
    };
  }

  injectControls(container: Element): void {
    // Find header injection point
    const voiceButton = document.querySelector(this.selectors.voiceButton);
    if (!voiceButton) {
      console.warn('[YouTubeAdapter] Could not find voice button for injection');
      return;
    }

    const targetElement = voiceButton.closest('div[id="voice-search-button"]')?.parentElement || voiceButton.parentElement;
    if (targetElement) {
      targetElement.insertAdjacentElement('afterend', container);
    }
  }

  private parseDuration(durationText: string): number {
    const cleanText = durationText.trim().split('\n')[0]?.trim() || '';
    const parts = cleanText.split(':').map(p => parseInt(p));
    
    if (parts.length === 3) {
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    } else if (parts.length === 2) {
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    } else if (parts.length === 1) {
      return parts[0] || 0;
    }
    return 0;
  }

  protected override generateId(element: Element): string {
    // Try to get video ID from href
    const link = element.querySelector('a#thumbnail');
    if (link) {
      const href = link.getAttribute('href');
      const match = href?.match(/\/watch\?v=([^&]+)/);
      if (match) {
        return `youtube_${match[1]}`;
      }
    }
    
    return super.generateId(element);
  }
}