// Ambient types for FinderSystem

declare interface FinderSystemAPI {
  init(): void;
  openFinder(): void;
  closeFinder(): void;
}

declare const FinderSystem: FinderSystemAPI;

declare interface Window {
  FinderSystem: FinderSystemAPI;
}
