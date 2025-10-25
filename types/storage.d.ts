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

declare interface Window {
  StorageSystem: StorageSystemAPI;
}
