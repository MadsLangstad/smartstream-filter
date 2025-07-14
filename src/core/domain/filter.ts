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

    // Add more filters as needed
    // this.filters.push(new KeywordFilter(this.criteria));
    // this.filters.push(new ChannelFilter(this.criteria));
  }

  matches(video: Video): boolean {
    return this.filters.every(filter => filter.matches(video));
  }
}