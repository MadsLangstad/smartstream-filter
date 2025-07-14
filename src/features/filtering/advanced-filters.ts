/**
 * Advanced filters - Premium feature
 */

import { Filter, FilterCriteria } from '../../core/domain/filter';
import { Video } from '../../core/domain/video';
import { Premium } from '../premium/feature-gate';

export class KeywordFilter extends Filter {
  @Premium('Keyword Filtering')
  matches(video: Video): boolean {
    if (!this.criteria.keywords || this.criteria.keywords.length === 0) {
      return true;
    }

    const title = video.metadata.title.toLowerCase();
    return this.criteria.keywords.some(keyword => 
      title.includes(keyword.toLowerCase())
    );
  }
}

export class ChannelFilter extends Filter {
  @Premium('Channel Filtering')
  matches(video: Video): boolean {
    if (!video.metadata.channel) return true;

    // Include channels
    if (this.criteria.channels && this.criteria.channels.length > 0) {
      const included = this.criteria.channels.some(channel =>
        video.metadata.channel!.toLowerCase().includes(channel.toLowerCase())
      );
      if (!included) return false;
    }

    // Exclude channels
    if (this.criteria.excludeChannels && this.criteria.excludeChannels.length > 0) {
      const excluded = this.criteria.excludeChannels.some(channel =>
        video.metadata.channel!.toLowerCase().includes(channel.toLowerCase())
      );
      if (excluded) return false;
    }

    return true;
  }
}

export class DateFilter extends Filter {
  @Premium('Upload Date Filtering')
  matches(video: Video): boolean {
    if (!this.criteria.uploadedAfter || !video.metadata.uploadDate) {
      return true;
    }

    return video.metadata.uploadDate >= this.criteria.uploadedAfter;
  }
}

export class ViewCountFilter extends Filter {
  @Premium('View Count Filtering')
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

// Premium filter UI component
export class AdvancedFilterPanel {
  private container: HTMLElement;
  private onUpdate: (criteria: Partial<FilterCriteria>) => void;

  constructor(
    private criteria: FilterCriteria,
    onUpdate: (criteria: Partial<FilterCriteria>) => void
  ) {
    this.onUpdate = onUpdate;
    this.container = this.createElement();
  }

  @Premium('Advanced Filters')
  async show(): Promise<void> {
    document.body.appendChild(this.container);
    requestAnimationFrame(() => {
      this.container.classList.add('show');
    });
  }

  hide(): void {
    this.container.classList.remove('show');
    setTimeout(() => {
      this.container.remove();
    }, 300);
  }

  private createElement(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'advanced-filter-panel';
    panel.innerHTML = `
      <div class="filter-panel-header">
        <h3>Advanced Filters</h3>
        <button class="filter-close">×</button>
      </div>
      
      <div class="filter-section">
        <label>Keywords (comma separated)</label>
        <input type="text" id="filter-keywords" placeholder="tutorial, review, unboxing" 
               value="${this.criteria.keywords?.join(', ') || ''}">
      </div>

      <div class="filter-section">
        <label>Include Channels</label>
        <input type="text" id="filter-channels" placeholder="MKBHD, Veritasium" 
               value="${this.criteria.channels?.join(', ') || ''}">
      </div>

      <div class="filter-section">
        <label>Exclude Channels</label>
        <input type="text" id="filter-exclude-channels" placeholder="Channel names to exclude" 
               value="${this.criteria.excludeChannels?.join(', ') || ''}">
      </div>

      <div class="filter-section">
        <label>Uploaded After</label>
        <select id="filter-date">
          <option value="">Any time</option>
          <option value="hour">Last hour</option>
          <option value="day">Last 24 hours</option>
          <option value="week">Last week</option>
          <option value="month">Last month</option>
          <option value="year">Last year</option>
        </select>
      </div>

      <div class="filter-section">
        <label>View Count Range</label>
        <div class="filter-range">
          <input type="number" id="filter-min-views" placeholder="Min views" 
                 value="${this.criteria.minViews || ''}">
          <span>to</span>
          <input type="number" id="filter-max-views" placeholder="Max views" 
                 value="${this.criteria.maxViews || ''}">
        </div>
      </div>

      <div class="filter-actions">
        <button class="filter-reset">Reset All</button>
        <button class="filter-apply">Apply Filters</button>
      </div>
    `;

    this.attachEventListeners(panel);
    this.injectStyles();

    return panel;
  }

  private attachEventListeners(panel: HTMLElement): void {
    // Close button
    panel.querySelector('.filter-close')?.addEventListener('click', () => {
      this.hide();
    });

    // Apply button
    panel.querySelector('.filter-apply')?.addEventListener('click', () => {
      this.applyFilters();
    });

    // Reset button
    panel.querySelector('.filter-reset')?.addEventListener('click', () => {
      this.resetFilters();
    });
  }

  private applyFilters(): void {
    const keywords = (document.getElementById('filter-keywords') as HTMLInputElement).value
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const channels = (document.getElementById('filter-channels') as HTMLInputElement).value
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const excludeChannels = (document.getElementById('filter-exclude-channels') as HTMLInputElement).value
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const dateSelect = document.getElementById('filter-date') as HTMLSelectElement;
    let uploadedAfter: Date | undefined;
    
    if (dateSelect.value) {
      const now = new Date();
      switch (dateSelect.value) {
        case 'hour':
          uploadedAfter = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          uploadedAfter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          uploadedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          uploadedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          uploadedAfter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    const minViews = parseInt((document.getElementById('filter-min-views') as HTMLInputElement).value) || undefined;
    const maxViews = parseInt((document.getElementById('filter-max-views') as HTMLInputElement).value) || undefined;

    this.onUpdate({
      keywords: keywords.length > 0 ? keywords : undefined,
      channels: channels.length > 0 ? channels : undefined,
      excludeChannels: excludeChannels.length > 0 ? excludeChannels : undefined,
      uploadedAfter,
      minViews,
      maxViews
    });

    this.hide();
  }

  private resetFilters(): void {
    (document.getElementById('filter-keywords') as HTMLInputElement).value = '';
    (document.getElementById('filter-channels') as HTMLInputElement).value = '';
    (document.getElementById('filter-exclude-channels') as HTMLInputElement).value = '';
    (document.getElementById('filter-date') as HTMLSelectElement).value = '';
    (document.getElementById('filter-min-views') as HTMLInputElement).value = '';
    (document.getElementById('filter-max-views') as HTMLInputElement).value = '';

    this.onUpdate({
      keywords: undefined,
      channels: undefined,
      excludeChannels: undefined,
      uploadedAfter: undefined,
      minViews: undefined,
      maxViews: undefined
    });
  }

  private injectStyles(): void {
    if (document.getElementById('advanced-filter-styles')) return;

    const style = document.createElement('style');
    style.id = 'advanced-filter-styles';
    style.textContent = `
      .advanced-filter-panel {
        position: fixed;
        top: 80px;
        right: 20px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 20px;
        width: 320px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        z-index: 9999;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s;
        font-family: Roboto, Arial, sans-serif;
      }

      .advanced-filter-panel.show {
        opacity: 1;
        transform: translateY(0);
      }

      .filter-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .filter-panel-header h3 {
        color: #fff;
        margin: 0;
        font-size: 18px;
      }

      .filter-close {
        background: none;
        border: none;
        color: #666;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
      }

      .filter-close:hover {
        color: #fff;
      }

      .filter-section {
        margin-bottom: 16px;
      }

      .filter-section label {
        display: block;
        color: #aaa;
        font-size: 12px;
        margin-bottom: 6px;
        text-transform: uppercase;
      }

      .filter-section input[type="text"],
      .filter-section input[type="number"],
      .filter-section select {
        width: 100%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid #333;
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
      }

      .filter-section input:focus,
      .filter-section select:focus {
        outline: none;
        border-color: #ffd700;
        background: rgba(255, 255, 255, 0.15);
      }

      .filter-range {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .filter-range input {
        flex: 1;
      }

      .filter-range span {
        color: #666;
        font-size: 14px;
      }

      .filter-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .filter-actions button {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .filter-reset {
        background: #333;
        color: #aaa;
      }

      .filter-reset:hover {
        background: #444;
        color: #fff;
      }

      .filter-apply {
        background: #ffd700;
        color: #000;
      }

      .filter-apply:hover {
        background: #ffed4e;
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);
  }
}