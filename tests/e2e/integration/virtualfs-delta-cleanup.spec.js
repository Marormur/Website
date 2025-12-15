/**
 * @file VirtualFS Delta Cleanup Tests
 * Tests that delta entries are properly cleaned up after full saves or structural changes.
 */

import { test, expect } from '@playwright/test';

test.describe('VirtualFS delta cleanup @basic', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to page and wait for app ready
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY === true, {
            timeout: 5000,
        });

        // Ensure clean state using window.VirtualFS (not API.virtualFS)
        await page.evaluate(() => {
            const vfs = window.VirtualFS;
            if (vfs && typeof vfs.reset === 'function') {
                vfs.reset();
            }
        });
    });

    test('clears delta entries after full save', async ({ page }) => {
        // Create a file and flush it (full save)
        await page.evaluate(async () => {
            const vfs = window.VirtualFS;
            vfs.createFile('/home/marvin/test.txt', 'initial content');
            await vfs.forceSaveAsync();
        });

        // Perform several small writes (below threshold) to trigger delta saves
        for (let i = 1; i <= 5; i++) {
            await page.evaluate(async i => {
                const vfs = window.VirtualFS;
                vfs.writeFile('/home/marvin/test.txt', `delta update ${i}`);
                await vfs.forceSaveAsync();
            }, i);
        }

        // Verify delta saves occurred (check console logs or metrics)
        const deltaMetrics = await page.evaluate(() => {
            const perf = window.performance;
            const entries = perf.getEntriesByType('measure');
            return entries.filter(e => e.name.includes('delta-save')).length;
        });
        expect(deltaMetrics).toBeGreaterThan(0);

        // Now trigger a structural change (force full save)
        await page.evaluate(async () => {
            const vfs = window.VirtualFS;
            vfs.createFolder('/home/marvin/new-folder'); // Structural change
            await vfs.forceSaveAsync();
        });

        // Check that IndexedDB "files" store is empty after full save
        const deltaCount = await page.evaluate(async () => {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open('VirtualFS', 2);
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction('files', 'readonly');
                    const store = tx.objectStore('files');
                    const countReq = store.count();
                    countReq.onsuccess = () => resolve(countReq.result);
                    countReq.onerror = () => reject(countReq.error);
                };
                req.onerror = () => reject(req.error);
            });
        });

        expect(deltaCount).toBe(0);
    });

    test('clears delta entries on reset', async ({ page }) => {
        // Create and save files
        await page.evaluate(async () => {
            const vfs = window.VirtualFS;
            vfs.createFile('/home/marvin/file1.txt', 'content 1');
            await vfs.forceSaveAsync();
            vfs.writeFile('/home/marvin/file1.txt', 'updated 1');
            await vfs.forceSaveAsync();
        });

        // Reset filesystem
        await page.evaluate(async () => {
            const vfs = window.VirtualFS;
            vfs.reset();
            await vfs.forceSaveAsync();
        });

        // Verify deltas are cleared
        const deltaCount = await page.evaluate(async () => {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open('VirtualFS', 2);
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction('files', 'readonly');
                    const store = tx.objectStore('files');
                    const countReq = store.count();
                    countReq.onsuccess = () => resolve(countReq.result);
                    countReq.onerror = () => reject(countReq.error);
                };
                req.onerror = () => reject(req.error);
            });
        });

        expect(deltaCount).toBe(0);
    });

    test('clears delta entries on delete', async ({ page }) => {
        // Create and save a file with delta updates
        await page.evaluate(async () => {
            const vfs = window.VirtualFS;
            vfs.createFile('/home/marvin/to-delete.txt', 'content');
            await vfs.forceSaveAsync();
            vfs.writeFile('/home/marvin/to-delete.txt', 'updated');
            await vfs.forceSaveAsync();
        });

        // Delete the file
        await page.evaluate(async () => {
            const vfs = window.VirtualFS;
            vfs.delete('/home/marvin/to-delete.txt');
            await vfs.forceSaveAsync();
        });

        // Check that the delta for this file is removed
        const deltaKeys = await page.evaluate(async () => {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open('VirtualFS', 2);
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction('files', 'readonly');
                    const store = tx.objectStore('files');
                    const allKeysReq = store.getAllKeys();
                    allKeysReq.onsuccess = () => resolve(allKeysReq.result);
                    allKeysReq.onerror = () => reject(allKeysReq.error);
                };
                req.onerror = () => reject(req.error);
            });
        });

        expect(deltaKeys).not.toContain('home/marvin/to-delete.txt');
    });

    test('renames delta entries on rename', async ({ page }) => {
        // Create file with delta
        await page.evaluate(async () => {
            const vfs = window.VirtualFS;
            vfs.createFile('/home/marvin/old-name.txt', 'content');
            await vfs.forceSaveAsync();
            vfs.writeFile('/home/marvin/old-name.txt', 'delta update');
            await vfs.forceSaveAsync();
        });

        // Rename the file
        await page.evaluate(async () => {
            const vfs = window.VirtualFS;
            vfs.rename('/home/marvin/old-name.txt', 'new-name.txt');
            await vfs.forceSaveAsync();
        });

        // Check that delta was renamed
        // Note: Rename triggers structureDirty -> full save -> clearAllDeltas
        // So after rename+save, deltas should be empty
        const deltaKeys = await page.evaluate(async () => {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open('VirtualFS', 2);
                req.onsuccess = () => {
                    const db = req.result;
                    const tx = db.transaction('files', 'readonly');
                    const store = tx.objectStore('files');
                    const allKeysReq = store.getAllKeys();
                    allKeysReq.onsuccess = () => resolve(allKeysReq.result);
                    allKeysReq.onerror = () => reject(allKeysReq.error);
                };
                req.onerror = () => reject(req.error);
            });
        });

        // After structural change (rename), full save clears all deltas
        expect(deltaKeys.length).toBe(0);
    });
});
