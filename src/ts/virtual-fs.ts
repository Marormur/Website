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
// Types
// ============================================================================

export interface VirtualFile {
    type: 'file';
    icon: string;
    content: string;
    size: number;
    modified: string;
    created: string;
}

export interface VirtualFolder {
    type: 'folder';
    icon: string;
    children: Record<string, VirtualFileSystemItem>;
    modified: string;
    created: string;
}

export type VirtualFileSystemItem = VirtualFile | VirtualFolder;

export interface FileSystemStats {
    totalFiles: number;
    totalFolders: number;
    totalSize: number;
}

export type FileSystemEventType = 
    | 'create'
    | 'update'
    | 'delete'
    | 'rename'
    | 'move';

export interface FileSystemEvent {
    type: FileSystemEventType;
    path: string;
    item?: VirtualFileSystemItem;
    oldPath?: string;
}

type FileSystemListener = (event: FileSystemEvent) => void;

// ============================================================================
// Virtual File System Manager
// ============================================================================

class VirtualFileSystemManager {
    private root: Record<string, VirtualFolder>;
    private listeners: FileSystemListener[] = [];
    private readonly STORAGE_KEY = 'virtual-file-system';
    private readonly AUTO_SAVE_DELAY = 1000; // 1 second debounce
    private saveTimeout: number | null = null;

    constructor() {
        this.root = this.createDefaultStructure();
        this.load();
    }

    // ========================================================================
    // Initialization
    // ========================================================================

    private createDefaultStructure(): Record<string, VirtualFolder> {
        const now = new Date().toISOString();
        
        return {
            Computer: {
                type: 'folder',
                icon: '💻',
                created: now,
                modified: now,
                children: {
                    Documents: {
                        type: 'folder',
                        icon: '📄',
                        created: now,
                        modified: now,
                        children: {
                            'README.md': {
                                type: 'file',
                                icon: '📝',
                                content: '# Welcome to Virtual File System\n\nThis is a persistent virtual file system.',
                                size: 72,
                                created: now,
                                modified: now,
                            },
                            'notes.txt': {
                                type: 'file',
                                icon: '📝',
                                content: 'Your notes here...',
                                size: 18,
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
                    Music: {
                        type: 'folder',
                        icon: '🎵',
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

    private load(): void {
        try {
            const stored = getJSON<Record<string, VirtualFolder>>(
                this.STORAGE_KEY,
                {} as Record<string, VirtualFolder>
            );
            if (stored && Object.keys(stored).length > 0) {
                this.root = stored;
                console.log('[VirtualFS] Loaded from localStorage');
            } else {
                console.log('[VirtualFS] No stored data, using defaults');
            }
        } catch (error) {
            console.error('[VirtualFS] Failed to load:', error);
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

    public forceSave(): void {
        if (this.saveTimeout !== null) {
            window.clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        this.save();
    }

    // ========================================================================
    // Event System
    // ========================================================================

    public addEventListener(listener: FileSystemListener): void {
        this.listeners.push(listener);
    }

    public removeEventListener(listener: FileSystemListener): void {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    private emit(event: FileSystemEvent): void {
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

    private normalizePath(path: string | string[]): string {
        return this.parsePath(path).join('/');
    }

    private navigate(path: string | string[]): VirtualFileSystemItem | null {
        const parts = this.parsePath(path);
        let current: Record<string, VirtualFileSystemItem> = this.root;

        for (const part of parts) {
            const item = current[part];
            if (!item) {
                return null;
            }
            if (item.type === 'folder') {
                current = item.children;
            } else {
                // Last part is a file
                return item;
            }
        }

        return null;
    }

    // ========================================================================
    // Read Operations
    // ========================================================================

    public exists(path: string | string[]): boolean {
        return this.navigate(path) !== null;
    }

    public get(path: string | string[]): VirtualFileSystemItem | null {
        return this.navigate(path);
    }

    public getFolder(path: string | string[]): VirtualFolder | null {
        const item = this.navigate(path);
        return item?.type === 'folder' ? item : null;
    }

    public getFile(path: string | string[]): VirtualFile | null {
        const item = this.navigate(path);
        return item?.type === 'file' ? item : null;
    }

    public list(path: string | string[] = []): Record<string, VirtualFileSystemItem> {
        const parts = this.parsePath(path);
        
        if (parts.length === 0) {
            return this.root;
        }

        const folder = this.getFolder(path);
        return folder?.children || {};
    }

    public readFile(path: string | string[]): string | null {
        const file = this.getFile(path);
        return file?.content || null;
    }

    // ========================================================================
    // Write Operations
    // ========================================================================

    public createFile(
        path: string | string[],
        content: string = '',
        icon: string = '📝'
    ): boolean {
        const parts = this.parsePath(path);
        if (parts.length === 0) {
            return false;
        }

        const fileName = parts[parts.length - 1];
        const parentPath = parts.slice(0, -1);
        const parent = parentPath.length > 0 ? this.getFolder(parentPath) : null;
        const container = parent?.children || this.root;

        if (container[fileName]) {
            console.warn('[VirtualFS] File already exists:', this.normalizePath(path));
            return false;
        }

        const now = new Date().toISOString();
        const file: VirtualFile = {
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

    public createFolder(path: string | string[], icon: string = '📁'): boolean {
        const parts = this.parsePath(path);
        if (parts.length === 0) {
            return false;
        }

        const folderName = parts[parts.length - 1];
        const parentPath = parts.slice(0, -1);
        const parent = parentPath.length > 0 ? this.getFolder(parentPath) : null;
        const container = parent?.children || this.root;

        if (container[folderName]) {
            console.warn('[VirtualFS] Folder already exists:', this.normalizePath(path));
            return false;
        }

        const now = new Date().toISOString();
        const folder: VirtualFolder = {
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

    public writeFile(path: string | string[], content: string): boolean {
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

    public delete(path: string | string[]): boolean {
        const parts = this.parsePath(path);
        if (parts.length === 0) {
            return false;
        }

        const itemName = parts[parts.length - 1];
        const parentPath = parts.slice(0, -1);
        const parent = parentPath.length > 0 ? this.getFolder(parentPath) : null;
        const container = parent?.children || this.root;

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

    public rename(oldPath: string | string[], newName: string): boolean {
        const parts = this.parsePath(oldPath);
        if (parts.length === 0) {
            return false;
        }

        const oldName = parts[parts.length - 1];
        const parentPath = parts.slice(0, -1);
        const parent = parentPath.length > 0 ? this.getFolder(parentPath) : null;
        const container = parent?.children || this.root;

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

        if (item.type === 'file' || item.type === 'folder') {
            item.modified = new Date().toISOString();
        }

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

    public getStats(): FileSystemStats {
        let totalFiles = 0;
        let totalFolders = 0;
        let totalSize = 0;

        const traverse = (items: Record<string, VirtualFileSystemItem>) => {
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

    public reset(): void {
        this.root = this.createDefaultStructure();
        this.save();
        console.log('[VirtualFS] Reset to defaults');
    }

    public export(): Record<string, VirtualFolder> {
        return JSON.parse(JSON.stringify(this.root));
    }

    public import(data: Record<string, VirtualFolder>): boolean {
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

// Expose globally for debugging
if (typeof window !== 'undefined') {
    (window as unknown as { VirtualFS: VirtualFileSystemManager }).VirtualFS = VirtualFS;
}
