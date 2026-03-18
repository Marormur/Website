/**
 * virtual-fs.ts
 * Central Virtual File System
 *
 * Provides a persistent, in-browser file system shared across all modules
 * (Finder, Terminal, TextEditor, etc.). Data is stored in IndexedDB with an
 * automatic fallback to localStorage.
 *
 * Features:
 * - CRUD operations (Create, Read, Update, Delete)
 * - IndexedDB persistence (delta-save optimisation for frequent writes)
 * - Path-based navigation (Unix-style: `'/home/marvin/file.txt'` or string arrays)
 * - File metadata (size, icon, created/modified timestamps)
 * - Event system for real-time change notifications
 *
 * @module virtual-fs
 *
 * @example
 * ```typescript
 * import { VirtualFS } from '@/services/virtual-fs';
 *
 * VirtualFS.createFolder('/projects');
 * VirtualFS.createFile('/projects/hello.txt', 'Hello World');
 * console.log(VirtualFS.readFile('/projects/hello.txt')); // "Hello World"
 *
 * VirtualFS.addEventListener(event => {
 *     console.log(event.type, event.path); // e.g. "create /projects/hello.txt"
 * });
 * ```
 */

import { getJSON, setJSON, remove } from './storage-utils.js';
import logger from '../core/logger.js';

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
                    logger.warn('STORAGE', '[VirtualFS][IDB] open blocked');
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
            logger.warn('STORAGE', '[VirtualFS][IDB] load failed:', err);
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
            logger.warn('STORAGE', '[VirtualFS][IDB] save failed:', err);
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
            logger.warn('STORAGE', '[VirtualFS][IDB] clear failed:', err);
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
                    logger.warn('STORAGE', '[VirtualFS][IDB] delta put failed for', u.path, e);
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
    /** Optional: relative URL to a real static asset (e.g. './img/profil.jpg').
     *  If set, the Finder opens this URL directly instead of using content. */
    srcUrl?: string;
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

/**
 * Manages a Unix-style virtual file system stored in the browser (IndexedDB / localStorage).
 *
 * Exposes read, write, delete, rename operations and an event system. The singleton
 * instance is exported as {@link VirtualFS}.
 *
 * Paths can be provided as Unix strings (`'/home/marvin/file.txt'`) or as pre-split
 * string arrays (`['home', 'marvin', 'file.txt']`).
 *
 * @example
 * ```typescript
 * VirtualFS.createFolder('/projects');
 * VirtualFS.createFile('/projects/notes.md', '# Notes');
 * const content = VirtualFS.readFile('/projects/notes.md');
 * ```
 */
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
                                            '# Welcome to your home directory\n\nThis is your personal space in the virtual file system.\n\n## Structure\n- Documents: Store your text files and documents\n- Downloads: Temporary download location\n- Pictures: Image files\n',
                                        size: 200,
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
                                        children: {
                                            'profil.jpg': {
                                                type: 'file',
                                                icon: '🖼️',
                                                content: '',
                                                srcUrl: './img/profil.jpg',
                                                size: 0,
                                                created: now,
                                                modified: now,
                                            },
                                            'wallpaper.png': {
                                                type: 'file',
                                                icon: '🖼️',
                                                content: '',
                                                srcUrl: './img/wallpaper.png',
                                                size: 0,
                                                created: now,
                                                modified: now,
                                            },
                                            'App-Icons': {
                                                type: 'folder',
                                                icon: '📁',
                                                created: now,
                                                modified: now,
                                                children: {
                                                    'imageviewer.png': {
                                                        type: 'file',
                                                        icon: '🖼️',
                                                        content: '',
                                                        srcUrl: './img/imageviewer.png',
                                                        size: 0,
                                                        created: now,
                                                        modified: now,
                                                    },
                                                    'launchpad.png': {
                                                        type: 'file',
                                                        icon: '🖼️',
                                                        content: '',
                                                        srcUrl: './img/launchpad.png',
                                                        size: 0,
                                                        created: now,
                                                        modified: now,
                                                    },
                                                    'notepad.png': {
                                                        type: 'file',
                                                        icon: '🖼️',
                                                        content: '',
                                                        srcUrl: './img/notepad.png',
                                                        size: 0,
                                                        created: now,
                                                        modified: now,
                                                    },
                                                    'settings.png': {
                                                        type: 'file',
                                                        icon: '🖼️',
                                                        content: '',
                                                        srcUrl: './img/settings.png',
                                                        size: 0,
                                                        created: now,
                                                        modified: now,
                                                    },
                                                    'terminal.png': {
                                                        type: 'file',
                                                        icon: '🖼️',
                                                        content: '',
                                                        srcUrl: './img/terminal.png',
                                                        size: 0,
                                                        created: now,
                                                        modified: now,
                                                    },
                                                },
                                            },
                                        },
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

    /**
     * PURPOSE: Idempotent migration for stored VFS structures from older versions.
     * WHY: Users with an existing IndexedDB snapshot won't see newly added default
     *      files (e.g. Pictures assets). This method patches their live root in-memory
     *      so the Finder shows the images on first open without losing other changes.
     * INVARIANT: Only adds missing entries; never overwrites existing ones.
     */
    private migrateStoredStructure(): void {
        const now = new Date().toISOString();
        try {
            const marvin = this.getFolder('/home/marvin') as
                | (FolderItem & { children: Record<string, FSItem> })
                | null;
            if (!marvin) return;

            // Ensure Pictures folder exists
            if (!marvin.children['Pictures']) {
                marvin.children['Pictures'] = {
                    type: 'folder',
                    icon: '🖼️',
                    created: now,
                    modified: now,
                    children: {},
                };
            }
            const pictures = marvin.children['Pictures'] as FolderItem & {
                children: Record<string, FSItem>;
            };

            const defaultImages: Record<string, FileItem> = {
                'profil.jpg': {
                    type: 'file',
                    icon: '🖼️',
                    content: '',
                    srcUrl: './img/profil.jpg',
                    size: 0,
                    created: now,
                    modified: now,
                },
                'wallpaper.png': {
                    type: 'file',
                    icon: '🖼️',
                    content: '',
                    srcUrl: './img/wallpaper.png',
                    size: 0,
                    created: now,
                    modified: now,
                },
            };
            for (const [name, entry] of Object.entries(defaultImages)) {
                if (!pictures.children[name]) pictures.children[name] = entry;
            }

            // Ensure App-Icons subfolder
            if (!pictures.children['App-Icons']) {
                pictures.children['App-Icons'] = {
                    type: 'folder',
                    icon: '📁',
                    created: now,
                    modified: now,
                    children: {},
                };
            }
            const appIcons = pictures.children['App-Icons'] as FolderItem & {
                children: Record<string, FSItem>;
            };
            const defaultIcons: Record<string, FileItem> = {
                'imageviewer.png': {
                    type: 'file',
                    icon: '🖼️',
                    content: '',
                    srcUrl: './img/imageviewer.png',
                    size: 0,
                    created: now,
                    modified: now,
                },
                'launchpad.png': {
                    type: 'file',
                    icon: '🖼️',
                    content: '',
                    srcUrl: './img/launchpad.png',
                    size: 0,
                    created: now,
                    modified: now,
                },
                'notepad.png': {
                    type: 'file',
                    icon: '🖼️',
                    content: '',
                    srcUrl: './img/notepad.png',
                    size: 0,
                    created: now,
                    modified: now,
                },
                'settings.png': {
                    type: 'file',
                    icon: '🖼️',
                    content: '',
                    srcUrl: './img/settings.png',
                    size: 0,
                    created: now,
                    modified: now,
                },
                'terminal.png': {
                    type: 'file',
                    icon: '🖼️',
                    content: '',
                    srcUrl: './img/terminal.png',
                    size: 0,
                    created: now,
                    modified: now,
                },
            };
            for (const [name, entry] of Object.entries(defaultIcons)) {
                if (!appIcons.children[name]) appIcons.children[name] = entry;
            }

            this.structureDirty = true;
            this.scheduleSave();
            logger.debug('STORAGE', '[VirtualFS] migrateStoredStructure: Pictures assets applied');
        } catch (e) {
            logger.warn('STORAGE', '[VirtualFS] migrateStoredStructure failed:', e);
        }
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
                    logger.debug('STORAGE', '[VirtualFS] Migrating localStorage -> IndexedDB');
                    stored = lsData;
                    try {
                        await this.storage.save(lsData);
                        setJSON(this.MIGRATION_FLAG, '1');
                        // Optional: clear legacy to free space
                        remove(this.STORAGE_KEY);
                    } catch (err) {
                        logger.warn('STORAGE', '[VirtualFS] Migration save failed:', err);
                    }
                }
            }

            if (stored && Object.keys(stored).length > 0) {
                // Overlay delta file contents if supported
                if (typeof this.storage.overlayFilesOnLoad === 'function') {
                    try {
                        await this.storage.overlayFilesOnLoad(stored);
                    } catch (e) {
                        logger.warn('STORAGE', '[VirtualFS] overlayFilesOnLoad failed:', e);
                    }
                }
                this.root = stored;
                this.migrateStoredStructure();
                logger.debug('STORAGE', `[VirtualFS] Loaded from ${adapterName}`);
            } else {
                // Use default structure if no valid data in storage
                this.root = this.createDefaultStructure();
                logger.debug('STORAGE', '[VirtualFS] No stored data, initialized with defaults');
            }
        } catch (error) {
            logger.error('STORAGE', '[VirtualFS] Failed to load:', error);
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
                logger.debug(
                    'STORAGE',
                    `[VirtualFS] Delta-saved ${updates.length} file(s) to ${adapterName}`
                );
            } else {
                perf?.mark(`vfs:save:${adapterName}:start`);
                await this.storage.save(this.root);
                perf?.mark(`vfs:save:${adapterName}:end`);
                perf?.measure(
                    `vfs:${adapterName}:save-duration`,
                    `vfs:save:${adapterName}:start`,
                    `vfs:save:${adapterName}:end`
                );
                logger.debug('STORAGE', `[VirtualFS] Saved to ${adapterName}`);

                // After a successful full save, clear all delta entries (hygiene)
                if (typeof this.storage.clearAllDeltas === 'function') {
                    try {
                        await this.storage.clearAllDeltas();
                    } catch (err) {
                        logger.warn('STORAGE', '[VirtualFS] clearAllDeltas failed:', err);
                    }
                }
            }
        } catch (error) {
            logger.error('STORAGE', '[VirtualFS] Failed to save:', error);
        }

        perf?.mark('vfs:save:end');
        perf?.measure('vfs:save-duration', 'vfs:save:start', 'vfs:save:end');
        // Reset dirty markers
        this.dirtyPaths.clear();
        this.structureDirty = false;
    }

    /**
     * Immediately flush any pending debounced saves to storage.
     *
     * Prefer {@link forceSaveAsync} when you need to await completion.
     */
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
     *
     * @returns Promise that resolves once the save is complete.
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

    /**
     * Subscribe to filesystem change events (create, update, delete, rename).
     *
     * @param listener - Callback invoked on each filesystem change.
     *
     * @example
     * ```typescript
     * VirtualFS.addEventListener(event => {
     *     console.log(`[VFS] ${event.type}: ${event.path}`);
     * });
     * ```
     */
    addEventListener(listener: FSListener): void {
        this.listeners.push(listener);
    }

    /**
     * Unsubscribe a previously registered change listener.
     *
     * @param listener - The exact listener reference passed to {@link addEventListener}.
     */
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
                logger.error('STORAGE', '[VirtualFS] Listener error:', error);
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

    /**
     * Normalize a path to a canonical slash-joined string.
     *
     * @param path - Unix path string or pre-split array of segments.
     * @returns Normalized path string, e.g. `'home/marvin/file.txt'` (no leading slash).
     */
    normalizePath(path: string | string[]): string {
        return this.parsePath(path).join('/');
    }

    /**
     * Navigate the virtual file-system tree and return the item at `path`.
     *
     * @param path - Unix path string or array of path segments.
     * @returns The `FSItem` (file or folder) at the path, or `null` if not found.
     */
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

    /**
     * Check whether a file or folder exists at `path`.
     *
     * @param path - Target path (string or array).
     * @returns `true` if the item exists, `false` otherwise.
     *
     * @example
     * ```typescript
     * if (!VirtualFS.exists('/projects')) {
     *     VirtualFS.createFolder('/projects');
     * }
     * ```
     */
    exists(path: string | string[]): boolean {
        return this.navigate(path) !== null;
    }

    /**
     * Return the raw `FSItem` (file or folder) at `path`, or `null` if not found.
     *
     * @param path - Target path.
     * @returns The item, or `null`.
     */
    get(path: string | string[]): FSItem | null {
        return this.navigate(path);
    }

    /**
     * Return the folder at `path`, or `null` if the path does not point to a folder.
     *
     * @param path - Target path.
     * @returns `FolderItem` or `null`.
     */
    getFolder(path: string | string[]): FolderItem | null {
        const item = this.navigate(path);
        return item?.type === 'folder' ? item : null;
    }

    /**
     * Return the file at `path`, or `null` if the path does not point to a file.
     *
     * @param path - Target path.
     * @returns `FileItem` or `null`.
     */
    getFile(path: string | string[]): FileItem | null {
        const item = this.navigate(path);
        return item?.type === 'file' ? item : null;
    }

    /**
     * List the direct children of a directory.
     *
     * @param path - Target directory path. Defaults to root (`'/'`).
     * @returns A record mapping child names to their `FSItem`s, or `{}` if not a directory.
     *
     * @example
     * ```typescript
     * const entries = VirtualFS.list('/home/marvin');
     * console.log(Object.keys(entries)); // ["Documents", "welcome.txt"]
     * ```
     */
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

    /**
     * Read the text content of a file.
     *
     * @param path - Path to an existing file.
     * @returns File content string, or `null` if the file does not exist or has empty content.
     *
     * @example
     * ```typescript
     * const content = VirtualFS.readFile('/home/marvin/welcome.txt');
     * if (content !== null) console.log(content);
     * ```
     */
    readFile(path: string | string[]): string | null {
        const file = this.getFile(path);
        return file?.content || null;
    }

    // ========================================================================
    // Write Operations
    // ========================================================================

    /**
     * Create a new file at `path` with optional initial content.
     *
     * Fails silently (returns `false`) if the path already exists.
     *
     * @param path - Absolute path for the new file.
     * @param content - Initial file content. Defaults to `''`.
     * @param icon - Emoji icon for the file. Defaults to `'📝'`.
     * @returns `true` on success, `false` if the path already exists or the path is invalid.
     *
     * @example
     * ```typescript
     * VirtualFS.createFile('/projects/notes.md', '# Notes', '📄');
     * ```
     */
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
            logger.warn('STORAGE', '[VirtualFS] File already exists:', this.normalizePath(path));
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

    /**
     * Create a new directory at `path`.
     *
     * Fails silently (returns `false`) if the path already exists.
     *
     * @param path - Absolute path for the new directory.
     * @param icon - Emoji icon for the folder. Defaults to `'📁'`.
     * @returns `true` on success, `false` if the path already exists or is invalid.
     *
     * @example
     * ```typescript
     * VirtualFS.createFolder('/projects/my-app');
     * ```
     */
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
            logger.warn('STORAGE', '[VirtualFS] Folder already exists:', this.normalizePath(path));
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

    /**
     * Overwrite the content of an existing file.
     *
     * The file must already exist (use {@link createFile} to create it first).
     *
     * @param path - Path to an existing file.
     * @param content - New content to write.
     * @returns `true` on success, `false` if the file does not exist.
     *
     * @example
     * ```typescript
     * VirtualFS.writeFile('/projects/notes.md', '# Updated Notes');
     * ```
     */
    writeFile(path: string | string[], content: string): boolean {
        const file = this.getFile(path);

        if (!file) {
            logger.warn('STORAGE', '[VirtualFS] File not found:', this.normalizePath(path));
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

    /**
     * Delete a file or folder (and all its contents) at `path`.
     *
     * @param path - Path to the item to remove.
     * @returns `true` on success, `false` if the item does not exist or the path is invalid.
     *
     * @example
     * ```typescript
     * VirtualFS.delete('/projects/old-notes.md');
     * VirtualFS.delete('/projects/archive'); // removes directory recursively
     * ```
     */
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
            logger.warn('STORAGE', '[VirtualFS] Item not found:', this.normalizePath(path));
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
                logger.warn('STORAGE', '[VirtualFS] deleteDeltaForPrefix failed:', e);
            }
        }
        this.structureDirty = true;
        this.scheduleSave();
        this.emit({ type: 'delete', path: norm, item });

        return true;
    }

    /**
     * Rename a file or folder in-place (same directory, new name only).
     *
     * To move an item to a different directory, use the Terminal `mv` command.
     *
     * @param oldPath - Current path of the item.
     * @param newName - New name (not a full path – just the basename).
     * @returns `true` on success, `false` if `oldPath` does not exist or `newName` is taken.
     *
     * @example
     * ```typescript
     * VirtualFS.rename('/projects/old-name.md', 'new-name.md');
     * ```
     */
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
            logger.warn('STORAGE', '[VirtualFS] Item not found:', this.normalizePath(oldPath));
            return false;
        }

        if (container[newName]) {
            logger.warn('STORAGE', '[VirtualFS] Target name already exists:', newName);
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
                logger.warn('STORAGE', '[VirtualFS] renameDeltaPrefix failed:', e);
            }
        } else if (typeof this.storage.deleteDeltaForPrefix === 'function') {
            try {
                void this.storage.deleteDeltaForPrefix(oldPrefix);
            } catch (e) {
                logger.warn('STORAGE', '[VirtualFS] deleteDeltaForPrefix (fallback) failed:', e);
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

    /**
     * Return aggregate statistics for the entire virtual filesystem.
     *
     * @returns An object with `totalFiles`, `totalFolders`, and `totalSize` (bytes).
     *
     * @example
     * ```typescript
     * const { totalFiles, totalSize } = VirtualFS.getStats();
     * console.log(`${totalFiles} files, ${totalSize} bytes`);
     * ```
     */
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

    /**
     * Reset the filesystem to its default structure, clearing all user data.
     *
     * @remarks **Warning:** This is destructive and cannot be undone.
     */
    reset(): void {
        this.root = this.createDefaultStructure();
        this.structureDirty = true;
        void this.save();
        logger.debug('STORAGE', '[VirtualFS] Reset to defaults');
    }

    /**
     * PURPOSE: Clears all persisted filesystem data for a true first-visit reset.
     * WHY: Test runs need a deterministic baseline without stale IndexedDB/localStorage data.
     * OUTPUT: In-memory state is reset to defaults and persisted VFS storage is removed.
     */
    async hardReset(): Promise<void> {
        if (this.saveTimeout !== null) {
            window.clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        this.dirtyPaths.clear();
        this.structureDirty = false;
        this.root = this.createDefaultStructure();

        if (typeof this.storage.clear === 'function') {
            await this.storage.clear();
        }

        logger.debug('STORAGE', '[VirtualFS] Hard reset cleared persisted state');
    }

    /**
     * Export a deep copy of the current filesystem state as a plain object.
     *
     * The returned object can be serialized to JSON and later restored via {@link import}.
     *
     * @returns Deep-cloned `FileSystemRoot` snapshot.
     */
    export(): FileSystemRoot {
        return JSON.parse(JSON.stringify(this.root));
    }

    /**
     * Replace the current filesystem with a previously exported snapshot.
     *
     * @param data - A `FileSystemRoot` object (e.g. from {@link export}).
     * @returns `true` on success, `false` if `data` is invalid.
     *
     * @example
     * ```typescript
     * const backup = VirtualFS.export();
     * // ... later ...
     * VirtualFS.import(backup);
     * ```
     */
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
                        logger.warn(
                            'STORAGE',
                            '[VirtualFS] clearAllDeltas during import failed:',
                            e
                        )
                    );
            }
            this.structureDirty = true;
            void this.save();
            logger.debug('STORAGE', '[VirtualFS] Imported successfully');

            return true;
        } catch (error) {
            logger.error('STORAGE', '[VirtualFS] Import failed:', error);
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
