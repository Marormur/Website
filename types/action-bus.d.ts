// Minimal ambient types for ActionBus

declare type ActionHandler = (params?: Record<string, string>, element?: HTMLElement) => void;

declare interface ActionBusAPI {
  register(name: string, handler: ActionHandler): void;
  registerAll(actions: Record<string, ActionHandler>): void;
  execute(name: string, params?: Record<string, string>, element?: HTMLElement): void;
}

declare const ActionBus: ActionBusAPI;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
