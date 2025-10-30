# Virtual File System - Usage Guide

## Übersicht

Das zentrale Virtual File System (`virtual-fs.ts`) bietet ein persistentes, in-memory Dateisystem, das von mehreren Modulen gemeinsam genutzt werden kann.

## Features

- ✅ **CRUD Operations** - Create, Read, Update, Delete für Dateien und Ordner
- ✅ **LocalStorage Persistenz** - Automatisches Speichern mit Debouncing
- ✅ **Event System** - Change-Notifications für alle Operationen
- ✅ **Path-based Navigation** - String oder Array-Pfade
- ✅ **Metadata** - Size, Created, Modified Timestamps
- ✅ **Export/Import** - Backup und Restore des gesamten FS

## Basic Usage

### Import

```typescript
import { VirtualFS } from './virtual-fs.js';
```

### Read Operations

```typescript
// Check if file/folder exists
const exists = VirtualFS.exists('Computer/Documents/README.md');

// Get file content
const content = VirtualFS.readFile('Computer/Documents/README.md');

// List directory
const items = VirtualFS.list('Computer/Documents');
// Returns: { 'README.md': {...}, 'notes.txt': {...} }

// Get file metadata
const file = VirtualFS.getFile('Computer/Documents/README.md');
console.log(file?.size, file?.modified);
```

### Write Operations

```typescript
// Create file
VirtualFS.createFile('Computer/Documents/todo.txt', 'My tasks...', '✅');

// Create folder
VirtualFS.createFolder('Computer/Documents/Projects', '📁');

// Update file content
VirtualFS.writeFile('Computer/Documents/todo.txt', 'Updated tasks');

// Rename file/folder
VirtualFS.rename('Computer/Documents/todo.txt', 'tasks.txt');

// Delete file/folder
VirtualFS.delete('Computer/Documents/tasks.txt');
```

### Event Listening

```typescript
// Listen to all file system changes
VirtualFS.addEventListener((event) => {
    console.log(`FS Event: ${event.type} at ${event.path}`);
    
    if (event.type === 'create') {
        console.log('New item:', event.item);
    }
    
    if (event.type === 'rename') {
        console.log('Renamed from:', event.oldPath);
    }
});
```

## Integration Examples

### Finder Integration

```typescript
// In finder.ts or finder-view.ts

import { VirtualFS } from './virtual-fs.js';

class FinderView {
    constructor() {
        // Listen to FS changes to update UI
        VirtualFS.addEventListener((event) => {
            if (event.path.startsWith(this.currentPath)) {
                this.refreshView();
            }
        });
    }

    navigateTo(path: string) {
        const items = VirtualFS.list(path);
        this.renderItems(items);
    }

    createNewFile() {
        const fileName = prompt('File name:');
        if (fileName) {
            VirtualFS.createFile(
                `${this.currentPath}/${fileName}`,
                '',
                '📝'
            );
        }
    }

    openFile(fileName: string) {
        const content = VirtualFS.readFile(`${this.currentPath}/${fileName}`);
        // Open in TextEditor...
    }
}
```

### Terminal Integration

```typescript
// In terminal.ts or terminal-commands.ts

import { VirtualFS } from './virtual-fs.js';

class TerminalCommands {
    private cwd: string = 'Computer';

    // ls - List directory
    ls(args: string[]) {
        const path = args[0] || this.cwd;
        const items = VirtualFS.list(path);
        
        return Object.entries(items)
            .map(([name, item]) => {
                const icon = item.icon;
                const type = item.type === 'folder' ? 'DIR' : 'FILE';
                const size = item.type === 'file' ? item.size : '-';
                return `${icon} ${name.padEnd(20)} ${type.padEnd(6)} ${size}`;
            })
            .join('\n');
    }

    // cd - Change directory
    cd(args: string[]) {
        const path = args[0];
        if (!path) {
            this.cwd = 'Computer';
            return '';
        }

        const newPath = this.resolvePath(path);
        if (VirtualFS.exists(newPath) && VirtualFS.getFolder(newPath)) {
            this.cwd = newPath;
            return '';
        }
        
        return `cd: ${path}: No such directory`;
    }

    // cat - Read file
    cat(args: string[]) {
        if (!args[0]) {
            return 'cat: missing file operand';
        }

        const path = this.resolvePath(args[0]);
        const content = VirtualFS.readFile(path);
        
        if (content === null) {
            return `cat: ${args[0]}: No such file`;
        }
        
        return content;
    }

    // touch - Create file
    touch(args: string[]) {
        if (!args[0]) {
            return 'touch: missing file operand';
        }

        const path = this.resolvePath(args[0]);
        const success = VirtualFS.createFile(path, '', '📝');
        
        return success ? '' : `touch: cannot create file '${args[0]}'`;
    }

    // mkdir - Create directory
    mkdir(args: string[]) {
        if (!args[0]) {
            return 'mkdir: missing operand';
        }

        const path = this.resolvePath(args[0]);
        const success = VirtualFS.createFolder(path, '📁');
        
        return success ? '' : `mkdir: cannot create directory '${args[0]}'`;
    }

    // rm - Remove file/directory
    rm(args: string[]) {
        if (!args[0]) {
            return 'rm: missing operand';
        }

        const path = this.resolvePath(args[0]);
        const success = VirtualFS.delete(path);
        
        return success ? '' : `rm: cannot remove '${args[0]}'`;
    }

    // Helper: Resolve relative paths
    private resolvePath(path: string): string {
        if (path.startsWith('/') || path.startsWith('Computer')) {
            return path;
        }
        
        if (path === '..') {
            const parts = this.cwd.split('/');
            return parts.slice(0, -1).join('/') || 'Computer';
        }
        
        if (path === '.') {
            return this.cwd;
        }
        
        return `${this.cwd}/${path}`;
    }
}
```

### TextEditor Integration

```typescript
// In text-editor.ts

import { VirtualFS } from './virtual-fs.js';

class TextEditor {
    private currentFile: string | null = null;

    openFile(path: string) {
        const content = VirtualFS.readFile(path);
        
        if (content === null) {
            this.showError(`File not found: ${path}`);
            return;
        }

        this.currentFile = path;
        this.setContent(content);
    }

    saveFile() {
        if (!this.currentFile) {
            this.saveAs();
            return;
        }

        const content = this.getContent();
        VirtualFS.writeFile(this.currentFile, content);
        this.showSuccess('File saved');
    }

    saveAs() {
        const path = prompt('Save as:');
        if (!path) return;

        const content = this.getContent();
        const success = VirtualFS.createFile(path, content, '📝');
        
        if (success) {
            this.currentFile = path;
            this.showSuccess('File saved');
        } else {
            this.showError('Failed to save file');
        }
    }
}
```

## API Reference

### Read Operations

| Method | Description | Example |
|--------|-------------|---------|
| `exists(path)` | Check if item exists | `VirtualFS.exists('Computer/Documents')` |
| `get(path)` | Get file or folder | `VirtualFS.get('Computer/Documents/README.md')` |
| `getFile(path)` | Get file (null if folder) | `VirtualFS.getFile('Computer/Documents/README.md')` |
| `getFolder(path)` | Get folder (null if file) | `VirtualFS.getFolder('Computer/Documents')` |
| `list(path)` | List directory contents | `VirtualFS.list('Computer/Documents')` |
| `readFile(path)` | Read file content | `VirtualFS.readFile('Computer/Documents/README.md')` |

### Write Operations

| Method | Description | Example |
|--------|-------------|---------|
| `createFile(path, content, icon)` | Create new file | `VirtualFS.createFile('path', 'content', '📝')` |
| `createFolder(path, icon)` | Create new folder | `VirtualFS.createFolder('path', '📁')` |
| `writeFile(path, content)` | Update file content | `VirtualFS.writeFile('path', 'new content')` |
| `rename(oldPath, newName)` | Rename file/folder | `VirtualFS.rename('old', 'new')` |
| `delete(path)` | Delete file/folder | `VirtualFS.delete('path')` |

### Utilities

| Method | Description | Example |
|--------|-------------|---------|
| `getStats()` | Get FS statistics | `VirtualFS.getStats()` |
| `export()` | Export entire FS | `const backup = VirtualFS.export()` |
| `import(data)` | Import FS from backup | `VirtualFS.import(backup)` |
| `reset()` | Reset to defaults | `VirtualFS.reset()` |
| `forceSave()` | Force immediate save | `VirtualFS.forceSave()` |

### Event System

```typescript
type FileSystemEventType = 'create' | 'update' | 'delete' | 'rename' | 'move';

interface FileSystemEvent {
    type: FileSystemEventType;
    path: string;
    item?: VirtualFileSystemItem;
    oldPath?: string;
}

VirtualFS.addEventListener((event: FileSystemEvent) => {
    // Handle event
});
```

## Migration from Old Finder Code

### Before (Finder-internal FS)

```typescript
// In finder.ts
const virtualFileSystem = {
    Computer: { ... }
};

function navigateTo(path) {
    let current = virtualFileSystem;
    for (const part of path) {
        current = current[part].children;
    }
    return current;
}
```

### After (Central VirtualFS)

```typescript
// In finder-view.ts
import { VirtualFS } from './virtual-fs.js';

function navigateTo(path: string) {
    const items = VirtualFS.list(path);
    return items;
}
```

## Best Practices

1. **Use path strings** - Easier to read than arrays: `'Computer/Documents'` vs `['Computer', 'Documents']`
2. **Check existence** - Always check `exists()` before operations
3. **Listen to events** - Update UI when FS changes from other modules
4. **Debounce saves** - VirtualFS auto-saves, but you can `forceSave()` before critical operations
5. **Handle errors** - Operations return `boolean` or `null` on failure

## Performance

- **In-Memory**: All operations are instant (no async)
- **Auto-Save**: Debounced 1 second after last change
- **LocalStorage**: ~5MB limit (enough for thousands of small files)

## Future Enhancements

- [ ] File permissions & ownership
- [ ] Symbolic links
- [ ] File compression for large content
- [ ] IndexedDB backend for >5MB storage
- [ ] File watching API
- [ ] Undo/Redo operations

---

**Created**: 31. Oktober 2025  
**Version**: 1.0
