/**
 * VirtualFS Performance Tests (IndexedDB-backed)
 *
 * Validates that VirtualFS can persist a larger filesystem asynchronously and exposes perf metrics.
 */

const { test, expect } = require('@playwright/test');
const { gotoHome, waitForAppReady } = require('../utils');

async function createLargeFs(page, count = 100) {
    await page.evaluate(async n => {
        const vfs = window.VirtualFS;
        if (!vfs) throw new Error('VirtualFS not available');
        // Create files under /home/marvin
        for (let i = 0; i < n; i++) {
            const name = `perf-${i}.txt`;
            // Ensure parent exists (default structure contains /home/marvin)
            vfs.createFile(`/home/marvin/${name}`, `content ${i}`);
        }
        if (typeof vfs.forceSaveAsync === 'function') {
            await vfs.forceSaveAsync();
        } else if (typeof vfs.forceSave === 'function') {
            vfs.forceSave();
        }
    }, count);
}

function hasPerfMeasure(measures, name) {
    return measures.some(m => m && typeof m.name === 'string' && m.name === name);
}

function findPerfMeasure(measures, name) {
    return measures.find(m => m && typeof m.name === 'string' && m.name === name) || null;
}

// Smoke test: ensure metrics exist after creating a large FS
test.describe('VirtualFS performance metrics', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await gotoHome(page, baseURL);
        await waitForAppReady(page);
    });

    test('exposes save/load performance measures for large FS', async ({ page }) => {
        // Create 100 files and persist
        await createLargeFs(page, 100);

        // Collect performance measures
        const { measures, adapter } = await page.evaluate(() => {
            const Perf = window.API?.performance;
            const out = {
                measures: Array.isArray(Perf?.report) ? [] : [],
                adapter: null,
            };
            try {
                const m = window.API?.performance?.report?.({ topN: 50, clear: false }) || [];
                out.measures = Array.isArray(m) ? m : [];
            } catch {}
            try {
                // Inspect adapter name if possible
                out.adapter =
                    window.VirtualFS && window.VirtualFS.storage
                        ? window.VirtualFS.storage.name
                        : window.indexedDB
                          ? 'IndexedDB'
                          : 'localStorage';
            } catch {
                out.adapter = window.indexedDB ? 'IndexedDB' : 'localStorage';
            }
            return out;
        });

        // Always have generic measures
        expect(Array.isArray(measures)).toBe(true);
        expect(hasPerfMeasure(measures, 'vfs:save-duration')).toBe(true);
        expect(hasPerfMeasure(measures, 'vfs:load-duration')).toBe(true);

        // Adapter-specific metric should also be present
        const expectedAdapterName = adapter === 'IndexedDB' ? 'IndexedDB' : 'localStorage';
        const adapterSave = findPerfMeasure(measures, `vfs:${expectedAdapterName}:save-duration`);
        expect(adapterSave).not.toBeNull();
        if (adapterSave) {
            expect(typeof adapterSave.duration).toBe('number');
            expect(adapterSave.duration).toBeGreaterThanOrEqual(0);
        }
    });
});
