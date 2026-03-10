const { test, expect } = require('@playwright/test');

test.describe('Performance Monitor', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:5173');
        await page.waitForFunction(() => window.__APP_READY === true);
    });

    test('should track component render times', async ({ page }) => {
        const result = await page.evaluate(() => {
            const { performanceMonitor } = window.MacUI;
            performanceMonitor.enable();

            // Simulate component renders
            performanceMonitor.markRenderStart('TestComponent');
            // Simulate work
            const start = performance.now();
            while (performance.now() - start < 10) {
                // Busy wait for 10ms
            }
            performanceMonitor.markRenderEnd('TestComponent');

            const metrics = performanceMonitor.getMetrics('TestComponent');
            return {
                hasMetrics: metrics !== undefined,
                renderCount: metrics?.renderCount || 0,
                renderTime: metrics?.renderTime || 0,
            };
        });

        expect(result.hasMetrics).toBe(true);
        expect(result.renderCount).toBe(1);
        expect(result.renderTime).toBeGreaterThan(0);
    });

    test('should generate performance report', async ({ page }) => {
        const result = await page.evaluate(() => {
            const { performanceMonitor } = window.MacUI;
            performanceMonitor.enable();

            // Simulate multiple renders
            for (let i = 0; i < 3; i++) {
                performanceMonitor.markRenderStart('ComponentA');
                performanceMonitor.markRenderEnd('ComponentA');
            }

            const report = performanceMonitor.getReport();
            return {
                totalRenders: report.totalRenders,
                componentCount: report.components.length,
            };
        });

        expect(result.totalRenders).toBeGreaterThan(0);
        expect(result.componentCount).toBeGreaterThan(0);
    });

    test('should be accessible via window.MacUIPerf', async ({ page }) => {
        const exists = await page.evaluate(() => {
            return window.MacUIPerf !== undefined;
        });

        expect(exists).toBe(true);
    });
});
