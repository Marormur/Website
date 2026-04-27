/**
 * Storage Shim fuer Vitest localStorage Tests.
 *
 * In einigen jsdom-Konstellationen kann localStorage.clear() den Storage-Zustand
 * fuer Folgetests unzuverlaessig machen. Der Shim bietet eine stabile, rein
 * speicherbasierte Storage-Implementierung fuer deterministische Unit-Tests.
 */

class StorageShim implements Storage {
    #data = new Map<string, string>();

    constructor(data?: Record<string, string>) {
        if (data) {
            for (const [key, value] of Object.entries(data)) {
                this.#data.set(key, value);
            }
        }
    }

    get length(): number {
        return this.#data.size;
    }

    clear(): void {
        this.#data.clear();
    }

    getItem(key: string): string | null {
        return this.#data.get(key) ?? null;
    }

    key(index: number): string | null {
        const keys = Array.from(this.#data.keys());
        return keys[index] ?? null;
    }

    removeItem(key: string): void {
        this.#data.delete(key);
    }

    setItem(key: string, value: string): void {
        this.#data.set(key, value);
    }
}

function readStorageSnapshot(storage: Storage): Record<string, string> {
    const snapshot: Record<string, string> = {};

    for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key) {
            continue;
        }

        const value = storage.getItem(key);
        if (value !== null) {
            snapshot[key] = value;
        }
    }

    return snapshot;
}

export function createStorageShim(initialData?: Record<string, string>): Storage {
    return new StorageShim(initialData);
}

export function installStorageShim(): void {
    const initialData = readStorageSnapshot(window.localStorage);

    Object.defineProperty(window, 'localStorage', {
        value: createStorageShim(initialData),
        configurable: true,
    });
}

export default StorageShim;
