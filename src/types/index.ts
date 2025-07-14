export interface FilterSettings {
  minDuration: number;
  maxDuration: number;
  enabled: boolean;
  quality?: QualityFilter;
  channels?: ChannelFilter;
}

export interface QualityFilter {
  min: '144p' | '240p' | '360p' | '480p' | '720p' | '1080p' | '1440p' | '2160p';
  max: '144p' | '240p' | '360p' | '480p' | '720p' | '1080p' | '1440p' | '2160p';
}

export interface ChannelFilter {
  blacklist: string[];
  whitelist: string[];
  mode: 'blacklist' | 'whitelist';
}

export interface VideoMetadata {
  id: string;
  title: string;
  duration: number;
  channel: string;
  quality?: string;
  views?: number;
  uploadDate?: Date;
}

export interface FilterStats {
  videosFiltered?: number;
  totalVideos?: number;
  timesSaved?: number;
  lastReset?: string;
  videosShown?: number;
  videosHidden?: number;
  totalTimeHidden?: number;
}

export type MessageType = 
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<FilterSettings> }
  | { type: 'FILTER_VIDEOS' }
  | { type: 'SETTINGS_UPDATED'; settings: FilterSettings }
  | { type: 'SHOW_PAYWALL'; feature?: string }
  | { type: 'DISPLAY_PAYWALL'; feature: string }
  | { type: 'GET_STATS' }
  | { type: 'STATS_UPDATED'; stats: FilterStats }
  | { type: 'UPDATE_PREMIUM_FILTERS'; filters: { keywords?: string; channels?: string } };


export interface StorageData {
  settings: FilterSettings;
  premium?: boolean;
  lastSync?: number;
}