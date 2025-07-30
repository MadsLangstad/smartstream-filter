/**
 * Domain logic for filtering
 */

import { Video } from './video';

export interface FilterCriteria {
  minDuration?: number; // seconds
  maxDuration?: number; // seconds
  keywords?: string[]; // Premium: filter videos by keywords in title
  channels?: string[]; // Premium: include specific channels
  excludeChannels?: string[]; // Premium: exclude specific channels
  uploadedAfter?: Date; // Premium: filter by upload date
  minViews?: number; // Premium: minimum view count
  maxViews?: number; // Premium: maximum view count
}

export abstract class Filter {
  constructor(protected criteria: FilterCriteria) {}

  abstract matches(video: Video): boolean;
}

export class DurationFilter extends Filter {
  matches(video: Video): boolean {
    const duration = video.metadata.duration;
    
    // If duration is 0 (not loaded yet or live video), don't filter it out
    // This ensures videos are shown until their duration can be determined
    if (duration === 0) {
      return true;
    }
    
    const minOk = !this.criteria.minDuration || duration >= this.criteria.minDuration;
    const maxOk = !this.criteria.maxDuration || duration <= this.criteria.maxDuration;
    const result = minOk && maxOk;
    
    // Debug logging for videos that don't match
    if (!result) {
      console.log(`[DurationFilter] Hiding video "${video.metadata.title}" - Duration: ${duration}s, Bounds: [${this.criteria.minDuration ?? 'none'}-${this.criteria.maxDuration ?? 'none'}]`);
    }
    
    return result;
  }
}

export class KeywordFilter extends Filter {
  matches(video: Video): boolean {
    if (!this.criteria.keywords || this.criteria.keywords.length === 0) {
      return true;
    }
    
    const title = video.metadata.title.toLowerCase();
    const hasMatch = this.criteria.keywords.some(keyword => 
      title.includes(keyword.toLowerCase())
    );
    
    // Debug logging
    if (!hasMatch) {
      console.log(`[SmartStream] Video "${video.metadata.title}" filtered by keywords: ${this.criteria.keywords.join(', ')}`);
    }
    
    return hasMatch;
  }
}

export class ChannelIncludeFilter extends Filter {
  matches(video: Video): boolean {
    if (!this.criteria.channels || this.criteria.channels.length === 0) {
      return true;
    }
    
    const channelName = (video.metadata.channelName || video.metadata.channel || '').toLowerCase();
    return this.criteria.channels.some(channel => 
      channelName.includes(channel.toLowerCase())
    );
  }
}

export class ChannelExcludeFilter extends Filter {
  matches(video: Video): boolean {
    if (!this.criteria.excludeChannels || this.criteria.excludeChannels.length === 0) {
      return true;
    }
    
    const channelName = (video.metadata.channelName || video.metadata.channel || '').toLowerCase();
    return !this.criteria.excludeChannels.some(channel => 
      channelName.includes(channel.toLowerCase())
    );
  }
}

export class DateFilter extends Filter {
  matches(video: Video): boolean {
    if (!this.criteria.uploadedAfter || !video.metadata.uploadDate) {
      return true;
    }
    
    return video.metadata.uploadDate >= this.criteria.uploadedAfter;
  }
}

export class ViewCountFilter extends Filter {
  matches(video: Video): boolean {
    if (!video.metadata.viewCount) return true;
    
    if (this.criteria.minViews && video.metadata.viewCount < this.criteria.minViews) {
      return false;
    }
    
    if (this.criteria.maxViews && video.metadata.viewCount > this.criteria.maxViews) {
      return false;
    }
    
    return true;
  }
}

export class CompositeFilter extends Filter {
  private filters: Filter[] = [];

  constructor(criteria: FilterCriteria) {
    super(criteria);
    this.buildFilters();
    console.log('[SmartStream] Active filters:', this.filters.map(f => f.constructor.name));
  }

  private buildFilters() {
    // Duration filter
    if (this.criteria.minDuration || this.criteria.maxDuration) {
      this.filters.push(new DurationFilter(this.criteria));
    }

    // Keyword filter (premium)
    if (this.criteria.keywords && this.criteria.keywords.length > 0) {
      this.filters.push(new KeywordFilter(this.criteria));
    }

    // Channel include filter (premium)
    if (this.criteria.channels && this.criteria.channels.length > 0) {
      this.filters.push(new ChannelIncludeFilter(this.criteria));
    }

    // Channel exclude filter (premium)
    if (this.criteria.excludeChannels && this.criteria.excludeChannels.length > 0) {
      this.filters.push(new ChannelExcludeFilter(this.criteria));
    }

    // Date filter (premium)
    if (this.criteria.uploadedAfter) {
      this.filters.push(new DateFilter(this.criteria));
    }

    // View count filter (premium)
    if (this.criteria.minViews || this.criteria.maxViews) {
      this.filters.push(new ViewCountFilter(this.criteria));
    }
  }

  matches(video: Video): boolean {
    return this.filters.every(filter => filter.matches(video));
  }
}