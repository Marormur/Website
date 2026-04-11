import { test, expect } from '@playwright/test';
import utils from '../utils.js';

test.describe('Performance Monitor Integration @basic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('should support measure() functionality', async ({ page }) => {
        const result = await page.evaluate(() => {
            const perf = /** @type {any} */ (window.PerfMonitor);
            if (!perf) return false;
            perf.mark?.('start-mark');
            perf.mark?.('end-mark');
            perf.measure?.('test-measure', 'start-mark', 'end-mark');
            const entries = performance.getEntriesByName('test-measure', 'measure');
            return entries.length > 0;
        });
        expect(result).toBe(true);
    });

    test('should capture Core Web Vitals', async ({ page }) => {
        // Wait for vitals to be populated (at least TTFB should be available immediately)
        // We don't use networkidle as it may timeout in dev environments with hot-reload
        await page.waitForFunction(
            () => {
                const vitals = /** @type {any} */ (window.PerfMonitor)?.getVitals?.() || {};
                return Object.keys(vitals).length > 0;
            },
            { timeout: 10000 }
        );

        const vitals = await page.evaluate(() => {
            return /** @type {any} */ (window.PerfMonitor)?.getVitals?.() || {};
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

    test('should include vitals in report output', async ({ page }) => {
        // Capture console logs
        const consoleLogs = [];
        page.on('console', msg => {
            if (msg.type() === 'info') {
                consoleLogs.push(msg.text());
            }
        });

        // Wait for vitals to be populated (at least TTFB should be available immediately)
        // We don't use networkidle as it may timeout in dev environments with hot-reload
        await page.waitForFunction(
            () => {
                const vitals = /** @type {any} */ (window.PerfMonitor)?.getVitals?.() || {};
                return Object.keys(vitals).length > 0;
            },
            { timeout: 10000 }
        );

        // Generate report (synchronous - logs will be immediately captured by the listener)
        await page.evaluate(() => {
            /** @type {any} */ (window.PerfMonitor)?.report?.();
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
