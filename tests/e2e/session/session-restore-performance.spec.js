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
        const terminalWindows = window.WindowRegistry?.getAllWindows?.('terminal') || [];
        const editorWindows = window.WindowRegistry?.getAllWindows?.('text-editor') || [];
        const terminals = terminalWindows.reduce((sum, win) => sum + (win.tabs?.size || 0), 0);
        const editors = editorWindows.reduce((sum, win) => sum + (win.tabs?.size || 0), 0);
        return { terminals, editors, total: terminals + editors };
    });
}

async function waitForCountsAtLeast(page, expected, timeout = 8000) {
    await page.waitForFunction(
        ({ terminals, editors, total }) => {
            try {
                const terminalWindows = window.WindowRegistry?.getAllWindows?.('terminal') || [];
                const editorWindows = window.WindowRegistry?.getAllWindows?.('text-editor') || [];
                const t = terminalWindows.reduce((sum, win) => sum + (win.tabs?.size || 0), 0);
                const e = editorWindows.reduce((sum, win) => sum + (win.tabs?.size || 0), 0);
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

async function waitForSessionRestoreDone(page, timeout = 10000) {
    await page.waitForFunction(() => window.__SESSION_RESTORED === true, { timeout });
}

async function resetSessionState(page) {
    await page.evaluate(() => {
        localStorage.removeItem('multi-window-session');
        localStorage.removeItem('windowInstancesSession');
        localStorage.removeItem('window-session');
        localStorage.removeItem('openModals');
        window.WindowRegistry?.closeAllWindows?.();
        window.TerminalInstanceManager?.destroyAllInstances?.();
        window.TextEditorInstanceManager?.destroyAllInstances?.();
    });
}

async function createTerminalTabs(page, count) {
    await page.evaluate(tabCount => {
        if (!window.TerminalWindow?.create) return;
        const terminalWindow = window.TerminalWindow.create();
        for (let index = 1; index < tabCount; index++) {
            terminalWindow.createSession?.(`Terminal ${index + 1}`);
        }
    }, count);
}

async function createEditorTabs(page, count) {
    await page.evaluate(tabCount => {
        if (!window.TextEditorWindow?.create) return;
        const editorWindow = window.TextEditorWindow.create();
        for (let index = 1; index < tabCount; index++) {
            editorWindow.createDocument?.(`TextEditor ${index + 1}`);
        }
    }, count);
}

async function createTerminalWindows(page, count) {
    await page.evaluate(windowCount => {
        if (!window.TerminalWindow?.create) return;
        for (let index = 0; index < windowCount; index++) {
            window.TerminalWindow.create({ title: `Terminal ${index + 1}` });
        }
    }, count);
}

async function saveSession(page) {
    await page.evaluate(() => {
        const hasRegisteredWindows = (window.WindowRegistry?.getAllWindows?.().length || 0) > 0;
        if (hasRegisteredWindows && window.MultiWindowSessionManager?.saveSession) {
            window.MultiWindowSessionManager.saveSession({ immediate: true });
            return;
        }
        if (window.SessionManager?.saveAll) {
            window.SessionManager.saveAll({ immediate: true });
            return;
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
        await resetSessionState(page);
    });

    test('should restore 20 instances in < 500ms', async ({ page }) => {
        await enablePerfMonitor(page);

        // Create 20 mixed instances (Terminal + TextEditor)
        const instanceCount = 20;
        const terminalCount = 12;
        const textEditorCount = 8;
        const beforeCounts = await getCounts(page);

        await createTerminalTabs(page, terminalCount);
        await createEditorTabs(page, textEditorCount);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + terminalCount,
            editors: beforeCounts.editors + textEditorCount,
            total: beforeCounts.total + instanceCount,
        });

        // Verify instances were created
        const instanceCountBefore = await page.evaluate(() => {
            const terminalWindows = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const editorWindows = window.WindowRegistry?.getAllWindows?.('text-editor') || [];
            return {
                terminals: terminalWindows.reduce((sum, win) => sum + (win.tabs?.size || 0), 0),
                editors: editorWindows.reduce((sum, win) => sum + (win.tabs?.size || 0), 0),
                total:
                    terminalWindows.reduce((sum, win) => sum + (win.tabs?.size || 0), 0) +
                    editorWindows.reduce((sum, win) => sum + (win.tabs?.size || 0), 0),
            };
        });

        console.log('Instances before save:', instanceCountBefore);
        expect(instanceCountBefore.total - beforeCounts.total).toBe(instanceCount);

        // Save session immediately
        await saveSession(page);

        // Verify session was saved
        const sessionInfo = await page.evaluate(() => {
            return window.MultiWindowSessionManager?.getSessionInfo?.();
        });

        console.log('Session info after save:', sessionInfo);
        expect(sessionInfo?.windowCount).toBeGreaterThan(0);

        // Reload page to trigger restore
        await page.reload();
        await waitForAppReady(page);
        await waitForSessionRestoreDone(page);

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
                    (window.WindowRegistry?.getAllWindows?.('terminal') || []).reduce(
                        (sum, win) => sum + (win.tabs?.size || 0),
                        0
                    ) +
                    (window.WindowRegistry?.getAllWindows?.('text-editor') || []).reduce(
                        (sum, win) => sum + (win.tabs?.size || 0),
                        0
                    ),
                restored: {
                    terminals: (window.WindowRegistry?.getAllWindows?.('terminal') || []).reduce(
                        (sum, win) => sum + (win.tabs?.size || 0),
                        0
                    ),
                    editors: (window.WindowRegistry?.getAllWindows?.('text-editor') || []).reduce(
                        (sum, win) => sum + (win.tabs?.size || 0),
                        0
                    ),
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

        await createTerminalTabs(page, terminalCount);
        await createEditorTabs(page, textEditorCount);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + terminalCount,
            editors: beforeCounts.editors + textEditorCount,
            total: beforeCounts.total + instanceCount,
        });

        // Save and reload
        await saveSession(page);

        await page.reload();
        await waitForAppReady(page);
        await waitForSessionRestoreDone(page);

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
                    (window.WindowRegistry?.getAllWindows?.('terminal') || []).reduce(
                        (sum, win) => sum + (win.tabs?.size || 0),
                        0
                    ) +
                    (window.WindowRegistry?.getAllWindows?.('text-editor') || []).reduce(
                        (sum, win) => sum + (win.tabs?.size || 0),
                        0
                    ),
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

        // Create 10 windows and focus them in specific order.
        const instanceCount = 10;
        const beforeCounts = await getCounts(page);

        await createTerminalWindows(page, instanceCount);
        await page.evaluate(() => {
            const windows = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            windows.forEach(win => win.bringToFront?.());
        });

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
        await waitForSessionRestoreDone(page);

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

        await createTerminalTabs(page, 15);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + 15,
            editors: beforeCounts.editors,
            total: beforeCounts.total + 15,
        });

        // Get active instance before reload
        const activeIdBefore = await page.evaluate(() => {
            const terminalWindow = (window.WindowRegistry?.getAllWindows?.('terminal') || [])[0];
            const sessions = terminalWindow?.sessions || [];
            const targetSession = sessions[10] || sessions[sessions.length - 1] || null;
            if (!terminalWindow || !targetSession) return null;
            terminalWindow.setActiveTab?.(targetSession.id);
            return terminalWindow.activeSession?.id || null;
        });

        expect(activeIdBefore).not.toBeNull();

        // Save and reload
        await saveSession(page);

        await page.reload();
        await waitForAppReady(page);
        await waitForSessionRestoreDone(page);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + 15,
            editors: beforeCounts.editors,
            total: beforeCounts.total + 15,
        });

        // Verify active instance is restored
        const activeIdAfter = await page.evaluate(() => {
            const terminalWindow = (window.WindowRegistry?.getAllWindows?.('terminal') || [])[0];
            return terminalWindow?.activeSession?.id || null;
        });

        expect(activeIdAfter).toBe(activeIdBefore);
    });

    test('should batch restore instances by type in parallel', async ({ page }) => {
        await enablePerfMonitor(page);

        // Create mixed instance types
        const terminalCount = 10;
        const editorCount = 10;
        const beforeCounts = await getCounts(page);

        await createTerminalTabs(page, terminalCount);
        await createEditorTabs(page, editorCount);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + terminalCount,
            editors: beforeCounts.editors + editorCount,
            total: beforeCounts.total + terminalCount + editorCount,
        });

        // Save and reload
        await saveSession(page);

        await page.reload();
        await waitForAppReady(page);
        await waitForSessionRestoreDone(page);

        await waitForCountsAtLeast(page, {
            terminals: beforeCounts.terminals + terminalCount,
            editors: beforeCounts.editors + editorCount,
            total: beforeCounts.total + terminalCount + editorCount,
        });

        // Verify both types were restored correctly
        const counts = await page.evaluate(() => {
            return {
                terminals: (window.WindowRegistry?.getAllWindows?.('terminal') || []).reduce(
                    (sum, win) => sum + (win.tabs?.size || 0),
                    0
                ),
                editors: (window.WindowRegistry?.getAllWindows?.('text-editor') || []).reduce(
                    (sum, win) => sum + (win.tabs?.size || 0),
                    0
                ),
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
