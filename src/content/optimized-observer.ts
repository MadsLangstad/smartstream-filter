/**
 * Optimized MutationObserver that only processes relevant changes
 */

export class OptimizedObserver {
  private observer: MutationObserver | null = null;
  private pendingVideos = new Set<Element>();
  private processTimer: number | null = null;
  private isProcessing = false;
  
  constructor(
    private onVideosFound: (videos: Element[]) => void,
    private options: { debounceMs: number; batchSize: number } = {
      debounceMs: 250,  // Increased from 100ms for better batching
      batchSize: 10    // Reduced from 20 to process smaller chunks
    }
  ) {}
  
  /**
   * Start observing with optimized settings
   */
  start() {
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });
    
    // Target more specific containers to reduce noise
    const targetNode = document.querySelector('#contents, ytd-app') || document.body;
    
    // Only observe specific changes
    this.observer.observe(targetNode, {
      childList: true,
      subtree: true,
      // Don't observe attributes or character data
      attributes: false,
      characterData: false
    });
  }
  
  /**
   * Process mutations efficiently
   */
  private handleMutations(mutations: MutationRecord[]) {
    let hasNewVideos = false;
    let mutationCount = 0;
    
    for (const mutation of mutations) {
      // Skip if no added nodes
      if (!mutation.addedNodes.length) continue;
      
      mutationCount++;
      
      // Check each added node
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        
        const element = node as Element;
        
        // Check if it's a video or contains videos
        if (this.isVideoElement(element)) {
          this.pendingVideos.add(element);
          hasNewVideos = true;
        } else {
          // Check children
          const videos = element.querySelectorAll(
            'ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer'
          );
          if (videos.length > 0) {
            videos.forEach(v => this.pendingVideos.add(v));
            hasNewVideos = true;
          }
        }
      }
    }
    
    // Debug logging
    if (hasNewVideos) {
      console.log(`[SmartStream Observer] Found ${this.pendingVideos.size} new videos from ${mutationCount} mutations`);
    }
    
    // Only schedule processing if we found new videos
    if (hasNewVideos && !this.processTimer) {
      this.scheduleProcessing();
    }
  }
  
  /**
   * Check if element is a video renderer
   */
  private isVideoElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    // More specific check to avoid false positives
    if (tagName === 'ytd-video-renderer' ||
        tagName === 'ytd-grid-video-renderer' ||
        tagName === 'ytd-rich-item-renderer') {
      // Verify it actually contains video content
      return element.querySelector('#video-title, a#thumbnail') !== null;
    }
    return false;
  }
  
  /**
   * Schedule batch processing of videos
   */
  private scheduleProcessing() {
    this.processTimer = window.setTimeout(() => {
      this.processPendingVideos();
    }, this.options.debounceMs);
  }
  
  /**
   * Process videos in batches
   */
  private async processPendingVideos() {
    if (this.isProcessing || this.pendingVideos.size === 0) return;
    
    this.isProcessing = true;
    this.processTimer = null;
    
    // Process in batches
    const videos = Array.from(this.pendingVideos);
    this.pendingVideos.clear();
    
    console.log(`[SmartStream Observer] Processing ${videos.length} pending videos`);
    
    // Process in chunks to avoid blocking
    for (let i = 0; i < videos.length; i += this.options.batchSize) {
      const batch = videos.slice(i, i + this.options.batchSize);
      
      // Use requestIdleCallback for non-critical updates
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => this.onVideosFound(batch));
      } else {
        requestAnimationFrame(() => this.onVideosFound(batch));
      }
      
      // Small delay between batches
      if (i + this.options.batchSize < videos.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    this.isProcessing = false;
  }
  
  /**
   * Stop observing
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }
    this.pendingVideos.clear();
  }
}