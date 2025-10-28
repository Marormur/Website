// Ambient types for TerminalSystem

declare interface TerminalSystemAPI {
  init(container: HTMLElement): void;
}

declare const TerminalSystem: TerminalSystemAPI;

declare interface TerminalInstance {
  clearOutput?(): void;
}

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
