'use strict';
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
Object.defineProperty(exports, '__esModule', { value: true });
exports.VirtualFS = void 0;
const storage_utils_js_1 = require('./storage-utils.js');
// ============================================================================
// Virtual File System Manager
// ============================================================================
class VirtualFileSystemManager {
    constructor() {
        this.listeners = [];
        this.STORAGE_KEY = 'virtual-file-system';
        this.AUTO_SAVE_DELAY = 1000; // 1 second debounce
        this.saveTimeout = null;
        this.root = this.createDefaultStructure();
        this.load();
    }
    // ========================================================================
    // Initialization
    // ========================================================================
    createDefaultStructure() {
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
                                        icon: '�',
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
                                icon: '�',
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
                                icon: '�️',
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
    load() {
        try {
            const stored = (0, storage_utils_js_1.getJSON)(this.STORAGE_KEY, {});
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
    scheduleSave() {
        if (this.saveTimeout !== null) {
            window.clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = window.setTimeout(() => {
            this.save();
            this.saveTimeout = null;
        }, this.AUTO_SAVE_DELAY);
    }
    save() {
        try {
            (0, storage_utils_js_1.setJSON)(this.STORAGE_KEY, this.root);
            console.log('[VirtualFS] Saved to localStorage');
        } catch (error) {
            console.error('[VirtualFS] Failed to save:', error);
        }
    }
    forceSave() {
        if (this.saveTimeout !== null) {
            window.clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        this.save();
    }
    // ========================================================================
    // Event System
    // ========================================================================
    addEventListener(listener) {
        this.listeners.push(listener);
    }
    removeEventListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }
    emit(event) {
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
    parsePath(path) {
        if (Array.isArray(path)) {
            return path;
        }
        return path.split('/').filter(p => p.length > 0);
    }
    normalizePath(path) {
        return this.parsePath(path).join('/');
    }
    navigate(path) {
        const parts = this.parsePath(path);
        // Empty path = root folder
        if (parts.length === 0) {
            return null; // Root is not an item, it's the container
        }
        let current = this.root;
        let lastItem = null;
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
        // Return the last folder we successfully navigated to
        return lastItem;
    }
    // ========================================================================
    // Read Operations
    // ========================================================================
    exists(path) {
        return this.navigate(path) !== null;
    }
    get(path) {
        return this.navigate(path);
    }
    getFolder(path) {
        const item = this.navigate(path);
        return item?.type === 'folder' ? item : null;
    }
    getFile(path) {
        const item = this.navigate(path);
        return item?.type === 'file' ? item : null;
    }
    list(path = []) {
        const parts = this.parsePath(path);
        if (parts.length === 0) {
            return this.root;
        }
        const folder = this.getFolder(path);
        return folder?.children || {};
    }
    readFile(path) {
        const file = this.getFile(path);
        return file?.content || null;
    }
    // ========================================================================
    // Write Operations
    // ========================================================================
    createFile(path, content = '', icon = '📝') {
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
        const file = {
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
    createFolder(path, icon = '📁') {
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
        const folder = {
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
    writeFile(path, content) {
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
    delete(path) {
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
    rename(oldPath, newName) {
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
        const item = container[oldName]; // Checked above
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
    getStats() {
        let totalFiles = 0;
        let totalFolders = 0;
        let totalSize = 0;
        const traverse = items => {
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
    reset() {
        this.root = this.createDefaultStructure();
        this.save();
        console.log('[VirtualFS] Reset to defaults');
    }
    export() {
        return JSON.parse(JSON.stringify(this.root));
    }
    import(data) {
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
exports.VirtualFS = new VirtualFileSystemManager();
// Expose globally for debugging
if (typeof window !== 'undefined') {
    window.VirtualFS = exports.VirtualFS;
}
//# sourceMappingURL=virtual-fs.js.map
