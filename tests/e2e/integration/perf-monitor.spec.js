import { test, expect } from '@playwright/test';
import utils from '../utils.js';

test.describe('Performance Monitor Integration @basic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('should have PerfMonitor available on window', async ({ page }) => {
        const hasPerfMonitor = await page.evaluate(() => {
            return typeof window.PerfMonitor !== 'undefined';
        });
        expect(hasPerfMonitor).toBe(true);
    });

    test('should have API.performance namespace available', async ({ page }) => {
        const hasAPIPerformance = await page.evaluate(() => {
            return (
                typeof window.API !== 'undefined' &&
                typeof window.API.performance !== 'undefined' &&
                typeof window.API.performance.mark === 'function' &&
                typeof window.API.performance.measure === 'function' &&
                typeof window.API.performance.report === 'function' &&
                typeof window.API.performance.getVitals === 'function'
            );
        });
        expect(hasAPIPerformance).toBe(true);
    });

    test('should be enabled by default in development', async ({ page }) => {
        const isEnabled = await page.evaluate(() => {
            return window.PerfMonitor.enabled === true;
        });
        expect(isEnabled).toBe(true);
    });

    test('should support enable/disable functionality', async ({ page }) => {
        // Disable perf monitor
        await page.evaluate(() => {
            window.PerfMonitor.disable();
        });

        let isEnabled = await page.evaluate(() => {
            return window.PerfMonitor.enabled;
        });
        expect(isEnabled).toBe(false);

        // Re-enable perf monitor
        await page.evaluate(() => {
            window.PerfMonitor.enable();
        });

        isEnabled = await page.evaluate(() => {
            return window.PerfMonitor.enabled;
        });
        expect(isEnabled).toBe(true);
    });

    test('should support toggle functionality', async ({ page }) => {
        const initialState = await page.evaluate(() => {
            return window.PerfMonitor.enabled;
        });

        await page.evaluate(() => {
            window.PerfMonitor.toggle();
        });

        const toggledState = await page.evaluate(() => {
            return window.PerfMonitor.enabled;
        });

        expect(toggledState).toBe(!initialState);
    });

    test('should support mark() functionality', async ({ page }) => {
        const result = await page.evaluate(() => {
            window.PerfMonitor.mark('test-mark');
            // Check if mark was created
            const marks = performance.getEntriesByName('test-mark', 'mark');
            return marks.length > 0;
        });
        expect(result).toBe(true);
    });

    test('should support measure() functionality', async ({ page }) => {
        const result = await page.evaluate(() => {
            window.PerfMonitor.mark('start-mark');
            window.PerfMonitor.mark('end-mark');
            const measurement = window.PerfMonitor.measure(
                'test-measure',
                'start-mark',
                'end-mark'
            );
            return measurement !== null && measurement.name === 'test-measure';
        });
        expect(result).toBe(true);
    });

    test('should return measures from report()', async ({ page }) => {
        const measures = await page.evaluate(() => {
            window.PerfMonitor.mark('report-start');
            window.PerfMonitor.mark('report-end');
            window.PerfMonitor.measure('report-measure', 'report-start', 'report-end');
            return window.PerfMonitor.report();
        });
        expect(Array.isArray(measures)).toBe(true);
        expect(measures.length).toBeGreaterThan(0);
        expect(measures[0]).toHaveProperty('name');
        expect(measures[0]).toHaveProperty('duration');
    });

    test('should capture Core Web Vitals', async ({ page }) => {
        // Wait for page to fully load and vitals to be captured
        await page.waitForLoadState('networkidle');

        // Wait for vitals to be populated (at least TTFB should be available)
        await page.waitForFunction(
            () => {
                const vitals = window.PerfMonitor.getVitals();
                return Object.keys(vitals).length > 0;
            },
            { timeout: 5000 }
        );

        const vitals = await page.evaluate(() => {
            return window.PerfMonitor.getVitals();
        });

        expect(vitals).toBeDefined();
        expect(typeof vitals).toBe('object');

        // TTFB should always be captured
        expect(vitals.TTFB).toBeDefined();
        expect(typeof vitals.TTFB).toBe('number');
        expect(vitals.TTFB).toBeGreaterThan(0);

        // LCP may be captured if content rendered
        if (vitals.LCP !== undefined) {
            expect(typeof vitals.LCP).toBe('number');
            expect(vitals.LCP).toBeGreaterThan(0);
        }

        // CLS starts at 0 and accumulates
        if (vitals.CLS !== undefined) {
            expect(typeof vitals.CLS).toBe('number');
            expect(vitals.CLS).toBeGreaterThanOrEqual(0);
        }
    });

    test('should work via API.performance facade', async ({ page }) => {
        // Test mark via API
        await page.evaluate(() => {
            window.API.performance.mark('api-test-mark');
        });

        const hasMark = await page.evaluate(() => {
            const marks = performance.getEntriesByName('api-test-mark', 'mark');
            return marks.length > 0;
        });
        expect(hasMark).toBe(true);

        // Test getVitals via API
        const vitals = await page.evaluate(() => {
            return window.API.performance.getVitals();
        });
        expect(vitals).toBeDefined();
        expect(typeof vitals).toBe('object');

        // Test enable/disable via API
        await page.evaluate(() => {
            window.API.performance.disable();
        });

        let isEnabled = await page.evaluate(() => {
            return window.PerfMonitor.enabled;
        });
        expect(isEnabled).toBe(false);

        await page.evaluate(() => {
            window.API.performance.enable();
        });

        isEnabled = await page.evaluate(() => {
            return window.PerfMonitor.enabled;
        });
        expect(isEnabled).toBe(true);
    });

    test('should persist enabled state to localStorage', async ({ page }) => {
        // Enable and check persistence
        await page.evaluate(() => {
            window.PerfMonitor.enable();
        });

        const storedValue = await page.evaluate(() => {
            return localStorage.getItem('app.perfMonitor.enabled');
        });
        expect(storedValue).toBe('true');

        // Disable and check persistence
        await page.evaluate(() => {
            window.PerfMonitor.disable();
        });

        const storedValueAfterDisable = await page.evaluate(() => {
            return localStorage.getItem('app.perfMonitor.enabled');
        });
        expect(storedValueAfterDisable).toBe('false');
    });

    test('should include vitals in report output', async ({ page }) => {
        // Capture console logs
        const consoleLogs = [];
        page.on('console', msg => {
            if (msg.type() === 'info') {
                consoleLogs.push(msg.text());
            }
        });

        // Wait for vitals to be captured
        await page.waitForLoadState('networkidle');

        // Wait for vitals to be populated
        await page.waitForFunction(
            () => {
                const vitals = window.PerfMonitor.getVitals();
                return Object.keys(vitals).length > 0;
            },
            { timeout: 5000 }
        );

        // Generate report (synchronous - logs will be immediately captured by the listener)
        await page.evaluate(() => {
            window.PerfMonitor.report();
        });

        // Check if Core Web Vitals are mentioned in report (logs should be captured by now)
        const hasVitalsReport = consoleLogs.some(
            log =>
                log.includes('Core Web Vitals') ||
                log.includes('TTFB') ||
                log.includes('LCP') ||
                log.includes('CLS') ||
                log.includes('FID')
        );
        expect(hasVitalsReport).toBe(true);
    });
});

test.describe('Performance Monitor Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('should handle mark() with empty name gracefully', async ({ page }) => {
        const result = await page.evaluate(() => {
            window.PerfMonitor.mark('');
            // Should not throw, but also shouldn't create a mark
            const marks = performance.getEntriesByName('', 'mark');
            return marks.length === 0;
        });
        expect(result).toBe(true);
    });

    test('should handle measure() with invalid marks gracefully', async ({ page }) => {
        const result = await page.evaluate(() => {
            // Try to measure with non-existent marks
            const measurement = window.PerfMonitor.measure(
                'invalid-measure',
                'non-existent-start',
                'non-existent-end'
            );
            return measurement === null;
        });
        expect(result).toBe(true);
    });

    test('should return empty array when disabled', async ({ page }) => {
        const result = await page.evaluate(() => {
            window.PerfMonitor.disable();
            window.PerfMonitor.mark('disabled-mark');
            const measures = window.PerfMonitor.report();
            return measures.length === 0;
        });
        expect(result).toBe(true);
    });

    test('should support report() with clear option', async ({ page }) => {
        await page.evaluate(() => {
            window.PerfMonitor.mark('clear-test-start');
            window.PerfMonitor.mark('clear-test-end');
            window.PerfMonitor.measure('clear-test', 'clear-test-start', 'clear-test-end');

            // Report with clear
            window.PerfMonitor.report({ clear: true });
        });

        // Check if measures were cleared
        const measuresAfterClear = await page.evaluate(() => {
            const measures = performance.getEntriesByName('clear-test', 'measure');
            return measures.length;
        });
        expect(measuresAfterClear).toBe(0);
    });

    test('should support report() with topN option', async ({ page }) => {
        const result = await page.evaluate(() => {
            // Create multiple measures
            for (let i = 0; i < 10; i++) {
                window.PerfMonitor.mark(`test-${i}-start`);
                window.PerfMonitor.mark(`test-${i}-end`);
                window.PerfMonitor.measure(`test-${i}`, `test-${i}-start`, `test-${i}-end`);
            }

            // Report only top 3
            const measures = window.PerfMonitor.report({ topN: 3 });
            return measures.length;
        });
        expect(result).toBeLessThanOrEqual(3);
    });
});
