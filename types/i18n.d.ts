// Ambient types for i18n system

declare interface AppI18nAPI {
    translate(
        key: string,
        paramsOrFallback?: Record<string, unknown> | string,
        options?: { fallback?: string }
    ): string;
    setLanguagePreference(lang: 'system' | 'de' | 'en' | 'en-us'): void;
    getLanguagePreference(): 'system' | 'de' | 'en' | 'en-us';
    getActiveLanguage(): 'de' | 'en';
    applyTranslations(root?: Document | Element | null): void;
}

declare const appI18n: AppI18nAPI;

declare function translate(key: string, fallback?: string): string;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
