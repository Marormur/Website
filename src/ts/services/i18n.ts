/**
 * i18n.ts - Internationalization System
 *
 * Central translation system - TypeScript implementation.
 * Single Source of Truth for all translations in the portfolio.
 *
 * Translation data is organized in separate language files (de.ts, en.ts)
 * to keep this file focused on logic and type definitions.
 *
 * @module i18n
 */

// ========================================
// Imports
// ========================================

import { de } from '../i18n/de';
import { en } from '../i18n/en';
import logger from '../core/logger.js';

// ========================================
// Type Definitions
// ========================================

export type LanguageCode = 'de' | 'en';
export type LanguagePreference = 'system' | LanguageCode | 'en-us';

export interface TranslationParams {
    [key: string]: string | number;
}

export interface TranslateOptions {
    language?: LanguageCode;
    fallback?: string;
}

type TranslationValue = string | TranslationDict;

interface TranslationDict {
    [key: string]: TranslationValue;
}

export interface AppI18n {
    translate: (
        key: string,
        paramsOrFallback?: TranslationParams | string,
        options?: TranslateOptions
    ) => string;
    applyTranslations: (root?: Document | Element) => void;
    setLanguagePreference: (pref: LanguagePreference) => LanguageCode;
    getLanguagePreference: () => LanguagePreference;
    getActiveLanguage: () => LanguageCode;
    translations: Record<LanguageCode, TranslationDict>;
    supportedLanguages: readonly LanguageCode[];
    languageOptions: readonly LanguagePreference[];
}

// ========================================
// Constants
// ========================================

const LANGUAGE_PREFERENCE_KEY = 'languagePreference';
const SUPPORTED_LANGUAGES: readonly LanguageCode[] = ['de', 'en'] as const;
const LANGUAGE_OPTIONS: readonly LanguagePreference[] = [
    'system',
    ...SUPPORTED_LANGUAGES,
    'en-us',
] as const;
const FALLBACK_LANGUAGE: LanguageCode = 'en';

// ========================================
// Translation Database
// ========================================

const translations: Record<LanguageCode, TranslationDict> = {
    de,
    en,
};

// ========================================
// Language Detection & Management
// ========================================

function normalizeLanguage(input: unknown): LanguageCode | null {
    if (!input) return null;
    const value = String(input).trim().toLowerCase();
    if (!value) return null;
    const base = value.split(/[-_]/)[0] || '';
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(base)
        ? (base as LanguageCode)
        : null;
}

function parsePreference(value: unknown): LanguagePreference {
    if (value === null || value === undefined) return 'system';
    const normalized = String(value).trim().toLowerCase().replace('_', '-');
    if (normalized === 'en-gb') {
        return 'en';
    }
    return (LANGUAGE_OPTIONS as readonly string[]).includes(normalized)
        ? (normalized as LanguagePreference)
        : 'system';
}

function getBrowserLanguages(): string[] {
    const langs: string[] = [];
    if (Array.isArray(navigator.languages)) {
        langs.push(...navigator.languages);
    }
    if (navigator.language) {
        langs.push(navigator.language);
    }
    // Legacy IE support
    const navWithUserLang = navigator as { userLanguage?: string };
    if (navWithUserLang.userLanguage) {
        langs.push(navWithUserLang.userLanguage);
    }
    return langs.length ? langs : ['en'];
}

function detectSystemLanguage(): LanguageCode {
    const candidates = getBrowserLanguages();
    for (const candidate of candidates) {
        const normalized = normalizeLanguage(candidate);
        if (normalized) {
            return normalized;
        }
    }
    return FALLBACK_LANGUAGE;
}

// ========================================
// State Management
// ========================================

let languagePreference: LanguagePreference = parsePreference(
    typeof localStorage !== 'undefined' ? localStorage.getItem(LANGUAGE_PREFERENCE_KEY) : null
);

function resolveActiveLanguage(pref: LanguagePreference): LanguageCode {
    if (pref === 'system') {
        return detectSystemLanguage();
    }
    if (pref === 'en-us') {
        return 'en';
    }
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(pref)
        ? (pref as LanguageCode)
        : FALLBACK_LANGUAGE;
}

let activeLanguage: LanguageCode = resolveActiveLanguage(languagePreference);

function setDocumentLanguage(lang: LanguageCode): void {
    if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = lang;
    }
}

// ========================================
// Translation Functions
// ========================================

function formatTemplate(template: string, params?: TranslationParams): string {
    if (typeof template !== 'string') {
        return template;
    }
    if (!params || typeof params !== 'object') {
        return template;
    }
    return template.replace(/\{([^}]+)\}/g, (match, token) => {
        const key = token.trim();
        return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match;
    });
}

function resolveKey(lang: LanguageCode, key: string): unknown {
    const segments = key.split('.');
    let current: unknown = translations[lang];
    for (const segment of segments) {
        if (!current || typeof current !== 'object' || !(segment in current)) {
            return undefined;
        }
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
}

/**
 * Translate a key to the active language, with optional interpolation.
 *
 * Falls back to `FALLBACK_LANGUAGE` (`'en'`) if the key is missing in the active language.
 * Returns `options.fallback` (or the raw `key`) when no translation is found.
 *
 * @param key - Dot-separated translation key, e.g. `'menu.file.new'`.
 * @param params - Optional interpolation variables, e.g. `{ name: 'Marvin' }`.
 * @param options - Override language or provide a custom fallback string.
 * @returns The translated and interpolated string.
 *
 * @example
 * ```typescript
 * translate('menu.file');               // "File" (or "Datei" in German)
 * translate('greeting', { name: 'World' }); // "Hello, World!"
 * translate('missing.key', {}, { fallback: 'Default' }); // "Default"
 * ```
 */
export function translate(
    key: string,
    paramsOrFallback: TranslationParams | string = {},
    options: TranslateOptions = {}
): string {
    if (!key) return '';
    const params =
        typeof paramsOrFallback === 'string' ? {} : (paramsOrFallback as TranslationParams);
    const effectiveOptions =
        typeof paramsOrFallback === 'string' ? { ...options, fallback: paramsOrFallback } : options;
    const lang = options.language || activeLanguage;
    let value = resolveKey(lang, key);
    if (value === undefined && lang !== FALLBACK_LANGUAGE) {
        value = resolveKey(FALLBACK_LANGUAGE, key);
    }
    if (value === undefined) {
        return effectiveOptions.fallback !== undefined ? effectiveOptions.fallback : key;
    }
    if (typeof value === 'string') {
        return formatTemplate(value, params);
    }
    return String(value);
}

// ========================================
// DOM Translation
// ========================================

function parseParams(element: Element): TranslationParams | undefined {
    const paramsAttr = element.getAttribute('data-i18n-params');
    if (!paramsAttr) {
        return undefined;
    }
    try {
        return JSON.parse(paramsAttr) as TranslationParams;
    } catch (err) {
        logger.warn('I18N', 'Could not parse data-i18n-params:', err);
        return undefined;
    }
}

const ALLOWED_I18N_INLINE_TAGS = new Set(['br', 'strong', 'b', 'em', 'i', 'u', 'small', 'code']);

const I18N_INLINE_TAG_PATTERN = /<\/?\s*(strong|b|em|i|u|small|code|br)\s*\/?>/gi;

const HTML_ENTITY_MAP: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: '\u00a0',
};

function decodeHtmlEntities(text: string): string {
    return text.replace(/&(?:#x([\da-f]+)|#(\d+)|([a-z]+));/gi, (match, hex, decimal, named) => {
        if (hex) {
            const codePoint = Number.parseInt(hex, 16);
            return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
        }
        if (decimal) {
            const codePoint = Number.parseInt(decimal, 10);
            return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
        }
        const normalizedName = String(named).toLowerCase();
        return HTML_ENTITY_MAP[normalizedName] ?? match;
    });
}

function buildSafeInlineFragment(html: string): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const openElements: Array<{ tagName: string; node: Element }> = [];
    let cursor = 0;

    const appendText = (text: string): void => {
        if (!text) {
            return;
        }
        const parent = openElements[openElements.length - 1]?.node ?? fragment;
        parent.appendChild(document.createTextNode(decodeHtmlEntities(text)));
    };

    for (const match of html.matchAll(I18N_INLINE_TAG_PATTERN)) {
        const matchedText = match[0];
        const tagName = match[1]?.toLowerCase();
        const start = match.index ?? 0;
        appendText(html.slice(cursor, start));
        cursor = start + matchedText.length;

        if (!tagName || !ALLOWED_I18N_INLINE_TAGS.has(tagName)) {
            appendText(matchedText);
            continue;
        }

        if (matchedText.startsWith('</')) {
            const current = openElements[openElements.length - 1];
            if (current?.tagName === tagName) {
                openElements.pop();
            } else {
                appendText(matchedText);
            }
            continue;
        }

        const parent = openElements[openElements.length - 1]?.node ?? fragment;
        if (tagName === 'br') {
            parent.appendChild(document.createElement('br'));
            continue;
        }

        const safeElement = document.createElement(tagName);
        parent.appendChild(safeElement);
        openElements.push({ tagName, node: safeElement });
    }

    appendText(html.slice(cursor));
    return fragment;
}

function translateElement(element: Element): void {
    if (!(element instanceof Element)) {
        return;
    }
    const params = parseParams(element) || {};
    const textKey = element.getAttribute('data-i18n');
    if (textKey) {
        element.textContent = translate(textKey, params);
    }
    const htmlKey = element.getAttribute('data-i18n-html');
    if (htmlKey) {
        const html = translate(htmlKey, params);
        element.replaceChildren(buildSafeInlineFragment(html));
    }
    Array.from(element.attributes).forEach(attr => {
        if (!attr.name.startsWith('data-i18n-')) return;
        if (attr.name === 'data-i18n' || attr.name === 'data-i18n-html') return;
        const targetAttr = attr.name.substring('data-i18n-'.length);
        if (!targetAttr) return;
        element.setAttribute(targetAttr, translate(attr.value, params));
    });
}

/**
 * Apply translations to all `[data-i18n]` elements within `root`.
 *
 * Also handles `[data-i18n-html]` (restricted inline markup) and arbitrary `[data-i18n-<attr>]` attribute translations.
 * Called automatically on language change; can also be called manually on dynamically inserted DOM.
 *
 * @param root - Root element or document to start from. Defaults to `document`.
 *
 * @example
 * ```typescript
 * // Re-apply translations after injecting dynamic HTML
 * const panel = document.getElementById('my-panel');
 * applyTranslations(panel!);
 * ```
 */
export function applyTranslations(root: Document | Element = document): void {
    if (!root) return;
    const base = root === document ? document.documentElement : root;
    if (!base || !(base instanceof Element)) return;
    translateElement(base);
    const elements = base.querySelectorAll('*');
    elements.forEach(translateElement);
}

// ========================================
// Language Change Management
// ========================================

function dispatchLanguageEvent(): void {
    if (typeof window === 'undefined') return;
    const event = new CustomEvent('languagePreferenceChange', {
        detail: {
            preference: languagePreference,
            language: activeLanguage,
        },
    });
    window.dispatchEvent(event);
}

function refreshActiveLanguage(emitEvent = true): void {
    const nextLanguage = resolveActiveLanguage(languagePreference);
    const languageChanged = nextLanguage !== activeLanguage;
    activeLanguage = nextLanguage;
    setDocumentLanguage(activeLanguage);
    applyTranslations(document);
    if (emitEvent || languageChanged) {
        dispatchLanguageEvent();
    }
}

/**
 * Set the user's language preference and immediately apply it.
 *
 * Persists the preference in `localStorage` and triggers a `languagePreferenceChange`
 * DOM event so other modules can react.
 *
 * @param pref - `'system'` to follow the browser locale, or a specific language preference.
 * @returns The `LanguageCode` that became active after the change.
 *
 * @example
 * ```typescript
 * setLanguagePreference('de'); // Switch to German
 * setLanguagePreference('system'); // Follow browser language
 * ```
 */
export function setLanguagePreference(pref: LanguagePreference): LanguageCode {
    const normalized = parsePreference(pref);
    if (normalized === languagePreference) {
        refreshActiveLanguage(true);
        return activeLanguage;
    }
    languagePreference = normalized;
    if (typeof localStorage !== 'undefined') {
        if (normalized === 'system') {
            localStorage.setItem(LANGUAGE_PREFERENCE_KEY, 'system');
        } else {
            localStorage.setItem(LANGUAGE_PREFERENCE_KEY, normalized);
        }
    }
    refreshActiveLanguage(true);
    return activeLanguage;
}

/**
 * Return the stored language preference (`'system'`, `'de'`, `'en'`, or `'en-us'`).
 *
 * @returns Current `LanguagePreference` setting.
 */
export function getLanguagePreference(): LanguagePreference {
    return languagePreference;
}

/**
 * Return the language code that is currently active for translations.
 *
 * Unlike {@link getLanguagePreference}, this always returns a concrete language code
 * (`'de'` or `'en'`), never `'system'`.
 *
 * @returns Active `LanguageCode`.
 */
export function getActiveLanguage(): LanguageCode {
    return activeLanguage;
}

// ========================================
// Browser Event Listeners
// ========================================

if (typeof window !== 'undefined') {
    window.addEventListener('languagechange', () => {
        if (languagePreference === 'system') {
            refreshActiveLanguage(true);
        }
    });

    window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key !== LANGUAGE_PREFERENCE_KEY) {
            return;
        }
        const newPreference = parsePreference(event.newValue);
        languagePreference = newPreference;
        refreshActiveLanguage(true);
    });
}

// ========================================
// Initialization
// ========================================

if (typeof document !== 'undefined') {
    setDocumentLanguage(activeLanguage);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyTranslations(document));
    } else {
        applyTranslations(document);
    }
}

// ========================================
// Global API Export
// ========================================

export const appI18n: AppI18n = {
    translate,
    applyTranslations,
    setLanguagePreference,
    getLanguagePreference,
    getActiveLanguage,
    translations,
    supportedLanguages: SUPPORTED_LANGUAGES,
    languageOptions: LANGUAGE_OPTIONS,
};

// Expose to global window object
if (typeof window !== 'undefined') {
    window.appI18n = appI18n;
}
