/**
 * Base adapter for all platforms
 */

import { Video, VideoMetadata } from '../core/domain/video';
import { IVideoRepository } from '../shared/interfaces/repositories';
import { VideoCache } from '../content/video-cache';

export abstract class BasePlatformAdapter implements IVideoRepository {
  protected cache = new VideoCache();
  protected videos = new Map<string, Video>();

  abstract getPlatformName(): string;
  abstract findVideoElements(): Element[];
  abstract extractMetadata(element: Element): VideoMetadata | null;
  abstract injectControls(container: Element): void;
  
  async getAllVisible(): Promise<Video[]> {
    const elements = this.findVideoElements();
    const videos: Video[] = [];

    for (const element of elements) {
      const cached = this.cache.getVideoData(element);
      
      if (cached) {
        // Use cached data
        const video = new Video({
          id: this.generateId(element),
          title: cached.title,
          duration: cached.duration,
          platform: this.getPlatformName() as any
        }, element);
        
        videos.push(video);
        this.videos.set(video.metadata.id, video);
      } else {
        // Extract fresh metadata
        const metadata = this.extractMetadata(element);
        if (metadata) {
          const video = new Video(metadata, element);
          videos.push(video);
          this.videos.set(video.metadata.id, video);
        }
      }
    }

    return videos;
  }

  async getById(id: string): Promise<Video | null> {
    return this.videos.get(id) || null;
  }

  show(video: Video): void {
    const element = video.element as HTMLElement;
    element.style.display = '';
    element.removeAttribute('hidden');
  }

  hide(video: Video): void {
    const element = video.element as HTMLElement;
    element.style.display = 'none';
  }

  isVisible(video: Video): boolean {
    const element = video.element as HTMLElement;
    return element.style.display !== 'none' && !element.hasAttribute('hidden');
  }

  protected generateId(element: Element): string {
    // Generate unique ID based on element position or data attributes
    return `${this.getPlatformName()}_${Date.now()}_${Math.random()}`;
  }
}