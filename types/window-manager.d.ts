// Minimal ambient types for WindowManager

declare interface WindowConfig {
  id: string;
  type: 'persistent' | 'transient';
  programKey?: string;
  icon?: string;
  closeButtonId?: string;
  metadata?: Record<string, unknown>;
}

declare interface WindowManagerAPI {
  register(config: WindowConfig): void;
  registerAll(configs: WindowConfig[]): void;
  getConfig(id: string): WindowConfig | undefined;
  open(id: string): void;
  close(id: string): void;
  bringToFront(id: string): void;
  getTopWindow(): string | null;
  getProgramInfo(id: string): unknown;
  getAllWindowIds(): string[];
  getPersistentWindowIds(): string[];
  getDialogInstance(id: string): unknown;
  syncZIndexWithDOM(): void;
}

declare const WindowManager: WindowManagerAPI;

declare interface Window {
  WindowManager: WindowManagerAPI;
}
