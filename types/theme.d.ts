// Ambient types for ThemeSystem

declare interface ThemeSystemAPI {
  setThemePreference(mode: 'system' | 'light' | 'dark'): void;
  getThemePreference(): 'system' | 'light' | 'dark';
  applyTheme(): void;
  initTheme(): void;
}

declare const ThemeSystem: ThemeSystemAPI;

declare interface Window {
  ThemeSystem: ThemeSystemAPI;
}
