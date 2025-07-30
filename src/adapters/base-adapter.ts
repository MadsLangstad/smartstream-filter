/**
 * Base adapter for all platforms
 */

import { Video, VideoMetadata } from '../core/domain/video';
import { IVideoRepository } from '../shared/interfaces/repositories';
import { VideoCache } from '../content/video-cache';

export abstract class BasePlatformAdapter implements IVideoRepository {
  protected cache = VideoCache.getInstance();
  protected videos = new Map<string, Video>();

  abstract getPlatformName(): string;
  abstract findVideoElements(): Element[];
  abstract extractMetadata(element: Element): VideoMetadata | null;
  abstract injectControls(container: Element): void;
  
  async getAllVisible(): Promise<Video[]> {
    const elements = this.findVideoElements();
    const videos: Video[] = [];
    
    // Clear old videos that are no longer in DOM
    const currentIds = new Set<string>();

    for (const element of elements) {
      // Always extract fresh metadata to handle YouTube's DOM reuse
      const metadata = this.extractMetadata(element);
      if (metadata) {
        const video = new Video(metadata, element);
        videos.push(video);
        currentIds.add(video.metadata.id);
        this.videos.set(video.metadata.id, video);
        
        // Cache the video data if duration is available
        if (metadata.duration > 0) {
          this.cache.setVideoData(element, { duration: metadata.duration });
        }
      }
    }
    
    // Remove videos that are no longer in the DOM
    for (const [id, _] of this.videos) {
      if (!currentIds.has(id)) {
        this.videos.delete(id);
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

  protected generateId(_element: Element): string {
    // Generate unique ID based on element position or data attributes
    return `${this.getPlatformName()}_${Date.now()}_${Math.random()}`;
  }
}