// Ambient types for TextEditorSystem

declare interface TextEditorSystemAPI {
  init(container: HTMLElement): void;
  loadRemoteFile(payload: unknown): void;
  showLoading(payload?: unknown): void;
  showLoadError(payload?: unknown): void;
  clearEditor(): void;
  saveFile(): void;
  openFile(): void;
  handleMenuAction(action: string): void;
}

declare const TextEditorSystem: TextEditorSystemAPI;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
