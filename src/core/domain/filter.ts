/**
 * Domain logic for filtering
 */

import { Video } from './video';

export interface FilterCriteria {
  minDuration?: number; // seconds
  maxDuration?: number; // seconds
  keywords?: string[];
  channels?: string[];
  excludeChannels?: string[];
  uploadedAfter?: Date;
  minViews?: number;
  maxViews?: number;
  keywordFilters?: string[]; // Premium: filter videos by keywords in title
  channelFilters?: string[]; // Premium: block specific channels
}

export abstract class Filter {
  constructor(protected criteria: FilterCriteria) {}

  abstract matches(video: Video): boolean;
}

export class DurationFilter extends Filter {
  matches(video: Video): boolean {
    const duration = video.metadata.duration;
    
    if (this.criteria.minDuration && duration < this.criteria.minDuration) {
      return false;
    }
    
    if (this.criteria.maxDuration && duration > this.criteria.maxDuration) {
      return false;
    }
    
    return true;
  }
}

export class KeywordFilter extends Filter {
  matches(video: Video): boolean {
    if (!this.criteria.keywordFilters || this.criteria.keywordFilters.length === 0) {
      return true;
    }
    
    const title = video.metadata.title.toLowerCase();
    return this.criteria.keywordFilters.some(keyword => 
      title.includes(keyword.toLowerCase())
    );
  }
}

export class ChannelFilter extends Filter {
  matches(video: Video): boolean {
    if (!this.criteria.channelFilters || this.criteria.channelFilters.length === 0) {
      return true;
    }
    
    const channelName = (video.metadata.channelName || video.metadata.channel || '').toLowerCase();
    return !this.criteria.channelFilters.some(channel => 
      channelName.includes(channel.toLowerCase())
    );
  }
}

export class CompositeFilter extends Filter {
  private filters: Filter[] = [];

  constructor(criteria: FilterCriteria) {
    super(criteria);
    this.buildFilters();
  }

  private buildFilters() {
    // Duration filter
    if (this.criteria.minDuration || this.criteria.maxDuration) {
      this.filters.push(new DurationFilter(this.criteria));
    }

    // Keyword filter (premium)
    if (this.criteria.keywordFilters && this.criteria.keywordFilters.length > 0) {
      this.filters.push(new KeywordFilter(this.criteria));
    }

    // Channel filter (premium)
    if (this.criteria.channelFilters && this.criteria.channelFilters.length > 0) {
      this.filters.push(new ChannelFilter(this.criteria));
    }
  }

  matches(video: Video): boolean {
    return this.filters.every(filter => filter.matches(video));
  }
}