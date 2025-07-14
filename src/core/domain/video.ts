/**
 * Core domain entity - Platform agnostic video representation
 */

export interface VideoMetadata {
  id: string;
  title: string;
  duration: number; // in seconds
  channel?: string;
  channelName?: string; // alias for channel
  thumbnailUrl?: string;
  uploadDate?: Date;
  viewCount?: number;
  platform: 'youtube' | 'spotify' | 'netflix' | 'other';
}

export class Video {
  constructor(
    public readonly metadata: VideoMetadata,
    public readonly element: Element
  ) {}

  get durationInMinutes(): number {
    return Math.floor(this.metadata.duration / 60);
  }

  get durationInHours(): number {
    return this.metadata.duration / 3600;
  }

  formatDuration(): string {
    const hours = Math.floor(this.metadata.duration / 3600);
    const minutes = Math.floor((this.metadata.duration % 3600) / 60);
    const seconds = this.metadata.duration % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}