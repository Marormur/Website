// Ambient types for FinderSystem

declare interface FinderSystemAPI {
  init(): void;
  openFinder(): void;
  closeFinder(): void;
  navigateTo?(path: string[], view: string): void;
  getState?(): any;
}

declare const FinderSystem: FinderSystemAPI;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
