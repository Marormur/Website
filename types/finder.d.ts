// Ambient types for FinderSystem

type CurrentView = 'computer' | 'github' | 'favorites' | 'recent';

declare interface FinderSystemAPI {
  init(): void;
  openFinder(): void;
  closeFinder(): void;
  navigateTo(path: string[] | string, view?: CurrentView | null): void;
  navigateUp(): void;
  navigateToFolder(folderName: string): void;
  openItem(name: string, type: string): void;
  setSortBy(field: 'name' | 'date' | 'size' | 'type'): void;
  setViewMode(mode: 'list' | 'grid' | 'columns'): void;
  toggleFavorite(path: string): void;
  getState(): any;
}

declare const FinderSystem: FinderSystemAPI;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
