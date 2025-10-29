/**
 * src/ts/storage-utils.ts
 * Small, safe helpers around localStorage with JSON handling.
 */

export function getString(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function setString(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch (err) {
        console.warn(`[storage-utils] setString failed for key="${key}":`, err);
    }
}

export function remove(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch (err) {
        console.warn(`[storage-utils] remove failed for key="${key}":`, err);
    }
}

export function getJSON<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch (err) {
        console.warn(`[storage-utils] getJSON failed for key="${key}":`, err);
        return fallback;
    }
}

export function setJSON(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        console.warn(`[storage-utils] setJSON failed for key="${key}":`, err);
    }
}
