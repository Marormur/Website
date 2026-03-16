/**
 * tests/unit/services/virtual-fs-idb.test.ts
 *
 * Unit tests for VirtualFS using the IndexedDB storage adapter.
 *
 * fake-indexeddb/auto is imported FIRST (static import) so that globalThis.indexedDB
 * is polyfilled before VirtualFS is loaded. This causes selectStorageAdapter() in
 * the VirtualFS constructor to choose IndexedDbAdapter instead of LocalStorageAdapter,
 * allowing full IndexedDB code paths (save, load, delta-save, overlay, etc.) to be tested.
 *
 * NOTE: This file must remain separate from virtual-fs.test.ts because Vitest
 * gives each test file its own module scope. Importing fake-indexeddb/auto here
 * only affects this file's VirtualFS singleton.
 */

// ── Must be the first import so globalThis.indexedDB is set before VirtualFS loads ──
import 'fake-indexeddb/auto';
import { vi, beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';

// Only fake setTimeout/clearTimeout (used by VirtualFS.scheduleSave) so that
// vi.clearAllTimers() can cancel pending saves without blocking fake-indexeddb,
// which internally uses setImmediate for event scheduling.
beforeAll(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterAll(() => {
    vi.useRealTimers();
});

// Dynamic import ensures VirtualFS is instantiated AFTER fake-indexeddb polyfills indexedDB.
const { VirtualFS } = await import('../../../src/ts/services/virtual-fs.ts');

// ── beforeEach: bring VFS + IDB to a known-clean state ───────────────────────
//
// Steps:
//  1. reset()          → in-memory root = defaults, structureDirty=true, fires void save()
//  2. forceSaveAsync() → full save to IDB (overrides the void save), clears delta store
//                        and sets structureDirty=false, dirtyPaths=empty
//  3. load()           → syncs in-memory state from IDB so the two are identical
//  4. clearAllTimers() → prevents any stray scheduled saves from leaking between tests

beforeEach(async () => {
    localStorage.clear();
    VirtualFS.reset();
    await VirtualFS.forceSaveAsync();
    await VirtualFS.load();
    vi.clearAllTimers();
});

// ─── Full save / load round-trip ─────────────────────────────────────────────

describe('VirtualFS (IDB) – full save and load round-trip', () => {
    it('persists a created file in IDB and restores it after load()', async () => {
        VirtualFS.createFile('tmp/idb-test.txt', 'hello from IDB');
        await VirtualFS.forceSaveAsync(); // full save (structureDirty=true from createFile)

        // Remove from memory WITHOUT triggering a new save
        VirtualFS.delete('tmp/idb-test.txt');
        vi.clearAllTimers();

        // Reload from IDB – the file must come back
        await VirtualFS.load();

        expect(VirtualFS.exists('tmp/idb-test.txt')).toBe(true);
        expect(VirtualFS.readFile('tmp/idb-test.txt')).toBe('hello from IDB');
    });

    it('persists a nested folder structure in IDB', async () => {
        VirtualFS.createFolder('tmp/idb-folder');
        VirtualFS.createFile('tmp/idb-folder/child.txt', 'nested content');
        await VirtualFS.forceSaveAsync();

        VirtualFS.delete('tmp/idb-folder');
        vi.clearAllTimers();

        await VirtualFS.load();

        expect(VirtualFS.exists('tmp/idb-folder')).toBe(true);
        expect(VirtualFS.readFile('tmp/idb-folder/child.txt')).toBe('nested content');
    });

    it('reflects deletions saved to IDB – deleted files do not reappear', async () => {
        VirtualFS.createFile('tmp/delete-me.txt', 'ephemeral');
        await VirtualFS.forceSaveAsync(); // save with file present

        VirtualFS.delete('tmp/delete-me.txt');
        await VirtualFS.forceSaveAsync(); // save with file gone

        await VirtualFS.load();

        expect(VirtualFS.exists('tmp/delete-me.txt')).toBe(false);
    });

    it('overwrites previous IDB data on successive saves', async () => {
        VirtualFS.createFile('tmp/overwrite.txt', 'version 1');
        await VirtualFS.forceSaveAsync();

        VirtualFS.writeFile('tmp/overwrite.txt', 'version 2');
        VirtualFS.createFile('tmp/trigger-full.txt', ''); // makes structureDirty=true
        await VirtualFS.forceSaveAsync(); // full save with v2

        await VirtualFS.load();

        expect(VirtualFS.readFile('tmp/overwrite.txt')).toBe('version 2');
    });
});

// ─── Delta save + overlayFilesOnLoad ─────────────────────────────────────────
//
// Delta saves write only modified file *content* to a separate IDB object store
// ("files"), leaving the structural snapshot ("root") untouched. On the next
// load(), overlayFilesOnLoad() merges the deltas back into the root.
//
// Pre-condition: structureDirty=false AND dirtyPaths.size < DELTA_THRESHOLD (10).
// After beforeEach, structureDirty=false and dirtyPaths is empty, so the first
// writeFile() call satisfies both conditions.

describe('VirtualFS (IDB) – delta save and overlayFilesOnLoad', () => {
    it('restores written content via delta overlay on load()', async () => {
        // structureDirty=false after beforeEach → writeFile triggers delta path
        VirtualFS.writeFile('home/marvin/welcome.txt', 'DELTA CONTENT');
        await VirtualFS.forceSaveAsync(); // delta save

        // Write a different value in-memory only, then cancel the scheduled save
        VirtualFS.writeFile('home/marvin/welcome.txt', 'IN MEMORY ONLY');
        vi.clearAllTimers();

        // load(): IDB root store still has original, delta store has 'DELTA CONTENT'
        // overlayFilesOnLoad should apply the delta
        await VirtualFS.load();

        expect(VirtualFS.readFile('home/marvin/welcome.txt')).toBe('DELTA CONTENT');
    });

    it('delta-saves multiple files (below threshold) and restores all', async () => {
        VirtualFS.writeFile('home/marvin/welcome.txt', 'first delta');
        VirtualFS.writeFile('home/marvin/README.md', 'second delta');
        await VirtualFS.forceSaveAsync(); // delta save (2 files < threshold 10)

        // Replace both in-memory without saving
        VirtualFS.writeFile('home/marvin/welcome.txt', 'UNPERSISTED');
        VirtualFS.writeFile('home/marvin/README.md', 'ALSO UNPERSISTED');
        vi.clearAllTimers();

        await VirtualFS.load();

        expect(VirtualFS.readFile('home/marvin/welcome.txt')).toBe('first delta');
        expect(VirtualFS.readFile('home/marvin/README.md')).toBe('second delta');
    });
});

// ─── deleteDeltaForPrefix ────────────────────────────────────────────────────
//
// When a file is deleted, VirtualFS calls storage.deleteDeltaForPrefix() so that
// stale delta entries don't cause the file to reappear on the next load().

describe('VirtualFS (IDB) – deleteDeltaForPrefix on delete', () => {
    it('cleans up delta entries so a deleted file does not reappear after load()', async () => {
        VirtualFS.writeFile('home/marvin/welcome.txt', 'will be deleted');
        await VirtualFS.forceSaveAsync(); // delta save

        // Delete triggers deleteDeltaForPrefix AND sets structureDirty=true
        VirtualFS.delete('home/marvin/welcome.txt');
        await VirtualFS.forceSaveAsync(); // full save + clearAllDeltas

        await VirtualFS.load();

        expect(VirtualFS.exists('home/marvin/welcome.txt')).toBe(false);
    });

    it('cleans up delta entries for an entire deleted subtree', async () => {
        // Write files in a subfolder first
        VirtualFS.createFolder('tmp/sub');
        VirtualFS.createFile('tmp/sub/a.txt', 'file a');
        VirtualFS.createFile('tmp/sub/b.txt', 'file b');
        await VirtualFS.forceSaveAsync(); // full save (createFolder/File set structureDirty)

        // Now write to trigger delta entries for the subtree
        VirtualFS.writeFile('tmp/sub/a.txt', 'delta a');
        VirtualFS.writeFile('tmp/sub/b.txt', 'delta b');
        await VirtualFS.forceSaveAsync(); // delta save

        // Delete the entire subtree – calls deleteDeltaForPrefix('tmp/sub/')
        VirtualFS.delete('tmp/sub');
        await VirtualFS.forceSaveAsync(); // full save + clearAllDeltas

        await VirtualFS.load();

        expect(VirtualFS.exists('tmp/sub')).toBe(false);
    });
});

// ─── renameDeltaPrefix ───────────────────────────────────────────────────────
//
// Renaming a file should also update the delta store keys so that after the rename
// the delta is accessible under the new name.

describe('VirtualFS (IDB) – renameDeltaPrefix on rename', () => {
    it('updates delta keys so renamed-file content survives a reload', async () => {
        VirtualFS.writeFile('home/marvin/welcome.txt', 'content before rename');
        await VirtualFS.forceSaveAsync(); // delta save

        // Rename sets structureDirty=true and calls renameDeltaPrefix
        VirtualFS.rename('home/marvin/welcome.txt', 'welcome-renamed.txt');
        await VirtualFS.forceSaveAsync(); // full save (structureDirty=true)

        vi.clearAllTimers();
        await VirtualFS.load();

        expect(VirtualFS.exists('home/marvin/welcome-renamed.txt')).toBe(true);
    });

    it('makes the original name inaccessible after a rename + reload', async () => {
        VirtualFS.writeFile('home/marvin/welcome.txt', 'renaming me');
        await VirtualFS.forceSaveAsync(); // delta save

        VirtualFS.rename('home/marvin/welcome.txt', 'welcome-renamed.txt');
        await VirtualFS.forceSaveAsync(); // full save

        vi.clearAllTimers();
        await VirtualFS.load();

        expect(VirtualFS.exists('home/marvin/welcome.txt')).toBe(false);
    });
});

// ─── clearAllDeltas after full save ──────────────────────────────────────────

describe('VirtualFS (IDB) – clearAllDeltas after full save', () => {
    it('does not carry stale deltas across a full save + reload cycle', async () => {
        // 1. Delta-save a change
        VirtualFS.writeFile('home/marvin/welcome.txt', 'delta value');
        await VirtualFS.forceSaveAsync(); // delta save in files store

        // 2. Trigger a full save (createFile sets structureDirty=true)
        //    The full save writes the current root (including 'delta value') to the
        //    root store, then clearAllDeltas() empties the files store.
        VirtualFS.createFile('tmp/full-save-trigger.txt', '');
        await VirtualFS.forceSaveAsync();

        // 3. Write an in-memory-only change and cancel the scheduled save
        VirtualFS.writeFile('home/marvin/welcome.txt', 'in memory only');
        vi.clearAllTimers();

        // 4. Reload: root store has 'delta value' (persisted in step 2),
        //    files store is empty (cleared in step 2). Result must be 'delta value'.
        await VirtualFS.load();

        expect(VirtualFS.readFile('home/marvin/welcome.txt')).toBe('delta value');
        // Newly created file from step 2 should also be present
        expect(VirtualFS.exists('tmp/full-save-trigger.txt')).toBe(true);
    });
});

// ─── IDB clear ───────────────────────────────────────────────────────────────

describe('VirtualFS (IDB) – storage clear via reset', () => {
    it('after reset() + load(), the filesystem returns to default structure', async () => {
        VirtualFS.createFile('tmp/custom-data.txt', 'custom');
        await VirtualFS.forceSaveAsync();

        VirtualFS.reset();
        await VirtualFS.forceSaveAsync();
        await VirtualFS.load();

        // Custom file should be gone; default file should be present
        expect(VirtualFS.exists('tmp/custom-data.txt')).toBe(false);
        expect(VirtualFS.exists('home/marvin/welcome.txt')).toBe(true);
    });
});
