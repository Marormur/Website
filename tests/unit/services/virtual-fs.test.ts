/**
 * tests/unit/services/virtual-fs.test.ts
 *
 * Unit tests for the VirtualFileSystem service.
 *
 * Tests the core CRUD operations in isolation using jsdom's localStorage mock.
 * Each test starts with a clean, default filesystem structure.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Setup: mock window.setTimeout / clearTimeout so scheduleSave() doesn't
//     fire real async saves during tests.
beforeAll(() => {
    vi.useFakeTimers();
});

afterAll(() => {
    vi.useRealTimers();
});

// Import the singleton after fake timers are installed so the constructor's
// `void this.load()` uses the mocked timer environment.
const { VirtualFS } = await import('../../../src/ts/services/virtual-fs.ts');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Reset the FS and localStorage before each test for full isolation. */
beforeEach(() => {
    localStorage.clear();
    VirtualFS.reset();
    // Flush any pending fake timers from reset() -> save()
    vi.clearAllTimers();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('VirtualFS – normalizePath', () => {
    it('converts an array of segments to a slash-joined path', () => {
        expect(VirtualFS.normalizePath(['home', 'marvin', 'docs'])).toBe('home/marvin/docs');
    });

    it('converts a string path (strips leading slash)', () => {
        expect(VirtualFS.normalizePath('home/marvin')).toBe('home/marvin');
    });

    it('returns empty string for an empty path', () => {
        expect(VirtualFS.normalizePath([])).toBe('');
    });
});

// ─── exists / navigate ───────────────────────────────────────────────────────

describe('VirtualFS – exists', () => {
    it('returns true for a path that exists in the default structure', () => {
        expect(VirtualFS.exists('home/marvin')).toBe(true);
    });

    it('returns false for a path that does not exist', () => {
        expect(VirtualFS.exists('home/nobody')).toBe(false);
    });

    it('returns true for a known default file', () => {
        expect(VirtualFS.exists('home/marvin/welcome.txt')).toBe(true);
    });
});

// ─── list ────────────────────────────────────────────────────────────────────

describe('VirtualFS – list', () => {
    it('lists children of the root container when called with empty path', () => {
        const items = VirtualFS.list([]);
        expect(Object.keys(items)).toContain('home');
        expect(Object.keys(items)).toContain('etc');
        expect(Object.keys(items)).toContain('tmp');
    });

    it('lists children of a nested folder', () => {
        const items = VirtualFS.list('home/marvin');
        expect(Object.keys(items)).toContain('Documents');
        expect(Object.keys(items)).toContain('welcome.txt');
    });

    it('returns an empty object for a non-existent path', () => {
        const items = VirtualFS.list('no/such/path');
        expect(items).toEqual({});
    });
});

// ─── readFile ────────────────────────────────────────────────────────────────

describe('VirtualFS – readFile', () => {
    it('reads content of an existing file', () => {
        const content = VirtualFS.readFile('home/marvin/welcome.txt');
        expect(typeof content).toBe('string');
        expect(content).toContain('Welcome');
    });

    it('returns null for a non-existent file', () => {
        expect(VirtualFS.readFile('home/marvin/ghost.txt')).toBeNull();
    });

    it('returns null when the path points to a folder', () => {
        expect(VirtualFS.readFile('home/marvin')).toBeNull();
    });
});

// ─── createFile ──────────────────────────────────────────────────────────────

describe('VirtualFS – createFile', () => {
    it('creates a file at a valid path and returns true', () => {
        const result = VirtualFS.createFile('tmp/test.txt', 'hello');
        expect(result).toBe(true);
        expect(VirtualFS.exists('tmp/test.txt')).toBe(true);
    });

    it('stores the given content', () => {
        VirtualFS.createFile('tmp/hello.txt', 'world');
        expect(VirtualFS.readFile('tmp/hello.txt')).toBe('world');
    });

    it('returns false when the file already exists (no overwrite)', () => {
        VirtualFS.createFile('tmp/dup.txt', 'first');
        const second = VirtualFS.createFile('tmp/dup.txt', 'second');
        expect(second).toBe(false);
        // Original content must be preserved
        expect(VirtualFS.readFile('tmp/dup.txt')).toBe('first');
    });

    it('returns false for an empty path', () => {
        expect(VirtualFS.createFile([], 'content')).toBe(false);
    });
});

// ─── createFolder ────────────────────────────────────────────────────────────

describe('VirtualFS – createFolder', () => {
    it('creates a folder at a valid path and returns true', () => {
        expect(VirtualFS.createFolder('tmp/mydir')).toBe(true);
        expect(VirtualFS.exists('tmp/mydir')).toBe(true);
    });

    it('returns false when the folder already exists', () => {
        VirtualFS.createFolder('tmp/mydir');
        expect(VirtualFS.createFolder('tmp/mydir')).toBe(false);
    });

    it('returns false for an empty path', () => {
        expect(VirtualFS.createFolder([])).toBe(false);
    });

    it('created folder shows up in list()', () => {
        VirtualFS.createFolder('tmp/newdir');
        const items = VirtualFS.list('tmp');
        expect(Object.keys(items)).toContain('newdir');
    });
});

// ─── writeFile ───────────────────────────────────────────────────────────────

describe('VirtualFS – writeFile', () => {
    it('updates content of an existing file and returns true', () => {
        VirtualFS.createFile('tmp/updatable.txt', 'initial');
        const result = VirtualFS.writeFile('tmp/updatable.txt', 'updated');
        expect(result).toBe(true);
        expect(VirtualFS.readFile('tmp/updatable.txt')).toBe('updated');
    });

    it('updates the size metadata after write', () => {
        VirtualFS.createFile('tmp/sized.txt', 'abc');
        VirtualFS.writeFile('tmp/sized.txt', 'hello world');
        const file = VirtualFS.getFile('tmp/sized.txt');
        expect(file?.size).toBe('hello world'.length);
    });

    it('returns false when the file does not exist', () => {
        expect(VirtualFS.writeFile('tmp/ghost.txt', 'content')).toBe(false);
    });

    it('returns false when the path points to a folder', () => {
        expect(VirtualFS.writeFile('tmp', 'content')).toBe(false);
    });
});

// ─── delete ──────────────────────────────────────────────────────────────────

describe('VirtualFS – delete', () => {
    it('deletes an existing file and returns true', () => {
        VirtualFS.createFile('tmp/todelete.txt', 'bye');
        expect(VirtualFS.delete('tmp/todelete.txt')).toBe(true);
        expect(VirtualFS.exists('tmp/todelete.txt')).toBe(false);
    });

    it('deletes an existing folder and returns true', () => {
        VirtualFS.createFolder('tmp/rmdir');
        expect(VirtualFS.delete('tmp/rmdir')).toBe(true);
        expect(VirtualFS.exists('tmp/rmdir')).toBe(false);
    });

    it('returns false when the item does not exist', () => {
        expect(VirtualFS.delete('tmp/nobody.txt')).toBe(false);
    });

    it('returns false for an empty path', () => {
        expect(VirtualFS.delete([])).toBe(false);
    });
});

// ─── rename ──────────────────────────────────────────────────────────────────

describe('VirtualFS – rename', () => {
    it('renames an existing file and makes it accessible under the new name', () => {
        VirtualFS.createFile('tmp/old.txt', 'data');
        expect(VirtualFS.rename('tmp/old.txt', 'new.txt')).toBe(true);
        expect(VirtualFS.exists('tmp/new.txt')).toBe(true);
        expect(VirtualFS.exists('tmp/old.txt')).toBe(false);
    });

    it('preserves file content after rename', () => {
        VirtualFS.createFile('tmp/src.txt', 'preserved');
        VirtualFS.rename('tmp/src.txt', 'dst.txt');
        expect(VirtualFS.readFile('tmp/dst.txt')).toBe('preserved');
    });

    it('returns false when target name already exists', () => {
        VirtualFS.createFile('tmp/a.txt', 'A');
        VirtualFS.createFile('tmp/b.txt', 'B');
        expect(VirtualFS.rename('tmp/a.txt', 'b.txt')).toBe(false);
    });

    it('returns false when the source does not exist', () => {
        expect(VirtualFS.rename('tmp/ghost.txt', 'new.txt')).toBe(false);
    });

    it('returns false for an empty path', () => {
        expect(VirtualFS.rename([], 'anything')).toBe(false);
    });
});

// ─── getStats ────────────────────────────────────────────────────────────────

describe('VirtualFS – getStats', () => {
    it('returns non-negative counts and size for the default structure', () => {
        const stats = VirtualFS.getStats();
        expect(stats.totalFiles).toBeGreaterThan(0);
        expect(stats.totalFolders).toBeGreaterThan(0);
        expect(stats.totalSize).toBeGreaterThanOrEqual(0);
    });

    it('increments totalFiles after createFile', () => {
        const before = VirtualFS.getStats().totalFiles;
        VirtualFS.createFile('tmp/extra.txt', 'x');
        expect(VirtualFS.getStats().totalFiles).toBe(before + 1);
    });

    it('decrements totalFiles after delete', () => {
        VirtualFS.createFile('tmp/tbd.txt', 'y');
        const before = VirtualFS.getStats().totalFiles;
        VirtualFS.delete('tmp/tbd.txt');
        expect(VirtualFS.getStats().totalFiles).toBe(before - 1);
    });
});

// ─── Event System ────────────────────────────────────────────────────────────

describe('VirtualFS – event system', () => {
    it('emits a "create" event when a file is created', () => {
        const events: string[] = [];
        const listener = (e: { type: string }) => events.push(e.type);
        VirtualFS.addEventListener(listener);
        VirtualFS.createFile('tmp/evt.txt', 'hi');
        VirtualFS.removeEventListener(listener);
        expect(events).toContain('create');
    });

    it('emits an "update" event when a file is written', () => {
        VirtualFS.createFile('tmp/upd.txt', 'old');
        const events: string[] = [];
        const listener = (e: { type: string }) => events.push(e.type);
        VirtualFS.addEventListener(listener);
        VirtualFS.writeFile('tmp/upd.txt', 'new');
        VirtualFS.removeEventListener(listener);
        expect(events).toContain('update');
    });

    it('emits a "delete" event when a file is deleted', () => {
        VirtualFS.createFile('tmp/del.txt', 'bye');
        const events: string[] = [];
        const listener = (e: { type: string }) => events.push(e.type);
        VirtualFS.addEventListener(listener);
        VirtualFS.delete('tmp/del.txt');
        VirtualFS.removeEventListener(listener);
        expect(events).toContain('delete');
    });

    it('emits a "rename" event when a file is renamed', () => {
        VirtualFS.createFile('tmp/ren.txt', 'val');
        const events: string[] = [];
        const listener = (e: { type: string }) => events.push(e.type);
        VirtualFS.addEventListener(listener);
        VirtualFS.rename('tmp/ren.txt', 'ren2.txt');
        VirtualFS.removeEventListener(listener);
        expect(events).toContain('rename');
    });

    it('does not call a listener after it is removed', () => {
        const events: string[] = [];
        const listener = (e: { type: string }) => events.push(e.type);
        VirtualFS.addEventListener(listener);
        VirtualFS.removeEventListener(listener);
        VirtualFS.createFile('tmp/noevent.txt', '');
        expect(events).toHaveLength(0);
    });
});

// ─── forceSave / forceSaveAsync ──────────────────────────────────────────────

describe('VirtualFS – forceSave / forceSaveAsync', () => {
    it('forceSave() does not throw', () => {
        expect(() => VirtualFS.forceSave()).not.toThrow();
    });

    it('forceSaveAsync() resolves without throwing', async () => {
        await expect(VirtualFS.forceSaveAsync()).resolves.toBeUndefined();
    });
});

// ─── export / import ─────────────────────────────────────────────────────────

describe('VirtualFS – export / import', () => {
    it('export returns a deep copy of the filesystem', () => {
        const exported = VirtualFS.export();
        expect(exported).toHaveProperty('/');
        expect(exported['/']).toHaveProperty('type', 'folder');
    });

    it('exported snapshot is independent (mutation does not affect VFS)', () => {
        const exported = VirtualFS.export();
        // Mutate the snapshot
        (exported['/'] as { icon: string }).icon = 'MUTATED';
        const liveExport = VirtualFS.export();
        expect(liveExport['/'].icon).not.toBe('MUTATED');
    });

    it('import replaces the filesystem with given data', () => {
        const snapshot = VirtualFS.export();
        // Add a file to verify it appears after import
        VirtualFS.createFile('tmp/before-import.txt', 'data');
        // Re-import clean snapshot
        const ok = VirtualFS.import(snapshot);
        expect(ok).toBe(true);
        // The file created before import should be gone
        expect(VirtualFS.exists('tmp/before-import.txt')).toBe(false);
    });

    it('import returns false for invalid data', () => {
        // @ts-expect-error – intentionally passing bad data
        expect(VirtualFS.import(null)).toBe(false);
    });
});

// ─── get ─────────────────────────────────────────────────────────────────────

describe('VirtualFS – get', () => {
    it('returns a folder FSItem for a path that points to a folder', () => {
        const item = VirtualFS.get('home/marvin');
        expect(item).not.toBeNull();
        expect(item?.type).toBe('folder');
    });

    it('returns a file FSItem for a path that points to a file', () => {
        const item = VirtualFS.get('home/marvin/welcome.txt');
        expect(item?.type).toBe('file');
    });

    it('returns null for a path that does not exist', () => {
        expect(VirtualFS.get('no/such/path')).toBeNull();
    });
});

// ─── getFolder ───────────────────────────────────────────────────────────────

describe('VirtualFS – getFolder', () => {
    it('returns a FolderItem with a children map', () => {
        const folder = VirtualFS.getFolder('home/marvin');
        expect(folder?.type).toBe('folder');
        expect(folder?.children).toBeDefined();
    });

    it('returns null when the path points to a file', () => {
        expect(VirtualFS.getFolder('home/marvin/welcome.txt')).toBeNull();
    });

    it('returns null for a non-existent path', () => {
        expect(VirtualFS.getFolder('no/such/folder')).toBeNull();
    });
});

// ─── getFile ─────────────────────────────────────────────────────────────────

describe('VirtualFS – getFile', () => {
    it('returns a FileItem with content and size for an existing file', () => {
        const file = VirtualFS.getFile('home/marvin/welcome.txt');
        expect(file?.type).toBe('file');
        expect(typeof file?.content).toBe('string');
        expect(typeof file?.size).toBe('number');
    });

    it('returns null when the path points to a folder', () => {
        expect(VirtualFS.getFile('home/marvin')).toBeNull();
    });

    it('returns null for a non-existent path', () => {
        expect(VirtualFS.getFile('no/such/file.txt')).toBeNull();
    });
});

// ─── readFile edge cases ──────────────────────────────────────────────────────

describe('VirtualFS – readFile (edge cases)', () => {
    it('returns null for a file with empty string content (falsy content guard)', () => {
        // readFile uses `file?.content || null`, so empty string returns null
        VirtualFS.createFile('tmp/empty.txt', '');
        expect(VirtualFS.readFile('tmp/empty.txt')).toBeNull();
    });
});

// ─── createFile / createFolder – root level and custom icons ─────────────────

describe('VirtualFS – single-segment paths (root level)', () => {
    it('createFile at root level (no parent directory segment)', () => {
        expect(VirtualFS.createFile('rootfile.txt', 'top-level content')).toBe(true);
        expect(VirtualFS.exists('rootfile.txt')).toBe(true);
        expect(VirtualFS.readFile('rootfile.txt')).toBe('top-level content');
    });

    it('createFolder at root level', () => {
        expect(VirtualFS.createFolder('rootdir')).toBe(true);
        expect(VirtualFS.exists('rootdir')).toBe(true);
    });

    it('createFile respects a custom icon', () => {
        VirtualFS.createFile('tmp/custom-icon.txt', 'x', '🚀');
        expect(VirtualFS.getFile('tmp/custom-icon.txt')?.icon).toBe('🚀');
    });

    it('createFolder respects a custom icon', () => {
        VirtualFS.createFolder('tmp/custom-folder', '🎯');
        expect(VirtualFS.getFolder('tmp/custom-folder')?.icon).toBe('🎯');
    });
});

// ─── load() – localStorage persistence round-trip ────────────────────────────

describe('VirtualFS – load() via localStorage', () => {
    it('restores a saved file after delete-without-save + load()', async () => {
        VirtualFS.createFile('tmp/persist-test.txt', 'should survive');
        await VirtualFS.forceSaveAsync(); // writes to localStorage via LocalStorageAdapter

        // Remove from in-memory state without triggering a new save
        VirtualFS.delete('tmp/persist-test.txt');
        vi.clearAllTimers();

        // Reload: localStorage still has the file
        await VirtualFS.load();

        expect(VirtualFS.exists('tmp/persist-test.txt')).toBe(true);
        expect(VirtualFS.readFile('tmp/persist-test.txt')).toBe('should survive');
    });

    it('starts with default structure after reset() + load() with no prior data', async () => {
        localStorage.clear();
        VirtualFS.reset();
        await VirtualFS.forceSaveAsync();
        await VirtualFS.load();

        expect(VirtualFS.exists('home/marvin')).toBe(true);
        expect(VirtualFS.exists('tmp')).toBe(true);
    });
});
