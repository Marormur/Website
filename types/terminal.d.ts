// Ambient types for TerminalSystem

declare interface TerminalSystemAPI {
  init(container: HTMLElement): void;
}

declare const TerminalSystem: TerminalSystemAPI;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
