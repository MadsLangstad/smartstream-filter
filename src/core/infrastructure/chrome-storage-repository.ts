/**
 * Chrome storage implementation of settings repository
 */

import { ISettingsRepository } from '../../shared/interfaces/repositories';
import { FilterCriteria } from '../domain/filter';

export class ChromeStorageRepository implements ISettingsRepository {
  private readonly SETTINGS_KEY = 'filterSettings';
  private readonly ENABLED_KEY = 'filterEnabled';

  async getFilterCriteria(): Promise<FilterCriteria> {
    const result = await chrome.storage.sync.get(this.SETTINGS_KEY);
    
    // Default values
    const defaults: FilterCriteria = {
      minDuration: 5 * 60,  // 5 minutes in seconds
      maxDuration: 30 * 60, // 30 minutes in seconds
    };

    const criteria = result[this.SETTINGS_KEY] || defaults;
    
    // Sync to localStorage for instant access
    try {
      localStorage.setItem('smartstream-filter-criteria', JSON.stringify(criteria));
    } catch (e) {
      console.warn('[SmartStream] Failed to sync to localStorage:', e);
    }
    
    return criteria;
  }

  async saveFilterCriteria(criteria: FilterCriteria): Promise<void> {
    await chrome.storage.sync.set({
      [this.SETTINGS_KEY]: criteria
    });
    
    // Also save to localStorage for instant synchronous access
    try {
      localStorage.setItem('smartstream-filter-criteria', JSON.stringify(criteria));
    } catch (e) {
      console.warn('[SmartStream] Failed to save to localStorage:', e);
    }
  }

  async isEnabled(): Promise<boolean> {
    const result = await chrome.storage.sync.get(this.ENABLED_KEY);
    return result[this.ENABLED_KEY] !== false; // Default to true
  }

  async setEnabled(enabled: boolean): Promise<void> {
    await chrome.storage.sync.set({
      [this.ENABLED_KEY]: enabled
    });
    
    // Also save to localStorage for instant synchronous access
    try {
      localStorage.setItem('smartstream-filter-enabled', JSON.stringify(enabled));
    } catch (e) {
      console.warn('[SmartStream] Failed to save enabled state to localStorage:', e);
    }
  }

  // Listen for changes
  onChange(callback: (criteria: FilterCriteria, enabled: boolean) => void): void {
    chrome.storage.onChanged.addListener(async (_changes, namespace) => {
      if (namespace === 'sync') {
        const criteria = await this.getFilterCriteria();
        const enabled = await this.isEnabled();
        callback(criteria, enabled);
      }
    });
  }
}