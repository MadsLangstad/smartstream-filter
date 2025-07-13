/**
 * MIT Licensed - Core duration filtering logic
 */

export interface DurationRange {
  min: number; // in seconds
  max: number; // in seconds
}

export class DurationFilter {
  private range: DurationRange;

  constructor(range: DurationRange = { min: 300, max: 1800 }) {
    this.range = range;
  }

  setRange(range: DurationRange): void {
    this.range = range;
  }

  getRange(): DurationRange {
    return this.range;
  }

  /**
   * Parse duration string to seconds
   * Handles formats: "HH:MM:SS", "MM:SS", "SS"
   * Also handles YouTube's duplicate timestamps like "20:50\n    20:50"
   */
  parseDuration(durationText: string): number {
    const cleanText = durationText.trim().split('\n')[0].trim();
    const parts = cleanText.split(':').map(p => parseInt(p));
    
    if (parts.length === 3) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      // Just seconds
      return parts[0];
    }
    return 0;
  }

  /**
   * Check if duration is within the filter range
   */
  isWithinRange(durationInSeconds: number): boolean {
    return durationInSeconds >= this.range.min && durationInSeconds <= this.range.max;
  }

  /**
   * Format seconds to display string
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}