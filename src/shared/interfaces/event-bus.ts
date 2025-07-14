/**
 * Event bus interface for decoupled communication
 */

export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export interface IEventBus {
  emit<T>(event: string, data: T): void;
  on<T>(event: string, handler: EventHandler<T>): void;
  off(event: string, handler: EventHandler): void;
  once<T>(event: string, handler: EventHandler<T>): void;
  clear(): void;
}

// Event types
export interface FilteredEvent {
  shown: number;
  hidden: number;
  totalTimeSaved: number;
}

export interface SettingsChangedEvent {
  criteria: any;
  enabled: boolean;
}

export interface PlatformChangedEvent {
  from: string;
  to: string;
}