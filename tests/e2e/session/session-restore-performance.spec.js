/**
 * @fileoverview E2E Tests for Session Restore Performance (Issue #125)
 * Tests batch restore optimization with 20+ instances
 */

import { test, expect } from '@playwright/test';
import { waitForAppReady, waitForSessionSaved } from '../utils.js';

async function enablePerfMonitor(page) {
    await page.evaluate(() => {
        if (window.PerfMonitor && !window.PerfMonitor.enabled) {
            window.PerfMonitor.enable();
        }
    });
}

async function getCounts(page) {
    return page.evaluate(() => {
        const terminalMgr = window.TerminalInstanceManager;
        const editorMgr = window.TextEditorInstanceManager;
        const terminals = terminalMgr?.getInstanceCount() || 0;
        const editors = editorMgr?.getInstanceCount() || 0;
        return { terminals, editors, total: terminals + editors };
    });
}

async function waitForCountsAtLeast(page, expected, timeout = 8000) {
    await page.waitForFunction(
        ({ terminals, editors, total }) => {
            try {
                const terminalMgr = window.TerminalInstanceManager;
                const editorMgr = window.TextEditorInstanceManager;
                const t = terminalMgr?.getInstanceCount() || 0;
                const e = editorMgr?.getInstanceCount() || 0;
                const sum = t + e;
                return t >= terminals && e >= editors && sum >= total;
            } catch {
                return false;
            }
        },
        expected,
        { timeout }
    );
}

async function saveSession(page) {
    await page.evaluate(() => {
        if (window.SessionManager?.saveAll) {
            window.SessionManager.saveAll({ immediate: true });
            return;
        }
        if (window.MultiWindowSessionManager?.saveSession) {
            window.MultiWindowSessionManager.saveSession({ immediate: true });
        }
    });

    await waitForSessionSaved(page);

    await page.waitForFunction(
        () => {
            return !!(
                localStorage.getItem('windowInstancesSession') ||
                localStorage.getItem('multi-window-session') ||
                localStorage.getItem('window-session')
            );
        },
        { timeout: 3000 }
    );
}

test.describe('Session Restore Performance', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('should restore 20 instances in < 500ms', async ({ page }) => {
        await enablePerfMonitor(page);

        // Create 20 mixed instances (Terminal + TextEditor)
        const instanceCount = 20;
        const terminalCount = 12;
        const textEditorCount = 8;
        const beforeCounts = await getCounts(page);

        // Create Terminal instances
        await page.evaluate(count => {
            const manager = window.TerminalInstanceManager;
            if (!manager) {
                console.error('TerminalInstanceManager not found!');
                return;
            }
            for (let i = 0; i < count; i++) {
                manager.createInstance({ title: `Terminal ${i + 1}` });
            }
        }, terminalCount);

        // Create TextEditor instances
        await page.evaluate(count => {
            const manager = window.TextEditorInstanceManager;
            if (!manager) {
                console.error('TextEditorInstanceManager not found!');
                return;
            }
            for (let i = 0; i < count; i++) {
                manager.createInstance({ title: `TextEditor ${i + 1}` });
            }
        }, textEditorCount);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + terminalCount,
            editors: beforeCounts.editors + textEditorCount,
            total: beforeCounts.total + instanceCount,
        });

        // Verify instances were created
        const instanceCountBefore = await page.evaluate(() => {
            const terminalMgr = window.TerminalInstanceManager;
            const editorMgr = window.TextEditorInstanceManager;
            return {
                terminals: terminalMgr?.getInstanceCount() || 0,
                editors: editorMgr?.getInstanceCount() || 0,
                total:
                    (terminalMgr?.getInstanceCount() || 0) + (editorMgr?.getInstanceCount() || 0),
            };
        });

        console.log('Instances before save:', instanceCountBefore);
        expect(instanceCountBefore.total - beforeCounts.total).toBe(instanceCount);

        // Save session immediately
        await saveSession(page);

        // Verify session was saved
        const sessionInfo = await page.evaluate(() => {
            return window.SessionManager.getStats();
        });

        console.log('Session info after save:', sessionInfo);
        expect(sessionInfo.instanceCount).toBeGreaterThan(0);

        // Reload page to trigger restore
        await page.reload();
        await waitForAppReady(page);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + terminalCount,
            editors: beforeCounts.editors + textEditorCount,
            total: beforeCounts.total + instanceCount,
        });

        // Measure restore performance
        const metrics = await page.evaluate(() => {
            const perf = window.PerfMonitor;
            if (!perf) return { error: 'PerfMonitor not available' };

            // Ensure PerfMonitor is enabled for measurements
            if (!perf.enabled) {
                perf.enable();
            }

            // Debug PerfMonitor API
            const perfApi = {
                hasMark: typeof perf.mark === 'function',
                hasMeasure: typeof perf.measure === 'function',
                hasReport: typeof perf.report === 'function',
                enabled: perf.enabled,
            };

            // report() returns PerformanceMeasure[], not { measures: [...] }
            const report = perf.report();
            const restoreMeasure = report.find(m => m.name === 'session:restore-duration');

            return {
                perfApi,
                duration: restoreMeasure?.duration || null,
                hasMeasures: report.length,
                allMeasureNames: report.map(m => m.name),
                instanceCount:
                    (window.TerminalInstanceManager?.getInstanceCount() || 0) +
                    (window.TextEditorInstanceManager?.getInstanceCount() || 0),
                restored: {
                    terminals: window.TerminalInstanceManager?.getInstanceCount() || 0,
                    editors: window.TextEditorInstanceManager?.getInstanceCount() || 0,
                },
            };
        });

        console.log('Metrics after restore:', metrics);

        // Verify all instances were restored
        expect(metrics.instanceCount - beforeCounts.total).toBe(instanceCount);

        // Performance assertion: < 500ms for 20 instances (Issue #125)
        expect(metrics.duration).not.toBeNull();
        expect(metrics.duration).toBeLessThan(500);
    });

    test('should handle 30 instances without timeout', async ({ page }) => {
        await enablePerfMonitor(page);

        // Stress test with 30 instances
        const instanceCount = 30;
        const terminalCount = 15;
        const textEditorCount = 15;
        const beforeCounts = await getCounts(page);

        // Create instances
        await page.evaluate(count => {
            const manager = window.TerminalInstanceManager;
            if (!manager) return;
            for (let i = 0; i < count; i++) {
                manager.createInstance({ title: `Terminal ${i + 1}` });
            }
        }, terminalCount);

        await page.evaluate(count => {
            const manager = window.TextEditorInstanceManager;
            if (!manager) return;
            for (let i = 0; i < count; i++) {
                manager.createInstance({ title: `TextEditor ${i + 1}` });
            }
        }, textEditorCount);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + terminalCount,
            editors: beforeCounts.editors + textEditorCount,
            total: beforeCounts.total + instanceCount,
        });

        // Save and reload
        await saveSession(page);

        await page.reload();
        await waitForAppReady(page);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + terminalCount,
            editors: beforeCounts.editors + textEditorCount,
            total: beforeCounts.total + instanceCount,
        });

        // Verify restore completed successfully (no timeout)
        const metrics = await page.evaluate(() => {
            const perf = window.PerfMonitor;
            const report = perf?.report() || [];
            const restoreMeasure = report.find(m => m.name === 'session:restore-duration');

            return {
                instanceCount:
                    (window.TerminalInstanceManager?.getInstanceCount() || 0) +
                    (window.TextEditorInstanceManager?.getInstanceCount() || 0),
                duration: restoreMeasure?.duration || null,
            };
        });

        console.log(
            `Stress test: Restored ${metrics.instanceCount} instances in ${metrics.duration?.toFixed(2)}ms`
        );

        expect(metrics.instanceCount - beforeCounts.total).toBe(instanceCount);
        expect(metrics.duration).toBeDefined();
    });

    // TODO(#130): Reaktiviert, beobachten; falls flaky, erneut untersuchen
    test('should restore z-index order correctly with many instances', async ({ page }) => {
        await enablePerfMonitor(page);

        // Create 10 instances and focus them in specific order
        const instanceCount = 10;
        const beforeCounts = await getCounts(page);

        await page.evaluate(count => {
            const manager = window.TerminalInstanceManager;
            if (!manager) return;
            for (let i = 0; i < count; i++) {
                const instance = manager.createInstance({ title: `Terminal ${i + 1}` });
                // Focus each instance to ensure window is opened and added to window stack
                if (instance?.focus) {
                    instance.focus();
                }
            }
        }, instanceCount);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + instanceCount,
            editors: beforeCounts.editors,
            total: beforeCounts.total + instanceCount,
        });

        // Get window stack before reload
        const stackBefore = await page.evaluate(() => {
            const zIndexMgr = window.__zIndexManager;
            return zIndexMgr?.getWindowStack() || [];
        });

        expect(stackBefore.length).toBeGreaterThan(0);

        // Save and reload
        await saveSession(page);

        await page.reload();
        await waitForAppReady(page);

        // Verify z-index order is restored
        const stackAfter = await page.evaluate(() => {
            const zIndexMgr = window.__zIndexManager;
            return zIndexMgr?.getWindowStack() || [];
        });

        expect(stackAfter.length).toBe(stackBefore.length);
        expect(stackAfter).toEqual(stackBefore);
    });

    test('should restore active instance selection with many instances', async ({ page }) => {
        await enablePerfMonitor(page);

        const beforeCounts = await getCounts(page);

        // Create 15 Terminal instances
        await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;
            if (!manager) return;
            for (let i = 0; i < 15; i++) {
                manager.createInstance({ title: `Terminal ${i + 1}` });
            }
        });

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + 15,
            editors: beforeCounts.editors,
            total: beforeCounts.total + 15,
        });

        // Get active instance before reload
        const activeIdBefore = await page.evaluate(() => {
            return window.TerminalInstanceManager?.getActiveInstance()?.instanceId || null;
        });

        expect(activeIdBefore).not.toBeNull();

        // Save and reload
        await saveSession(page);

        await page.reload();
        await waitForAppReady(page);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + 15,
            editors: beforeCounts.editors,
            total: beforeCounts.total + 15,
        });

        // Verify active instance is restored
        const activeIdAfter = await page.evaluate(() => {
            return window.TerminalInstanceManager?.getActiveInstance()?.instanceId || null;
        });

        expect(activeIdAfter).toBe(activeIdBefore);
    });

    test('should batch restore instances by type in parallel', async ({ page }) => {
        await enablePerfMonitor(page);

        // Create mixed instance types
        const terminalCount = 10;
        const editorCount = 10;
        const beforeCounts = await getCounts(page);

        await page.evaluate(count => {
            const manager = window.TerminalInstanceManager;
            if (!manager) return;
            for (let i = 0; i < count; i++) {
                manager.createInstance({ title: `Terminal ${i + 1}` });
            }
        }, terminalCount);

        await page.evaluate(count => {
            const manager = window.TextEditorInstanceManager;
            if (!manager) return;
            for (let i = 0; i < count; i++) {
                manager.createInstance({ title: `TextEditor ${i + 1}` });
            }
        }, editorCount);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + terminalCount,
            editors: beforeCounts.editors + editorCount,
            total: beforeCounts.total + terminalCount + editorCount,
        });

        // Save and reload
        await saveSession(page);

        await page.reload();
        await waitForAppReady(page);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + terminalCount,
            editors: beforeCounts.editors + editorCount,
            total: beforeCounts.total + terminalCount + editorCount,
        });

        // Verify both types were restored correctly
        const counts = await page.evaluate(() => {
            return {
                terminals: window.TerminalInstanceManager?.getInstanceCount() || 0,
                editors: window.TextEditorInstanceManager?.getInstanceCount() || 0,
            };
        });

        expect(counts.terminals - beforeCounts.terminals).toBe(terminalCount);
        expect(counts.editors - beforeCounts.editors).toBe(editorCount);

        // Verify performance metrics exist
        const hasPerfMetric = await page.evaluate(() => {
            const perf = window.PerfMonitor;
            const report = perf?.report() || [];
            return report.some(m => m.name === 'session:restore-duration');
        });

        expect(hasPerfMetric).toBe(true);
    });
});
