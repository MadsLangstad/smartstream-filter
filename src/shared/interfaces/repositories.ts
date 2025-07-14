/**
 * Repository interfaces - Ports for our hexagonal architecture
 */

import { Video } from '../../core/domain/video';
import { FilterCriteria } from '../../core/domain/filter';

export interface IVideoRepository {
  getAllVisible(): Promise<Video[]>;
  getById(id: string): Promise<Video | null>;
  show(video: Video): void;
  hide(video: Video): void;
  isVisible(video: Video): boolean;
}

export interface ISettingsRepository {
  getFilterCriteria(): Promise<FilterCriteria>;
  saveFilterCriteria(criteria: FilterCriteria): Promise<void>;
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
  onChange(callback: (criteria: FilterCriteria, enabled: boolean) => void): void;
}

export interface IUserRepository {
  isPremium(): Promise<boolean>;
  getSubscriptionStatus(): Promise<{
    type: 'free' | 'premium' | 'enterprise';
    validUntil?: Date;
  }>;
}