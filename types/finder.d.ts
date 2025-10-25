// Ambient types for FinderSystem

declare interface FinderSystemAPI {
  init(): void;
  openFinder(): void;
  closeFinder(): void;
}

declare const FinderSystem: FinderSystemAPI;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
