/**
 * Application layer - Use case for filtering videos
 */

import { Video } from '../domain/video';
import { Filter, FilterCriteria, CompositeFilter } from '../domain/filter';
import { IVideoRepository } from '../../shared/interfaces/repositories';
import { IEventBus } from '../../shared/interfaces/event-bus';
import { IPerformanceMonitor } from '../../shared/interfaces/performance';

export interface FilterResult {
  shown: Video[];
  hidden: Video[];
  totalTimeSaved: number;
}

export class FilterVideosUseCase {
  constructor(
    private videoRepository: IVideoRepository,
    private eventBus: IEventBus,
    private performanceMonitor: IPerformanceMonitor
  ) {}

  async execute(criteria: FilterCriteria, enabled: boolean = true): Promise<FilterResult> {
    return this.performanceMonitor.measure('FilterVideosUseCase', async () => {
      // Get all videos from repository
      const videos = await this.videoRepository.getAllVisible();
      
      if (!enabled) {
        // Show all videos
        videos.forEach(video => this.videoRepository.show(video));
        return {
          shown: videos,
          hidden: [],
          totalTimeSaved: 0
        };
      }

      // Create composite filter
      const filter = new CompositeFilter(criteria);
      
      const result: FilterResult = {
        shown: [],
        hidden: [],
        totalTimeSaved: 0
      };

      // Apply filter
      for (const video of videos) {
        if (filter.matches(video)) {
          this.videoRepository.show(video);
          result.shown.push(video);
        } else {
          this.videoRepository.hide(video);
          result.hidden.push(video);
          result.totalTimeSaved += video.metadata.duration;
        }
      }

      // Emit event
      this.eventBus.emit('videos-filtered', result);

      return result;
    });
  }
}