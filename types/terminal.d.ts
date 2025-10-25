// Ambient types for TerminalSystem

declare interface TerminalSystemAPI {
  init(container: HTMLElement): void;
}

declare const TerminalSystem: TerminalSystemAPI;

declare interface Window {
  TerminalSystem: TerminalSystemAPI;
}
