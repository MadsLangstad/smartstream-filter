/**
 * YouTube-specific adapter
 */

import { BasePlatformAdapter } from '../base-adapter';
import { VideoMetadata } from '../../core/domain/video';

export class YouTubeAdapter extends BasePlatformAdapter {
  private readonly selectors = {
    videos: 'ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer',
    duration: 'span.ytd-thumbnail-overlay-time-status-renderer, ytd-thumbnail-overlay-time-status-renderer, span.style-scope.ytd-thumbnail-overlay-time-status-renderer, #overlays ytd-thumbnail-overlay-time-status-renderer span, ytd-thumbnail-overlay-time-status-renderer[aria-label]',
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
    const titleElement = element.querySelector(this.selectors.title);
    const channelElement = element.querySelector(this.selectors.channel);
    const viewsElement = element.querySelector(this.selectors.views);

    // If we don't have a title, the video is likely not fully loaded
    if (!titleElement?.textContent?.trim()) return null;

    // Parse duration, defaulting to 0 if not available yet
    let duration = 0;
    if (durationElement) {
      // Try text content first
      let durationText = durationElement.textContent?.trim() || '';
      
      // If no text content, try aria-label attribute
      if (!durationText && durationElement.hasAttribute('aria-label')) {
        durationText = durationElement.getAttribute('aria-label') || '';
      }
      
      // Also check for nested span elements
      if (!durationText) {
        const innerSpan = durationElement.querySelector('span');
        if (innerSpan) {
          durationText = innerSpan.textContent?.trim() || '';
        }
      }
      
      duration = this.parseDuration(durationText);
    }

    // Extract view count and upload date from metadata line
    const viewCount = this.parseViewCount(viewsElement?.textContent || '');
    const uploadDate = this.parseUploadDate(element);

    const channelName = channelElement?.textContent?.trim();
    
    const metadata: VideoMetadata = {
      id: this.generateId(element),
      title: titleElement.textContent.trim(),
      duration,
      channel: channelName,
      channelName: channelName, // Add channelName for compatibility
      viewCount,
      uploadDate,
      platform: 'youtube' as const
    };
    
    // Debug log for videos with missing duration
    if (duration === 0 && !this.isLiveVideo(element)) {
      console.log(`[YouTubeAdapter] Video "${metadata.title}" has no duration yet`);
    }
    
    return metadata;
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
    // Clean the text and handle edge cases
    const cleanText = durationText.trim().split('\n')[0]?.trim() || '';
    
    // Handle special cases like "LIVE", "UPCOMING", etc.
    if (cleanText.toUpperCase().includes('LIVE') || 
        cleanText.toUpperCase().includes('UPCOMING') ||
        cleanText.toUpperCase().includes('PREMIERE')) {
      return 0; // Treat live/upcoming videos as 0 duration
    }
    
    // Parse time parts
    const parts = cleanText.split(':').map(p => {
      const parsed = parseInt(p, 10);
      return isNaN(parsed) ? 0 : parsed;
    });
    
    if (parts.length === 3 && parts[0] !== undefined && parts[1] !== undefined && parts[2] !== undefined) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1 && parts[0] !== undefined && parts[0] > 0) {
      // Just seconds
      return parts[0];
    }
    
    return 0;
  }

  private parseViewCount(viewText: string): number | undefined {
    if (!viewText) return undefined;
    
    // Remove commas and extract numbers
    const cleanText = viewText.toLowerCase().trim();
    
    // Handle exact number format: "1,234,567 views"
    const exactMatch = cleanText.match(/([\d,]+)\s*views?/);
    if (exactMatch && exactMatch[1]) {
      return parseInt(exactMatch[1].replace(/,/g, ''));
    }
    
    // Handle abbreviated format: "1.5M views", "850K views"
    const shortMatch = cleanText.match(/([\d.]+)([kmb])\s*views?/);
    if (shortMatch && shortMatch[1] && shortMatch[2]) {
      const num = parseFloat(shortMatch[1]);
      let multiplier = 1;
      switch(shortMatch[2]) {
        case 'k': multiplier = 1000; break;
        case 'm': multiplier = 1000000; break;
        case 'b': multiplier = 1000000000; break;
      }
      return Math.round(num * multiplier);
    }
    
    // Handle when it's just "X views" without comma
    const simpleMatch = cleanText.match(/(\d+)\s*views?/);
    if (simpleMatch && simpleMatch[1]) {
      return parseInt(simpleMatch[1]);
    }
    
    return undefined;
  }

  private parseUploadDate(element: Element): Date | undefined {
    // YouTube shows relative dates like "2 days ago", "1 week ago", etc.
    // This is usually in the second span of metadata-line
    const metadataSpans = element.querySelectorAll('#metadata-line span');
    if (metadataSpans.length >= 2 && metadataSpans[1]) {
      const dateText = metadataSpans[1].textContent?.trim().toLowerCase() || '';
      return this.parseRelativeDate(dateText);
    }
    return undefined;
  }

  private parseRelativeDate(dateText: string): Date | undefined {
    const now = new Date();
    
    // Handle "X hours ago"
    const hoursMatch = dateText.match(/(\d+)\s*hours?\s*ago/);
    if (hoursMatch && hoursMatch[1]) {
      const hours = parseInt(hoursMatch[1]);
      return new Date(now.getTime() - hours * 60 * 60 * 1000);
    }
    
    // Handle "X days ago"
    const daysMatch = dateText.match(/(\d+)\s*days?\s*ago/);
    if (daysMatch && daysMatch[1]) {
      const days = parseInt(daysMatch[1]);
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }
    
    // Handle "X weeks ago"
    const weeksMatch = dateText.match(/(\d+)\s*weeks?\s*ago/);
    if (weeksMatch && weeksMatch[1]) {
      const weeks = parseInt(weeksMatch[1]);
      return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
    }
    
    // Handle "X months ago"
    const monthsMatch = dateText.match(/(\d+)\s*months?\s*ago/);
    if (monthsMatch && monthsMatch[1]) {
      const months = parseInt(monthsMatch[1]);
      return new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000);
    }
    
    // Handle "X years ago"
    const yearsMatch = dateText.match(/(\d+)\s*years?\s*ago/);
    if (yearsMatch && yearsMatch[1]) {
      const years = parseInt(yearsMatch[1]);
      return new Date(now.getTime() - years * 365 * 24 * 60 * 60 * 1000);
    }
    
    // Handle "Streamed X ago" for live streams
    if (dateText.includes('streamed')) {
      return this.parseRelativeDate(dateText.replace('streamed', '').trim());
    }
    
    return undefined;
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
  
  private isLiveVideo(element: Element): boolean {
    // Check for live badge indicators
    const liveIndicators = element.querySelectorAll(
      'span.ytd-badge-supported-renderer, ' +
      'ytd-badge-supported-renderer'
    );
    
    for (const indicator of liveIndicators) {
      const text = indicator.textContent?.toUpperCase() || '';
      if (text.includes('LIVE') || text.includes('PREMIERE')) {
        return true;
      }
    }
    
    return false;
  }
}