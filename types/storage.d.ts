// Ambient types for StorageSystem

declare interface StorageSystemAPI {
  readFinderState(): unknown;
  writeFinderState(v: unknown): void;
  clearFinderState(): void;
  saveOpenModals(): void;
  restoreOpenModals(): void;
  saveWindowPositions(): void;
  restoreWindowPositions(): void;
  resetWindowLayout(): void;
  getDialogWindowElement(id: string): HTMLElement | null;
}

declare const StorageSystem: StorageSystemAPI;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
