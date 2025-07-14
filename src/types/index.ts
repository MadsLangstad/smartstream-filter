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

export type MessageType = 
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<FilterSettings> }
  | { type: 'FILTER_VIDEOS' }
  | { type: 'SETTINGS_UPDATED'; settings: FilterSettings }
  | { type: 'CHECK_PREMIUM' }
  | { type: 'OPEN_CHECKOUT'; email?: string }
  | { type: 'PREMIUM_ACTIVATED' }
  | { type: 'PREMIUM_DEACTIVATED' }
  | { type: 'PREMIUM_STATUS_CHANGED'; isPremium: boolean };

export interface StorageData {
  settings: FilterSettings;
  premium?: boolean;
  lastSync?: number;
}