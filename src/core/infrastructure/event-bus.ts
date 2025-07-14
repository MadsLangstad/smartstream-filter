/**
 * Event bus implementation for decoupled communication
 */

import { IEventBus, EventHandler } from '../../shared/interfaces/event-bus';

export class EventBus implements IEventBus {
  private events = new Map<string, Set<EventHandler>>();
  private static instance: EventBus;

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit<T>(event: string, data: T): void {
    const handlers = this.events.get(event);
    if (!handlers) return;

    handlers.forEach(handler => {
      try {
        Promise.resolve(handler(data)).catch(error => {
          console.error(`[EventBus] Error in handler for ${event}:`, error);
        });
      } catch (error) {
        console.error(`[EventBus] Sync error in handler for ${event}:`, error);
      }
    });
  }

  on<T>(event: string, handler: EventHandler<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  once<T>(event: string, handler: EventHandler<T>): void {
    const wrappedHandler: EventHandler<T> = (data) => {
      handler(data);
      this.off(event, wrappedHandler);
    };
    this.on(event, wrappedHandler);
  }

  // Utility method to clear all handlers
  clear(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  // Get registered event count for debugging
  getEventCount(): { event: string; handlers: number }[] {
    return Array.from(this.events.entries()).map(([event, handlers]) => ({
      event,
      handlers: handlers.size
    }));
  }
}