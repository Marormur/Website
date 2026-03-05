/**
 * tests/unit/services/storage-utils.test.ts
 *
 * Unit tests for the storage-utils module.
 *
 * Tests all five helpers – getString, setString, remove, getJSON, setJSON –
 * using jsdom's built-in localStorage mock.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    getString,
    setString,
    remove,
    getJSON,
    setJSON,
} from '../../../src/ts/services/storage-utils.js';

beforeEach(() => {
    localStorage.clear();
});

// ─── getString ───────────────────────────────────────────────────────────────

describe('getString', () => {
    it('returns the string stored under the given key', () => {
        localStorage.setItem('test-key', 'hello');
        expect(getString('test-key')).toBe('hello');
    });

    it('returns null when the key does not exist', () => {
        expect(getString('no-such-key')).toBeNull();
    });
});

// ─── setString ───────────────────────────────────────────────────────────────

describe('setString', () => {
    it('writes a string value to localStorage', () => {
        setString('greet', 'world');
        expect(localStorage.getItem('greet')).toBe('world');
    });

    it('overwrites an existing value', () => {
        setString('greet', 'first');
        setString('greet', 'second');
        expect(localStorage.getItem('greet')).toBe('second');
    });
});

// ─── remove ──────────────────────────────────────────────────────────────────

describe('remove', () => {
    it('deletes an existing key from localStorage', () => {
        localStorage.setItem('to-remove', 'value');
        remove('to-remove');
        expect(localStorage.getItem('to-remove')).toBeNull();
    });

    it('does not throw when the key does not exist', () => {
        expect(() => remove('ghost-key')).not.toThrow();
    });
});

// ─── getJSON ──────────────────────────────────────────────────────────────────

describe('getJSON', () => {
    it('returns a parsed object from localStorage', () => {
        localStorage.setItem('obj', JSON.stringify({ a: 1 }));
        expect(getJSON('obj', null)).toEqual({ a: 1 });
    });

    it('returns the fallback when the key is absent', () => {
        expect(getJSON('missing', 42)).toBe(42);
    });

    it('returns the fallback when the stored value is not valid JSON', () => {
        localStorage.setItem('broken', 'not-json{{{');
        expect(getJSON('broken', 'default')).toBe('default');
    });

    it('returns the fallback when the value is an empty string', () => {
        localStorage.setItem('empty', '');
        expect(getJSON('empty', 'fallback')).toBe('fallback');
    });

    it('parses arrays correctly', () => {
        localStorage.setItem('arr', JSON.stringify([1, 2, 3]));
        expect(getJSON('arr', [])).toEqual([1, 2, 3]);
    });
});

// ─── setJSON ──────────────────────────────────────────────────────────────────

describe('setJSON', () => {
    it('serialises an object to localStorage', () => {
        setJSON('config', { theme: 'dark' });
        expect(JSON.parse(localStorage.getItem('config') ?? '{}')).toEqual({ theme: 'dark' });
    });

    it('serialises an array to localStorage', () => {
        setJSON('list', [1, 2, 3]);
        expect(JSON.parse(localStorage.getItem('list') ?? '[]')).toEqual([1, 2, 3]);
    });

    it('stores primitive values without throwing', () => {
        expect(() => setJSON('num', 99)).not.toThrow();
        expect(localStorage.getItem('num')).toBe('99');
    });

    it('overwrites an existing value', () => {
        setJSON('overwrite', { v: 1 });
        setJSON('overwrite', { v: 2 });
        expect(JSON.parse(localStorage.getItem('overwrite') ?? '{}')).toEqual({ v: 2 });
    });
});
