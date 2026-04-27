/**
 * Storage Shim für Vitest localStorage Tests
 *
 * Da jsdom localStorage nach clear() kaputt geht, erstellen wir hier
 * einen vollständigen Storage-Shim, der immer sauber funktioniert.
 */

class StorageShim extends Storage {
    #data = new Map<string, string>();

    constructor(data?: Record<string, string>) {
        super();
        if (data) {
            for (const [k, v] of Object.entries(data)) {
                this.#data.set(k, v as string);
            }
        }
    }

    // Delegieren aller Methoden an den internen Map
    getItem(key: string): string | null {
        return this.#data.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.#data.set(key, value);
    }

    removeItem(key: string): void {
        this.#data.delete(key);
    }

    clear(): void {
        this.#data.clear();
    }

    // Override für jsdom Kompatibilität
    key(n: number): string | null {
        const keys = Array.from(this.#data.keys());
        return n < keys.length ? keys[n] : null;
    }

    get length(): number {
        return this.#data.size;
    }

    // Override für jsdom Kompatität
    get [Symbol.iterator](): Iterator<string> {
        return this.#data[Symbol.iterator]();
    }
}

export function createStorageShim(initialData?: Record<string, string>): StorageShim {
    return new StorageShim(initialData);
}

export default StorageShim;
