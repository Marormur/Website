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

import { getJSON, setJSON } from './storage-utils.js';

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

    private getRootContainer(): Record<string, FSItem> {
        return this.root['/'].children;
    }

    constructor() {
        this.root = this.createDefaultStructure();
        this.load();
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

    load(): void {
        try {
            const stored = getJSON<FileSystemRoot | null>(this.STORAGE_KEY, null);

            if (stored && Object.keys(stored).length > 0) {
                this.root = stored;
                console.log('[VirtualFS] Loaded from localStorage');
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

    private save(): void {
        try {
            setJSON(this.STORAGE_KEY, this.root);
            console.log('[VirtualFS] Saved to localStorage');
        } catch (error) {
            console.error('[VirtualFS] Failed to save:', error);
        }
    }

    forceSave(): void {
        if (this.saveTimeout !== null) {
            window.clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        this.save();
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

        const fileName = parts[parts.length - 1];
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

        this.scheduleSave();
        this.emit({ type: 'create', path: this.normalizePath(path), item: file });

        return true;
    }

    createFolder(path: string | string[], icon = '📁'): boolean {
        const parts = this.parsePath(path);

        if (parts.length === 0) {
            return false;
        }

        const folderName = parts[parts.length - 1];
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

        this.scheduleSave();
        this.emit({ type: 'update', path: this.normalizePath(path), item: file });

        return true;
    }

    delete(path: string | string[]): boolean {
        const parts = this.parsePath(path);

        if (parts.length === 0) {
            return false;
        }

        const itemName = parts[parts.length - 1];
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

        this.scheduleSave();
        this.emit({ type: 'delete', path: this.normalizePath(path), item });

        return true;
    }

    rename(oldPath: string | string[], newName: string): boolean {
        const parts = this.parsePath(oldPath);

        if (parts.length === 0) {
            return false;
        }

        const oldName = parts[parts.length - 1];
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

        this.scheduleSave();
        this.emit({
            type: 'rename',
            path: newPath,
            oldPath: this.normalizePath(oldPath),
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

        traverse(this.root);

        return { totalFiles, totalFolders, totalSize };
    }

    reset(): void {
        this.root = this.createDefaultStructure();
        this.save();
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
            this.save();
            console.log('[VirtualFS] Imported successfully');

            return true;
        } catch (error) {
            console.error('[VirtualFS] Import failed:', error);
            return false;
        }
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const VirtualFS = new VirtualFileSystemManager();
export default VirtualFS;

// Expose globally for debugging
if (typeof window !== 'undefined') {
    (window as any).VirtualFS = VirtualFS;
}
