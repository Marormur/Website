// Ambient types for i18n system

declare interface AppI18nAPI {
  translate(key: string): string;
  setLanguagePreference(lang: 'system' | 'de' | 'en'): void;
  getLanguagePreference(): 'system' | 'de' | 'en';
  getActiveLanguage(): 'de' | 'en';
  applyTranslations(): void;
}

declare const appI18n: AppI18nAPI;

declare function translate(key: string): string;

declare interface Window {
  appI18n: AppI18nAPI;
  translate: (key: string) => string;
}
