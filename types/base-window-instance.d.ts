// Ambient types for BaseWindowInstance

declare interface BaseWindowInstanceConfig<TState = unknown> {
  id?: string;
  type: string;
  title?: string;
  initialState?: Partial<TState>;
  metadata?: Record<string, unknown>;
}

declare class BaseWindowInstance<TState = unknown> {
  constructor(config: BaseWindowInstanceConfig<TState>);
  instanceId: string;
  type: string;
  title: string;
  container: HTMLElement | null;
  windowElement: HTMLElement | null;
  state: TState;
  metadata: Record<string, unknown>;
  isInitialized: boolean;
  isVisible: boolean;

  init(container: HTMLElement): void;
  render(): void;
  attachEventListeners(): void;

  show(): void;
  hide(): void;
  destroy(): void;

  updateState(updates: Partial<TState>): void;
  getState(): TState;
  serialize(): unknown;
  deserialize(data: unknown): void;

  focus(): void;
  blur(): void;

  on(eventName: string, callback: (data?: unknown) => void): void;
  off(eventName: string, callback: (data?: unknown) => void): void;
  removeAllEventListeners(): void;
  emit(eventName: string, data?: unknown): void;
}

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
