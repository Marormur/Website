/**
 * virtual-fs.ts
 * Central Virtual File System
 *
 * Provides a persistent, in-memory file system that can be shared across
 * multiple modules (Finder, Terminal, TextEditor, etc.).
 *
 * Features:
 * - CRUD operations (Create, Read, Update, Delete)
 * - LocalStorage persistence
 * - Path-based navigation
 * - File metadata (size, modified, type)
 * - Event system for change notifications
 */

import { getJSON, setJSON, remove } from './storage-utils.js';

// Lightweight storage adapter abstraction to support different persistence backends
interface VfsStorageAdapter {
    name: string;
    load(): Promise<FileSystemRoot | null>;
    save(root: FileSystemRoot): Promise<void>;
    clear?(): Promise<void>;
    // Optional: persist only file content updates
    saveDeltaFiles?(updates: Array<{ path: string; file: FileItem }>): Promise<void>;
    // Optional: overlay file content into a loaded root (used to hydrate after delta-saves)
    overlayFilesOnLoad?(root: FileSystemRoot): Promise<void>;
    // Optional: delete delta records for a given path/prefix
    deleteDeltaForPrefix?(prefix: string): Promise<void>;
    // Optional: rename delta record keys from oldPrefix to newPrefix
    renameDeltaPrefix?(oldPrefix: string, newPrefix: string): Promise<void>;
    // Optional: clear all delta records (after full save/import/reset)
    clearAllDeltas?(): Promise<void>;
}

// LocalStorage-based adapter (backward compatible, used as fallback)
class LocalStorageAdapter implements VfsStorageAdapter {
    public readonly name = 'localStorage';
    constructor(private readonly key: string) {}
    async load(): Promise<FileSystemRoot | null> {
        try {
            return getJSON<FileSystemRoot | null>(this.key, null);
        } catch {
            return null;
        }
    }
    async save(root: FileSystemRoot): Promise<void> {
        setJSON(this.key, root);
    }
    async clear(): Promise<void> {
        remove(this.key);
    }
}

// IndexedDB-based adapter for large and non-blocking persistence
class IndexedDbAdapter implements VfsStorageAdapter {
    public readonly name = 'IndexedDB';
    private dbPromise: Promise<IDBDatabase> | null = null;
    private static readonly DB_NAME = 'VirtualFS';
    private static readonly STORE = 'fs';
    private static readonly FILES = 'files';

    private openDb(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;
        this.dbPromise = new Promise((resolve, reject) => {
            try {
                const req = indexedDB.open(IndexedDbAdapter.DB_NAME, 2);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(IndexedDbAdapter.STORE)) {
                        db.createObjectStore(IndexedDbAdapter.STORE);
                    }
                    if (!db.objectStoreNames.contains(IndexedDbAdapter.FILES)) {
                        db.createObjectStore(IndexedDbAdapter.FILES);
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
                req.onblocked = () => {
                    // Continue to wait; consumer may retry later
                    console.warn('[VirtualFS][IDB] open blocked');
                };
            } catch (err) {
                reject(err);
            }
        });
        return this.dbPromise;
    }

    private async withStore<T>(
        mode: IDBTransactionMode,
        fn: (store: IDBObjectStore) => void | T | Promise<T>
    ): Promise<T> {
        const db = await this.openDb();
        return await new Promise<T>((resolve, reject) => {
            const tx = db.transaction(IndexedDbAdapter.STORE, mode);
            const store = tx.objectStore(IndexedDbAdapter.STORE);
            let out: T | undefined;
            try {
                const maybe = fn(store);
                if (maybe instanceof Promise) {
                    maybe
                        .then(value => {
                            out = value as T;
                        })
                        .catch(reject);
                } else {
                    out = maybe as T;
                }
            } catch (err) {
                reject(err);
                return;
            }
            tx.oncomplete = () => resolve(out as T);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    async load(): Promise<FileSystemRoot | null> {
        try {
            return await this.withStore<FileSystemRoot | null>('readonly', store => {
                return new Promise<FileSystemRoot | null>((resolve, reject) => {
                    const req = store.get('root');
                    req.onsuccess = () => resolve((req.result as FileSystemRoot) || null);
                    req.onerror = () => reject(req.error);
                });
            });
        } catch (err) {
            console.warn('[VirtualFS][IDB] load failed:', err);
            return null;
        }
    }

    async save(root: FileSystemRoot): Promise<void> {
        try {
            await this.withStore<void>('readwrite', store => {
                return new Promise<void>((resolve, reject) => {
                    const req = store.put(root, 'root');
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error);
                });
            });
        } catch (err) {
            console.warn('[VirtualFS][IDB] save failed:', err);
            throw err;
        }
    }

    async clear(): Promise<void> {
        try {
            await this.withStore<void>('readwrite', store => {
                return new Promise<void>((resolve, reject) => {
                    const req = store.clear();
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error);
                });
            });
            // Also clear delta files store
            const db = await this.openDb();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(IndexedDbAdapter.FILES, 'readwrite');
                const st = tx.objectStore(IndexedDbAdapter.FILES);
                const req = st.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
                tx.onabort = () => reject(tx.error);
            });
        } catch (err) {
            console.warn('[VirtualFS][IDB] clear failed:', err);
        }
    }

    async deleteDeltaForPrefix(prefix: string): Promise<void> {
        const db = await this.openDb();
        const norm = prefix.replace(/\/+$/, '');
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(IndexedDbAdapter.FILES, 'readwrite');
            const store = tx.objectStore(IndexedDbAdapter.FILES);
            const req = store.openCursor();
            req.onsuccess = () => {
                const cursor = req.result as IDBCursorWithValue | null;
                if (!cursor) return; // done
                const key = String(cursor.key);
                if (key === norm || key.startsWith(norm + '/')) {
                    cursor.delete();
                }
                cursor.continue();
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    async renameDeltaPrefix(oldPrefix: string, newPrefix: string): Promise<void> {
        const db = await this.openDb();
        const oldNorm = oldPrefix.replace(/\/+$/, '');
        const newNorm = newPrefix.replace(/\/+$/, '');
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(IndexedDbAdapter.FILES, 'readwrite');
            const store = tx.objectStore(IndexedDbAdapter.FILES);
            const req = store.openCursor();
            req.onsuccess = () => {
                const cursor = req.result as IDBCursorWithValue | null;
                if (!cursor) return; // done
                const key = String(cursor.key);
                if (key === oldNorm || key.startsWith(oldNorm + '/')) {
                    const suffix = key.substring(oldNorm.length);
                    const newKey = newNorm + suffix;
                    const value = cursor.value; // { content, size, modified }
                    // Perform upsert under new key and delete old
                    const putReq = store.put(value, newKey);
                    putReq.onsuccess = () => cursor.delete();
                }
                cursor.continue();
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    async clearAllDeltas(): Promise<void> {
        const db = await this.openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(IndexedDbAdapter.FILES, 'readwrite');
            const st = tx.objectStore(IndexedDbAdapter.FILES);
            const req = st.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    async saveDeltaFiles(updates: Array<{ path: string; file: FileItem }>): Promise<void> {
        if (!updates || updates.length === 0) return;
        const db = await this.openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(IndexedDbAdapter.FILES, 'readwrite');
            const store = tx.objectStore(IndexedDbAdapter.FILES);
            for (const u of updates) {
                try {
                    const record = {
                        content: u.file.content,
                        size: u.file.size,
                        modified: u.file.modified,
                    } as const;
                    store.put(record as unknown as object, u.path as unknown as IDBValidKey);
                    // Note: We use out-of-line keys via the second parameter
                } catch (e) {
                    console.warn('[VirtualFS][IDB] delta put failed for', u.path, e);
                }
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    async overlayFilesOnLoad(root: FileSystemRoot): Promise<void> {
        const db = await this.openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(IndexedDbAdapter.FILES, 'readonly');
            const store = tx.objectStore(IndexedDbAdapter.FILES);
            const req = store.openCursor();
            req.onsuccess = () => {
                const cursor = req.result as IDBCursorWithValue | null;
                if (!cursor) return; // iteration finished
                const path = String(cursor.key);
                const rec = cursor.value as { content?: string; size?: number; modified?: string };
                try {
                    const parts = path.split('/').filter(Boolean);
                    let current: Record<string, FSItem> | null = (root['/'] as FolderItem).children;
                    let found: FSItem | null = null;
                    for (const part of parts) {
                        if (!current) {
                            found = null;
                            break;
                        }
                        const next: FSItem | undefined = current[part];
                        if (!next) {
                            found = null;
                            break;
                        }
                        found = next;
                        current = next.type === 'folder' ? next.children : null;
                    }
                    if (found && found.type === 'file') {
                        const nodeModified = Date.parse(found.modified || '0');
                        const recModified = Date.parse(String(rec.modified || '0'));
                        if (
                            !Number.isNaN(recModified) &&
                            (Number.isNaN(nodeModified) || recModified >= nodeModified)
                        ) {
                            if (typeof rec.content === 'string') found.content = rec.content || '';
                            if (typeof rec.size === 'number') found.size = rec.size || 0;
                            if (typeof rec.modified === 'string')
                                found.modified = rec.modified || found.modified;
                        }
                    }
                } catch {
                    // ignore individual overlay errors
                }
                cursor.continue();
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }
}

// ============================================================================
// Type Definitions
// ============================================================================

interface FileItem {
    type: 'file';
    icon: string;
    content: string;
    size: number;
    created: string;
    modified: string;
}

interface FolderItem {
    type: 'folder';
    icon: string;
    children: Record<string, FileItem | FolderItem>;
    created: string;
    modified: string;
}

type FSItem = FileItem | FolderItem;

interface FileSystemRoot {
    '/': FolderItem;
}

interface FSEvent {
    type: 'create' | 'update' | 'delete' | 'rename';
    path: string;
    oldPath?: string;
    item: FSItem;
}

type FSListener = (event: FSEvent) => void;

// ============================================================================
// Virtual File System Manager
// ============================================================================

class VirtualFileSystemManager {
    private root: FileSystemRoot;
    private listeners: FSListener[] = [];
    private readonly STORAGE_KEY = 'virtual-file-system';
    private readonly AUTO_SAVE_DELAY = 1000; // 1 second debounce
    private saveTimeout: number | null = null;
    private storage: VfsStorageAdapter;
    private readonly MIGRATION_FLAG = 'vfs:idb:migrated';
    // Delta save support
    private dirtyPaths: Set<string> = new Set();
    private structureDirty = false;
    private readonly DELTA_THRESHOLD = 10;

    private getRootContainer(): Record<string, FSItem> {
        return this.root['/'].children;
    }

    constructor() {
        this.root = this.createDefaultStructure();
        // Choose best available storage adapter (IndexedDB preferred)
        this.storage = this.selectStorageAdapter();
        // Start async load; default structure is available immediately
        void this.load();
    }

    // ========================================================================
    // Initialization
    // ========================================================================

    private createDefaultStructure(): FileSystemRoot {
        const now = new Date().toISOString();

        return {
            '/': {
                type: 'folder',
                icon: '/',
                created: now,
                modified: now,
                children: {
                    home: {
                        type: 'folder',
                        icon: '🏠',
                        created: now,
                        modified: now,
                        children: {
                            marvin: {
                                type: 'folder',
                                icon: '👤',
                                created: now,
                                modified: now,
                                children: {
                                    '.profile': {
                                        type: 'file',
                                        icon: '⚙️',
                                        content:
                                            '# ~/.profile\n# User profile configuration\n\nexport PATH=$HOME/bin:/usr/local/bin:/usr/bin:/bin\nexport EDITOR=vim\n',
                                        size: 112,
                                        created: now,
                                        modified: now,
                                    },
                                    'welcome.txt': {
                                        type: 'file',
                                        icon: '👋',
                                        content:
                                            'Welcome to the virtual terminal!\nType "help" to see available commands.\n',
                                        size: 72,
                                        created: now,
                                        modified: now,
                                    },
                                    'README.md': {
                                        type: 'file',
                                        icon: '📝',
                                        content:
                                            '# Welcome to your home directory\n\nThis is your personal space in the virtual file system.\n\n## Structure\n- Documents: Store your text files and documents\n- Downloads: Temporary download location\n- Pictures: Image files\n- Projects: Your code projects\n',
                                        size: 248,
                                        created: now,
                                        modified: now,
                                    },
                                    Documents: {
                                        type: 'folder',
                                        icon: '📄',
                                        created: now,
                                        modified: now,
                                        children: {
                                            'readme.txt': {
                                                type: 'file',
                                                icon: '📘',
                                                content:
                                                    'Welcome to your Documents folder. Store your work here!',
                                                size: 70,
                                                created: now,
                                                modified: now,
                                            },
                                            'notes.txt': {
                                                type: 'file',
                                                icon: '📝',
                                                content: 'Personal notes...',
                                                size: 17,
                                                created: now,
                                                modified: now,
                                            },
                                        },
                                    },
                                    Downloads: {
                                        type: 'folder',
                                        icon: '⬇️',
                                        created: now,
                                        modified: now,
                                        children: {},
                                    },
                                    Pictures: {
                                        type: 'folder',
                                        icon: '🖼️',
                                        created: now,
                                        modified: now,
                                        children: {},
                                    },
                                    Projects: {
                                        type: 'folder',
                                        icon: '💼',
                                        created: now,
                                        modified: now,
                                        children: {},
                                    },
                                },
                            },
                        },
                    },
                    etc: {
                        type: 'folder',
                        icon: '⚙️',
                        created: now,
                        modified: now,
                        children: {
                            hosts: {
                                type: 'file',
                                icon: '🌐',
                                content:
                                    '# /etc/hosts\n127.0.0.1   localhost\n::1         localhost\n',
                                size: 57,
                                created: now,
                                modified: now,
                            },
                        },
                    },
                    usr: {
                        type: 'folder',
                        icon: '📦',
                        created: now,
                        modified: now,
                        children: {
                            bin: {
                                type: 'folder',
                                icon: '⚡',
                                created: now,
                                modified: now,
                                children: {},
                            },
                            share: {
                                type: 'folder',
                                icon: '📚',
                                created: now,
                                modified: now,
                                children: {
                                    doc: {
                                        type: 'folder',
                                        icon: '📖',
                                        created: now,
                                        modified: now,
                                        children: {
                                            README: {
                                                type: 'file',
                                                icon: '📝',
                                                content:
                                                    'Virtual File System Documentation\n\nThis is a UNIX-like filesystem hierarchy.\n\nStandard directories:\n- /home: User home directories\n- /etc: System configuration\n- /usr: User programs and data\n- /var: Variable data (logs, temp)\n- /tmp: Temporary files\n',
                                                size: 252,
                                                created: now,
                                                modified: now,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    var: {
                        type: 'folder',
                        icon: '📊',
                        created: now,
                        modified: now,
                        children: {
                            log: {
                                type: 'folder',
                                icon: '📜',
                                created: now,
                                modified: now,
                                children: {},
                            },
                            tmp: {
                                type: 'folder',
                                icon: '🗂️',
                                created: now,
                                modified: now,
                                children: {},
                            },
                        },
                    },
                    tmp: {
                        type: 'folder',
                        icon: '🗑️',
                        created: now,
                        modified: now,
                        children: {},
                    },
                },
            },
        };
    }

    // ========================================================================
    // Persistence
    // ========================================================================

    async load(): Promise<void> {
        const perf = (
            window as {
                PerfMonitor?: {
                    mark: (n: string) => void;
                    measure: (n: string, s?: string, e?: string) => void;
                };
            }
        ).PerfMonitor;
        perf?.mark('vfs:load:start');

        try {
            const adapterName = this.storage.name;
            perf?.mark(`vfs:load:${adapterName}:start`);
            let stored = await this.storage.load();
            perf?.mark(`vfs:load:${adapterName}:end`);
            perf?.measure(
                `vfs:${adapterName}:load-duration`,
                `vfs:load:${adapterName}:start`,
                `vfs:load:${adapterName}:end`
            );

            if (!stored && adapterName === 'IndexedDB') {
                // Attempt one-time migration from localStorage
                const migrated = getJSON<string | null>(this.MIGRATION_FLAG, null);
                const lsData = getJSON<FileSystemRoot | null>(this.STORAGE_KEY, null);
                if (!migrated && lsData && Object.keys(lsData).length > 0) {
                    console.log('[VirtualFS] Migrating localStorage -> IndexedDB');
                    stored = lsData;
                    try {
                        await this.storage.save(lsData);
                        setJSON(this.MIGRATION_FLAG, '1');
                        // Optional: clear legacy to free space
                        remove(this.STORAGE_KEY);
                    } catch (err) {
                        console.warn('[VirtualFS] Migration save failed:', err);
                    }
                }
            }

            if (stored && Object.keys(stored).length > 0) {
                // Overlay delta file contents if supported
                if (typeof this.storage.overlayFilesOnLoad === 'function') {
                    try {
                        await this.storage.overlayFilesOnLoad(stored);
                    } catch (e) {
                        console.warn('[VirtualFS] overlayFilesOnLoad failed:', e);
                    }
                }
                this.root = stored;
                console.log(`[VirtualFS] Loaded from ${adapterName}`);
            } else {
                // Use default structure if no valid data in storage
                this.root = this.createDefaultStructure();
                console.log('[VirtualFS] No stored data, initialized with defaults');
            }
        } catch (error) {
            console.error('[VirtualFS] Failed to load:', error);
            // Fallback to defaults on error
            this.root = this.createDefaultStructure();
        }

        perf?.mark('vfs:load:end');
        perf?.measure('vfs:load-duration', 'vfs:load:start', 'vfs:load:end');
    }

    private scheduleSave(): void {
        if (this.saveTimeout !== null) {
            window.clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = window.setTimeout(() => {
            this.save();
            this.saveTimeout = null;
        }, this.AUTO_SAVE_DELAY);
    }

    private async save(): Promise<void> {
        const perf = (
            window as {
                PerfMonitor?: {
                    mark: (n: string) => void;
                    measure: (n: string, s?: string, e?: string) => void;
                };
            }
        ).PerfMonitor;
        perf?.mark('vfs:save:start');

        try {
            const adapterName = this.storage.name;
            const canDelta = typeof this.storage.saveDeltaFiles === 'function';
            const useDelta =
                canDelta &&
                !this.structureDirty &&
                this.dirtyPaths.size > 0 &&
                this.dirtyPaths.size < this.DELTA_THRESHOLD;

            if (useDelta) {
                perf?.mark(`vfs:delta-save:${adapterName}:start`);
                const updates: Array<{ path: string; file: FileItem }> = [];
                for (const p of this.dirtyPaths) {
                    const f = this.getFile(p);
                    if (f) updates.push({ path: this.normalizePath(p), file: f });
                }
                await (
                    this.storage.saveDeltaFiles as NonNullable<VfsStorageAdapter['saveDeltaFiles']>
                )(updates);
                perf?.mark(`vfs:delta-save:${adapterName}:end`);
                perf?.measure(
                    `vfs:${adapterName}:delta-save-duration`,
                    `vfs:delta-save:${adapterName}:start`,
                    `vfs:delta-save:${adapterName}:end`
                );
                console.log(`[VirtualFS] Delta-saved ${updates.length} file(s) to ${adapterName}`);
            } else {
                perf?.mark(`vfs:save:${adapterName}:start`);
                await this.storage.save(this.root);
                perf?.mark(`vfs:save:${adapterName}:end`);
                perf?.measure(
                    `vfs:${adapterName}:save-duration`,
                    `vfs:save:${adapterName}:start`,
                    `vfs:save:${adapterName}:end`
                );
                console.log(`[VirtualFS] Saved to ${adapterName}`);

                // After a successful full save, clear all delta entries (hygiene)
                if (typeof this.storage.clearAllDeltas === 'function') {
                    try {
                        await this.storage.clearAllDeltas();
                    } catch (err) {
                        console.warn('[VirtualFS] clearAllDeltas failed:', err);
                    }
                }
            }
        } catch (error) {
            console.error('[VirtualFS] Failed to save:', error);
        }

        perf?.mark('vfs:save:end');
        perf?.measure('vfs:save-duration', 'vfs:save:start', 'vfs:save:end');
        // Reset dirty markers
        this.dirtyPaths.clear();
        this.structureDirty = false;
    }

    forceSave(): void {
        if (this.saveTimeout !== null) {
            window.clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        void this.save();
    }

    /**
     * Force a synchronous-to-call, asynchronous persistence of the current filesystem state.
     * Useful for tests or shutdown hooks that want to ensure data is flushed to disk.
     */
    async forceSaveAsync(): Promise<void> {
        if (this.saveTimeout !== null) {
            window.clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        await this.save();
    }

    // ========================================================================
    // Event System
    // ========================================================================

    addEventListener(listener: FSListener): void {
        this.listeners.push(listener);
    }

    removeEventListener(listener: FSListener): void {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    private emit(event: FSEvent): void {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('[VirtualFS] Listener error:', error);
            }
        });
    }

    // ========================================================================
    // Path Utilities
    // ========================================================================

    private parsePath(path: string | string[]): string[] {
        if (Array.isArray(path)) {
            return path;
        }
        return path.split('/').filter(p => p.length > 0);
    }

    normalizePath(path: string | string[]): string {
        return this.parsePath(path).join('/');
    }

    navigate(path: string | string[]): FSItem | null {
        const parts = this.parsePath(path);

        // Empty path = root folder
        if (parts.length === 0) {
            return null; // Root is not an item, it's the container
        }

        // Start navigation from the root folder's children
        const rootFolder = this.root['/'];
        if (!rootFolder || rootFolder.type !== 'folder') {
            return null;
        }

        let current: Record<string, FSItem> = rootFolder.children;
        let lastItem: FSItem | null = null;

        for (const part of parts) {
            const item = current[part];
            if (!item) {
                return null;
            }

            lastItem = item;

            if (item.type === 'folder') {
                current = item.children;
            } else {
                // File - stop navigation
                return item;
            }
        }

        return lastItem;
    }

    // ========================================================================
    // Read Operations
    // ========================================================================

    exists(path: string | string[]): boolean {
        return this.navigate(path) !== null;
    }

    get(path: string | string[]): FSItem | null {
        return this.navigate(path);
    }

    getFolder(path: string | string[]): FolderItem | null {
        const item = this.navigate(path);
        return item?.type === 'folder' ? item : null;
    }

    getFile(path: string | string[]): FileItem | null {
        const item = this.navigate(path);
        return item?.type === 'file' ? item : null;
    }

    list(path: string | string[] = []): Record<string, FSItem> {
        const parts = this.parsePath(path);

        // Empty path = list root folder's children
        if (parts.length === 0) {
            const rootFolder = this.root['/'];
            return rootFolder?.children || {};
        }

        const folder = this.getFolder(path);
        return folder?.children || {};
    }

    readFile(path: string | string[]): string | null {
        const file = this.getFile(path);
        return file?.content || null;
    }

    // ========================================================================
    // Write Operations
    // ========================================================================

    createFile(path: string | string[], content = '', icon = '📝'): boolean {
        const parts = this.parsePath(path);

        if (parts.length === 0) {
            return false;
        }

        const fileName = parts[parts.length - 1]!;
        const parentPath = parts.slice(0, -1);

        const parent = parentPath.length > 0 ? this.getFolder(parentPath) : null;
        const container: Record<string, FSItem> = parent?.children || this.getRootContainer();

        if (container[fileName]) {
            console.warn('[VirtualFS] File already exists:', this.normalizePath(path));
            return false;
        }

        const now = new Date().toISOString();
        const file: FileItem = {
            type: 'file',
            icon,
            content,
            size: content.length,
            created: now,
            modified: now,
        };

        container[fileName] = file;

        if (parent) {
            parent.modified = now;
        }

        this.structureDirty = true;
        this.scheduleSave();
        this.emit({ type: 'create', path: this.normalizePath(path), item: file });

        return true;
    }

    createFolder(path: string | string[], icon = '📁'): boolean {
        const parts = this.parsePath(path);

        if (parts.length === 0) {
            return false;
        }

        const folderName = parts[parts.length - 1]!;
        const parentPath = parts.slice(0, -1);

        const parent = parentPath.length > 0 ? this.getFolder(parentPath) : null;
        const container: Record<string, FSItem> = parent?.children || this.getRootContainer();

        if (container[folderName]) {
            console.warn('[VirtualFS] Folder already exists:', this.normalizePath(path));
            return false;
        }

        const now = new Date().toISOString();
        const folder: FolderItem = {
            type: 'folder',
            icon,
            children: {},
            created: now,
            modified: now,
        };

        container[folderName] = folder;

        if (parent) {
            parent.modified = now;
        }

        this.structureDirty = true;
        this.scheduleSave();
        this.emit({ type: 'create', path: this.normalizePath(path), item: folder });

        return true;
    }

    writeFile(path: string | string[], content: string): boolean {
        const file = this.getFile(path);

        if (!file) {
            console.warn('[VirtualFS] File not found:', this.normalizePath(path));
            return false;
        }

        file.content = content;
        file.size = content.length;
        file.modified = new Date().toISOString();

        // mark for delta save
        this.dirtyPaths.add(this.normalizePath(path));
        this.scheduleSave();
        this.emit({ type: 'update', path: this.normalizePath(path), item: file });

        return true;
    }

    delete(path: string | string[]): boolean {
        const parts = this.parsePath(path);

        if (parts.length === 0) {
            return false;
        }

        const itemName = parts[parts.length - 1]!;
        const parentPath = parts.slice(0, -1);

        const parent = parentPath.length > 0 ? this.getFolder(parentPath) : null;
        const container: Record<string, FSItem> = parent?.children || this.getRootContainer();

        if (!container[itemName]) {
            console.warn('[VirtualFS] Item not found:', this.normalizePath(path));
            return false;
        }

        const item = container[itemName];
        delete container[itemName];

        if (parent) {
            parent.modified = new Date().toISOString();
        }

        this.structureDirty = true;
        // Clean delta records for this path (file or subtree)
        const norm = this.normalizePath(path);
        if (typeof this.storage.deleteDeltaForPrefix === 'function') {
            try {
                const prefix = item.type === 'folder' ? norm + '/' : norm;
                void this.storage.deleteDeltaForPrefix(prefix);
            } catch (e) {
                console.warn('[VirtualFS] deleteDeltaForPrefix failed:', e);
            }
        }
        this.structureDirty = true;
        this.scheduleSave();
        this.emit({ type: 'delete', path: norm, item });

        return true;
    }

    rename(oldPath: string | string[], newName: string): boolean {
        const parts = this.parsePath(oldPath);

        if (parts.length === 0) {
            return false;
        }

        const oldName = parts[parts.length - 1]!;
        const parentPath = parts.slice(0, -1);

        const parent = parentPath.length > 0 ? this.getFolder(parentPath) : null;
        const container: Record<string, FSItem> = parent?.children || this.getRootContainer();

        if (!container[oldName]) {
            console.warn('[VirtualFS] Item not found:', this.normalizePath(oldPath));
            return false;
        }

        if (container[newName]) {
            console.warn('[VirtualFS] Target name already exists:', newName);
            return false;
        }

        const item = container[oldName];
        container[newName] = item;
        delete container[oldName];

        if (parent) {
            parent.modified = new Date().toISOString();
        }

        item.modified = new Date().toISOString();

        const newPath = [...parentPath, newName].join('/');

        // Maintain delta records: rename prefix if supported; else delete old prefix
        const oldNorm = this.normalizePath(oldPath);
        const isFolder = item.type === 'folder';
        const oldPrefix = isFolder ? oldNorm + '/' : oldNorm;
        const newPrefix = isFolder ? newPath + '/' : newPath;
        if (typeof this.storage.renameDeltaPrefix === 'function') {
            try {
                void this.storage.renameDeltaPrefix(oldPrefix, newPrefix);
            } catch (e) {
                console.warn('[VirtualFS] renameDeltaPrefix failed:', e);
            }
        } else if (typeof this.storage.deleteDeltaForPrefix === 'function') {
            try {
                void this.storage.deleteDeltaForPrefix(oldPrefix);
            } catch (e) {
                console.warn('[VirtualFS] deleteDeltaForPrefix (fallback) failed:', e);
            }
        }

        this.structureDirty = true;
        this.scheduleSave();
        this.emit({
            type: 'rename',
            path: newPath,
            oldPath: oldNorm,
            item,
        });

        return true;
    }

    // ========================================================================
    // Stats & Utilities
    // ========================================================================

    getStats(): { totalFiles: number; totalFolders: number; totalSize: number } {
        let totalFiles = 0;
        let totalFolders = 0;
        let totalSize = 0;

        const traverse = (items: Record<string, FSItem>) => {
            for (const item of Object.values(items)) {
                if (item.type === 'file') {
                    totalFiles++;
                    totalSize += item.size;
                } else if (item.type === 'folder') {
                    totalFolders++;
                    traverse(item.children);
                }
            }
        };

        traverse(this.root['/'].children);

        return { totalFiles, totalFolders, totalSize };
    }

    reset(): void {
        this.root = this.createDefaultStructure();
        this.structureDirty = true;
        void this.save();
        console.log('[VirtualFS] Reset to defaults');
    }

    export(): FileSystemRoot {
        return JSON.parse(JSON.stringify(this.root));
    }

    import(data: FileSystemRoot): boolean {
        try {
            // Basic validation
            if (!data || typeof data !== 'object') {
                return false;
            }

            this.root = data;
            if (typeof this.storage.clearAllDeltas === 'function') {
                void this.storage
                    .clearAllDeltas()
                    .catch(e =>
                        console.warn('[VirtualFS] clearAllDeltas during import failed:', e)
                    );
            }
            this.structureDirty = true;
            void this.save();
            console.log('[VirtualFS] Imported successfully');

            return true;
        } catch (error) {
            console.error('[VirtualFS] Import failed:', error);
            return false;
        }
    }

    private selectStorageAdapter(): VfsStorageAdapter {
        // Prefer IndexedDB when available
        try {
            if (typeof indexedDB !== 'undefined') {
                return new IndexedDbAdapter();
            }
        } catch {
            // ignore
        }
        // Fallback to localStorage
        return new LocalStorageAdapter(this.STORAGE_KEY);
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const VirtualFS = new VirtualFileSystemManager();
export default VirtualFS;

// Expose globally for debugging
if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)['VirtualFS'] = VirtualFS as unknown as object;
}
