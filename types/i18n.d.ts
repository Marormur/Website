// Ambient types for i18n system

declare interface AppI18nAPI {
  translate(key: string, params?: Record<string, unknown>, options?: { fallback?: string }): string;
  setLanguagePreference(lang: 'system' | 'de' | 'en'): void;
  getLanguagePreference(): 'system' | 'de' | 'en';
  getActiveLanguage(): 'de' | 'en';
  applyTranslations(): void;
}

declare const appI18n: AppI18nAPI;

declare function translate(key: string, fallback?: string): string;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
