/**
 * @fileoverview E2E Tests for Session Restore Performance (Issue #125)
 * Tests batch restore optimization with 20+ instances
 */

import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../utils.js';

test.describe('Session Restore Performance', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('should restore 20 instances in < 500ms', async ({ page }) => {
        // Ensure PerfMonitor is enabled for performance measurements
        await page.evaluate(() => {
            if (window.PerfMonitor && !window.PerfMonitor.enabled) {
                window.PerfMonitor.enable();
            }
        });

        // Create 20 mixed instances (Terminal + TextEditor)
        const instanceCount = 20;
        const terminalCount = 12;
        const textEditorCount = 8;

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

        // Wait for all instances to be created
        await page.waitForTimeout(500);

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
        expect(instanceCountBefore.total).toBe(instanceCount);

        // Save session immediately
        await page.evaluate(() => {
            window.SessionManager.saveAll({ immediate: true });
        });

        // Wait for save to persist
        await page.waitForTimeout(500);

        // Verify session was saved
        const sessionInfo = await page.evaluate(() => {
            return window.SessionManager.getStats();
        });

        console.log('Session info after save:', sessionInfo);
        expect(sessionInfo.instanceCount).toBeGreaterThan(0);

        // Reload page to trigger restore
        await page.reload();
        await waitForAppReady(page);

        // Wait for session restore (legacy SessionManager has 100ms delay in app-init)
        await page.waitForTimeout(500);

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
        expect(metrics.instanceCount).toBe(instanceCount);

        // Performance assertion: < 500ms for 20 instances (Issue #125)
        expect(metrics.duration).not.toBeNull();
        expect(metrics.duration).toBeLessThan(500);
    });

    test('should handle 30 instances without timeout', async ({ page }) => {
        // Ensure PerfMonitor is enabled
        await page.evaluate(() => {
            if (window.PerfMonitor && !window.PerfMonitor.enabled) {
                window.PerfMonitor.enable();
            }
        });

        // Stress test with 30 instances
        const instanceCount = 30;
        const terminalCount = 15;
        const textEditorCount = 15;

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

        await page.waitForTimeout(500);

        // Save and reload
        await page.evaluate(() => {
            window.SessionManager.saveAll({ immediate: true });
        });

        await page.reload();
        await waitForAppReady(page);

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

        expect(metrics.instanceCount).toBe(instanceCount);
        expect(metrics.duration).toBeDefined();
    });

    // TODO(#130): Reaktivieren sobald z-index Window-Stack korrekt persistiert/wiederhergestellt wird
    test.skip('should restore z-index order correctly with many instances', async ({ page }) => {
        // Ensure PerfMonitor is enabled
        await page.evaluate(() => {
            if (window.PerfMonitor && !window.PerfMonitor.enabled) {
                window.PerfMonitor.enable();
            }
        });

        // Create 10 instances and focus them in specific order
        const instanceCount = 10;

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

        await page.waitForTimeout(300);

        // Get window stack before reload
        const stackBefore = await page.evaluate(() => {
            const zIndexMgr = window.__zIndexManager;
            return zIndexMgr?.getWindowStack() || [];
        });

        expect(stackBefore.length).toBeGreaterThan(0);

        // Save and reload
        await page.evaluate(() => {
            window.SessionManager.saveAll({ immediate: true });
        });

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
        // Ensure PerfMonitor is enabled
        await page.evaluate(() => {
            if (window.PerfMonitor && !window.PerfMonitor.enabled) {
                window.PerfMonitor.enable();
            }
        });

        // Create 15 Terminal instances
        await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;
            if (!manager) return;
            for (let i = 0; i < 15; i++) {
                manager.createInstance({ title: `Terminal ${i + 1}` });
            }
        });

        await page.waitForTimeout(300);

        // Get active instance before reload
        const activeIdBefore = await page.evaluate(() => {
            return window.TerminalInstanceManager?.getActiveInstance()?.instanceId || null;
        });

        expect(activeIdBefore).not.toBeNull();

        // Save and reload
        await page.evaluate(() => {
            window.SessionManager.saveAll({ immediate: true });
        });

        await page.reload();
        await waitForAppReady(page);

        // Verify active instance is restored
        const activeIdAfter = await page.evaluate(() => {
            return window.TerminalInstanceManager?.getActiveInstance()?.instanceId || null;
        });

        expect(activeIdAfter).toBe(activeIdBefore);
    });

    test('should batch restore instances by type in parallel', async ({ page }) => {
        // Ensure PerfMonitor is enabled
        await page.evaluate(() => {
            if (window.PerfMonitor && !window.PerfMonitor.enabled) {
                window.PerfMonitor.enable();
            }
        });

        // Create mixed instance types
        const terminalCount = 10;
        const editorCount = 10;

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

        await page.waitForTimeout(500);

        // Save and reload
        await page.evaluate(() => {
            window.SessionManager.saveAll({ immediate: true });
        });

        await page.reload();
        await waitForAppReady(page);

        // Verify both types were restored correctly
        const counts = await page.evaluate(() => {
            return {
                terminals: window.TerminalInstanceManager?.getInstanceCount() || 0,
                editors: window.TextEditorInstanceManager?.getInstanceCount() || 0,
            };
        });

        expect(counts.terminals).toBe(terminalCount);
        expect(counts.editors).toBe(editorCount);

        // Verify performance metrics exist
        const hasPerfMetric = await page.evaluate(() => {
            const perf = window.PerfMonitor;
            const report = perf?.report() || [];
            return report.some(m => m.name === 'session:restore-duration');
        });

        expect(hasPerfMetric).toBe(true);
    });
});
