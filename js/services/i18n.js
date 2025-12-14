'use strict';
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
Object.defineProperty(exports, '__esModule', { value: true });
exports.appI18n = void 0;
exports.translate = translate;
exports.applyTranslations = applyTranslations;
exports.setLanguagePreference = setLanguagePreference;
exports.getLanguagePreference = getLanguagePreference;
exports.getActiveLanguage = getActiveLanguage;
// ========================================
// Imports
// ========================================
const de_1 = require('../i18n/de');
const en_1 = require('../i18n/en');
// ========================================
// Constants
// ========================================
const LANGUAGE_PREFERENCE_KEY = 'languagePreference';
const SUPPORTED_LANGUAGES = ['de', 'en'];
const LANGUAGE_OPTIONS = ['system', ...SUPPORTED_LANGUAGES];
const FALLBACK_LANGUAGE = 'en';
// ========================================
// Translation Database
// ========================================
const translations = {
    de: de_1.de,
    en: en_1.en,
};
// ========================================
// Language Detection & Management
// ========================================
function normalizeLanguage(input) {
    if (!input) return null;
    const value = String(input).trim().toLowerCase();
    if (!value) return null;
    const base = value.split(/[-_]/)[0] || '';
    return SUPPORTED_LANGUAGES.includes(base) ? base : null;
}
function parsePreference(value) {
    if (value === null || value === undefined) return 'system';
    const normalized = String(value).trim();
    return LANGUAGE_OPTIONS.includes(normalized) ? normalized : 'system';
}
function getBrowserLanguages() {
    const langs = [];
    if (Array.isArray(navigator.languages)) {
        langs.push(...navigator.languages);
    }
    if (navigator.language) {
        langs.push(navigator.language);
    }
    // Legacy IE support
    const navWithUserLang = navigator;
    if (navWithUserLang.userLanguage) {
        langs.push(navWithUserLang.userLanguage);
    }
    return langs.length ? langs : ['en'];
}
function detectSystemLanguage() {
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
let languagePreference = parsePreference(
    typeof localStorage !== 'undefined' ? localStorage.getItem(LANGUAGE_PREFERENCE_KEY) : null
);
function resolveActiveLanguage(pref) {
    if (pref === 'system') {
        return detectSystemLanguage();
    }
    return SUPPORTED_LANGUAGES.includes(pref) ? pref : FALLBACK_LANGUAGE;
}
let activeLanguage = resolveActiveLanguage(languagePreference);
function setDocumentLanguage(lang) {
    if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = lang;
    }
}
// ========================================
// Translation Functions
// ========================================
function formatTemplate(template, params) {
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
function resolveKey(lang, key) {
    const segments = key.split('.');
    let current = translations[lang];
    for (const segment of segments) {
        if (!current || typeof current !== 'object' || !(segment in current)) {
            return undefined;
        }
        current = current[segment];
    }
    return current;
}
function translate(key, params = {}, options = {}) {
    if (!key) return '';
    const lang = options.language || activeLanguage;
    let value = resolveKey(lang, key);
    if (value === undefined && lang !== FALLBACK_LANGUAGE) {
        value = resolveKey(FALLBACK_LANGUAGE, key);
    }
    if (value === undefined) {
        return options.fallback !== undefined ? options.fallback : key;
    }
    if (typeof value === 'string') {
        return formatTemplate(value, params);
    }
    return String(value);
}
// ========================================
// DOM Translation
// ========================================
function parseParams(element) {
    const paramsAttr = element.getAttribute('data-i18n-params');
    if (!paramsAttr) {
        return undefined;
    }
    try {
        return JSON.parse(paramsAttr);
    } catch (err) {
        console.warn('Could not parse data-i18n-params:', err);
        return undefined;
    }
}
function translateElement(element) {
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
        element.innerHTML = translate(htmlKey, params);
    }
    Array.from(element.attributes).forEach(attr => {
        if (!attr.name.startsWith('data-i18n-')) return;
        if (attr.name === 'data-i18n' || attr.name === 'data-i18n-html') return;
        const targetAttr = attr.name.substring('data-i18n-'.length);
        if (!targetAttr) return;
        element.setAttribute(targetAttr, translate(attr.value, params));
    });
}
function applyTranslations(root = document) {
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
function dispatchLanguageEvent() {
    if (typeof window === 'undefined') return;
    const event = new CustomEvent('languagePreferenceChange', {
        detail: {
            preference: languagePreference,
            language: activeLanguage,
        },
    });
    window.dispatchEvent(event);
}
function refreshActiveLanguage(emitEvent = true) {
    const nextLanguage = resolveActiveLanguage(languagePreference);
    const languageChanged = nextLanguage !== activeLanguage;
    activeLanguage = nextLanguage;
    setDocumentLanguage(activeLanguage);
    applyTranslations(document);
    if (emitEvent || languageChanged) {
        dispatchLanguageEvent();
    }
}
function setLanguagePreference(pref) {
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
function getLanguagePreference() {
    return languagePreference;
}
function getActiveLanguage() {
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
    window.addEventListener('storage', event => {
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
exports.appI18n = {
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
    window.appI18n = exports.appI18n;
}
//# sourceMappingURL=i18n.js.map
