/**
 * tests/unit/services/i18n.test.ts
 *
 * Unit tests for the i18n translation service.
 *
 * Tests translate(), parameter interpolation, missing-key fallbacks and
 * language switching logic in isolation using jsdom globals.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// i18n uses module-level state (activeLanguage, languagePreference).
// Import the individual pure exports to keep tests predictable.
import {
    translate,
    setLanguagePreference,
    getActiveLanguage,
    getLanguagePreference,
    appI18n,
} from '../../../src/ts/services/i18n.ts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Reset language to English before each test so the state is predictable. */
beforeEach(() => {
    localStorage.clear();
    setLanguagePreference('en');
});

// ─── translate() – basic lookup ───────────────────────────────────────────────

describe('translate – basic lookup', () => {
    it('returns an English string for a known top-level key', () => {
        const result = translate('context.open');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
    });

    it('returns a German string after switching to German', () => {
        setLanguagePreference('de');
        const en = translate('context.open', {}, { language: 'en' });
        const de = translate('context.open', {}, { language: 'de' });
        // Both should be non-empty strings; German and English differ
        expect(de).toBeTruthy();
        expect(typeof de).toBe('string');
        expect(de).not.toBe(en);
    });

    it('resolves nested dot-notation keys', () => {
        const result = translate('context.finder.newFolder');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
    });

    it('returns empty string for an empty key', () => {
        expect(translate('')).toBe('');
    });
});

// ─── translate() – missing keys ──────────────────────────────────────────────

describe('translate – missing key fallback', () => {
    it('returns the key itself when no translation and no fallback option are given', () => {
        const key = 'this.key.does.not.exist';
        expect(translate(key)).toBe(key);
    });

    it('returns the explicit fallback option when key is missing', () => {
        expect(translate('no.such.key', {}, { fallback: 'My Fallback' })).toBe('My Fallback');
    });

    it('falls back to English when the key is missing in the active language', () => {
        // Temporarily inject a key only into the English translations so we can
        // verify the fallback path (resolveKey(lang) → undefined → resolveKey('en')).
        const translations = appI18n.translations;
        (translations['en'] as Record<string, unknown>)['__test_en_only__'] = 'English only';

        setLanguagePreference('de');
        const result = translate('__test_en_only__');

        // Cleanup before asserting so a failed assertion doesn't leak state
        delete (translations['en'] as Record<string, unknown>)['__test_en_only__'];

        expect(result).toBe('English only');
    });
});

// ─── translate() – parameter interpolation ───────────────────────────────────

describe('translate – parameter interpolation', () => {
    it('replaces {token} placeholders in a known template string', () => {
        // 'textEditor.status.wordCount' = 'Words: {words} | Characters: {chars}' in English
        const result = translate('textEditor.status.wordCount', { words: 42, chars: 256 });
        expect(result).toContain('42');
        expect(result).toContain('256');
        // Must NOT contain the raw placeholder tokens
        expect(result).not.toContain('{words}');
        expect(result).not.toContain('{chars}');
    });

    it('leaves unreferenced {tokens} in the template when param is not supplied', () => {
        // Provide only 'words', omit 'chars' → {chars} placeholder stays in output
        const result = translate('textEditor.status.wordCount', { words: 10 });
        expect(result).toContain('10');
        expect(result).toContain('{chars}');
    });

    it('leaves unreferenced {tokens} intact when the key returns the key itself', () => {
        // When the key does not exist the function returns the raw key string,
        // not a template, so no replacement happens.
        const key = 'nonexistent.key';
        expect(translate(key, { foo: 'bar' })).toBe(key);
    });
});

// ─── setLanguagePreference / getActiveLanguage ────────────────────────────────

describe('setLanguagePreference & getActiveLanguage', () => {
    it('switches the active language to English', () => {
        setLanguagePreference('en');
        expect(getActiveLanguage()).toBe('en');
    });

    it('switches the active language to German', () => {
        setLanguagePreference('de');
        expect(getActiveLanguage()).toBe('de');
    });

    it('persists the preference in localStorage', () => {
        setLanguagePreference('de');
        expect(localStorage.getItem('languagePreference')).toBe('de');
    });

    it('accepts the "system" pseudo-preference without throwing', () => {
        expect(() => setLanguagePreference('system')).not.toThrow();
        expect(getLanguagePreference()).toBe('system');
    });

    it('ignores an invalid preference and falls back to system', () => {
        // @ts-expect-error – intentionally passing invalid value
        setLanguagePreference('klingon');
        expect(getLanguagePreference()).toBe('system');
    });
});

// ─── getLanguagePreference ────────────────────────────────────────────────────

describe('getLanguagePreference', () => {
    it('returns the preference that was just set', () => {
        setLanguagePreference('en');
        expect(getLanguagePreference()).toBe('en');

        setLanguagePreference('de');
        expect(getLanguagePreference()).toBe('de');
    });
});

// ─── translate() – language override option ───────────────────────────────────

describe('translate – language override option', () => {
    it('uses the specified language regardless of the active preference', () => {
        setLanguagePreference('de');
        // Force English via options
        const forced = translate('context.open', {}, { language: 'en' });
        const active = translate('context.open');
        // forced (EN) must differ from active (DE) for this key
        expect(typeof forced).toBe('string');
        expect(forced).not.toBe(active);
    });
});

