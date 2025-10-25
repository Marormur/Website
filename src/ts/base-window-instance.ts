console.log('BaseWindowInstance loaded');

(function () {
  'use strict';

  type InstanceConfig = {
    id?: string;
    type?: string;
    title?: string;
    initialState?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };

  type StateChangeEvent = {
    oldState: Record<string, unknown>;
    newState: Record<string, unknown>;
  };

  type SerializedInstance = {
    instanceId: string;
    type: string;
    title: string;
    state: Record<string, unknown>;
    metadata: Record<string, unknown>;
  };

  type EventCallback = (data?: unknown) => void;

  class BaseWindowInstance {
    instanceId: string;
    type: string;
    title: string;
    container: HTMLElement | null;
    windowElement: HTMLElement | null;
    state: Record<string, unknown>;
    eventListeners: Map<string, EventCallback[]>;
    isInitialized: boolean;
    isVisible: boolean;
    metadata: Record<string, unknown>;

    constructor(config: InstanceConfig) {
      this.instanceId = config.id || this._generateId();
      this.type = config.type || 'unknown';
      this.title = config.title || 'Untitled';
      this.container = null;
      this.windowElement = null;
      this.state = this._initializeState(config.initialState || {});
      this.eventListeners = new Map();
      this.isInitialized = false;
      this.isVisible = false;
      this.metadata = config.metadata || {};
    }

    protected _generateId(): string {
      return `${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    protected _initializeState(initialState: Record<string, unknown>): Record<string, unknown> {
      return {
        ...initialState,
        created: Date.now(),
        modified: Date.now(),
      };
    }

    init(container: HTMLElement): void {
      if (this.isInitialized) {
        console.warn(`Instance ${this.instanceId} already initialized`);
        return;
      }

      this.container = container;
      this.render();
      this.attachEventListeners();
      this.isInitialized = true;
      this.emit('initialized');
    }

    protected render(): void {
      throw new Error('render() must be implemented by subclass');
    }

    protected attachEventListeners(): void {
      // To be implemented by subclasses
    }

    show(): void {
      if (this.container) {
        this.container.classList.remove('hidden');
        this.isVisible = true;
        this.emit('shown');
      }
    }

    hide(): void {
      if (this.container) {
        this.container.classList.add('hidden');
        this.isVisible = false;
        this.emit('hidden');
      }
    }

    destroy(): void {
      this.emit('beforeDestroy');
      this.removeAllEventListeners();

      if (this.container) {
        this.container.innerHTML = '';
        this.container = null;
      }

      this.windowElement = null;
      this.isInitialized = false;
      this.emit('destroyed');
    }

    updateState(updates: Record<string, unknown>): void {
      const oldState = { ...this.state };
      this.state = {
        ...this.state,
        ...updates,
        modified: Date.now(),
      };
      this.emit('stateChanged', { oldState, newState: this.state } as StateChangeEvent);
    }

    getState(): Record<string, unknown> {
      return { ...this.state };
    }

    serialize(): SerializedInstance {
      return {
        instanceId: this.instanceId,
        type: this.type,
        title: this.title,
        state: this.getState(),
        metadata: this.metadata,
      };
    }

    deserialize(data: Partial<SerializedInstance>): void {
      if (data.state) {
        this.state = data.state;
      }
      if (data.title) {
        this.title = data.title;
      }
      if (data.metadata) {
        this.metadata = { ...this.metadata, ...data.metadata };
      }
      this.emit('deserialized');
    }

    emit(eventName: string, data?: unknown): void {
      const listeners = this.eventListeners.get(eventName) || [];
      listeners.forEach((callback) => {
        try {
          callback.call(this, data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }

    on(eventName: string, callback: EventCallback): void {
      if (!this.eventListeners.has(eventName)) {
        this.eventListeners.set(eventName, []);
      }
      this.eventListeners.get(eventName)!.push(callback);
    }

    off(eventName: string, callback: EventCallback): void {
      if (!this.eventListeners.has(eventName)) return;

      const listeners = this.eventListeners.get(eventName)!;
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    removeAllEventListeners(): void {
      this.eventListeners.clear();
    }

    focus(): void {
      if (this.container && this.isVisible) {
        this.emit('focused');
      }
    }

    blur(): void {
      this.emit('blurred');
    }
  }

  (window as unknown as { BaseWindowInstance: typeof BaseWindowInstance }).BaseWindowInstance =
    BaseWindowInstance;
})();
