// Ambient types for ThemeSystem

declare interface ThemeSystemAPI {
  setThemePreference(mode: 'system' | 'light' | 'dark'): void;
  getThemePreference(): 'system' | 'light' | 'dark';
  applyTheme(): void;
  initTheme(): void;
}

declare const ThemeSystem: ThemeSystemAPI;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
