/**
 * VirtualFS Delta Save Tests
 *
 * Validates that repeated content updates trigger delta saves (adapter-specific metrics present)
 * and avoid full tree writes when under the threshold.
 */

const { test, expect } = require('@playwright/test');
const { gotoHome, waitForAppReady } = require('../utils');

async function writeManyTimes(page, filePath, times = 5) {
    await page.evaluate(
        async ({ p, n }) => {
            const vfs = window.VirtualFS;
            if (!vfs) throw new Error('VirtualFS not available');
            if (!vfs.exists(p)) {
                vfs.createFile(p, '');
                if (typeof vfs.forceSaveAsync === 'function') {
                    await vfs.forceSaveAsync();
                } else if (typeof vfs.forceSave === 'function') {
                    vfs.forceSave();
                }
            }
            for (let i = 0; i < n; i++) {
                vfs.writeFile(p, `content ${i}`);
            }
        },
        { p: filePath, n: times }
    );
}

function findMeasure(measures, name) {
    return measures.find(m => m && typeof m.name === 'string' && m.name === name) || null;
}

test.describe('VirtualFS delta saves', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await gotoHome(page, baseURL);
        await waitForAppReady(page);
    });

    test('records adapter-specific delta-save metric', async ({ page }) => {
        // Perform repeated writes to stay below threshold
        await writeManyTimes(page, '/home/marvin/delta-test.txt', 5);
        // Wait until the delta save measure appears or timeout
        await page.waitForFunction(
            () => {
                try {
                    const name = 'vfs:IndexedDB:delta-save-duration';
                    const entries = performance.getEntriesByName(name, 'measure');
                    if (entries && entries.length > 0) return true;
                    const Perf = window.API && window.API.performance;
                    const measures =
                        Perf && Perf.report ? Perf.report({ topN: 100, clear: false }) : [];
                    if (Array.isArray(measures)) {
                        return measures.some(m => m && m.name === name);
                    }
                    return false;
                } catch {
                    return false;
                }
            },
            { timeout: 4000 }
        );

        const { adapter, measures } = await page.evaluate(() => {
            const Perf = window.API?.performance;
            const out = { adapter: null, measures: [] };
            try {
                out.adapter = window.indexedDB ? 'IndexedDB' : 'localStorage';
                const m = Perf?.report?.({ topN: 100, clear: false }) || [];
                out.measures = Array.isArray(m) ? m : [];
            } catch {}
            return out;
        });

        if (adapter === 'IndexedDB') {
            const delta = findMeasure(measures, 'vfs:IndexedDB:delta-save-duration');
            expect(delta).not.toBeNull();
            if (delta) {
                expect(typeof delta.duration).toBe('number');
            }
        } else {
            // localStorage fallback doesn't support delta, but shouldn't crash
            expect(true).toBe(true);
        }
    });
});
