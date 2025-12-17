/**
 * Performance Monitor Statistics Tests
 *
 * Tests the enhanced PerfMonitor with statistics tracking:
 * - measureFunction() helper
 * - getStats() for avg, min, max, p95, count
 * - reportStats() with console.table()
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('PerfMonitor Statistics @basic', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('should support measureFunction() helper', async ({ page }) => {
        const result = await page.evaluate(() => {
            if (!window.PerfMonitor || typeof window.PerfMonitor.measureFunction !== 'function') {
                return { supported: false };
            }

            // Measure a simple function
            let called = false;
            const returnValue = window.PerfMonitor.measureFunction('test-function', () => {
                called = true;
                return 42;
            });

            return {
                supported: true,
                called,
                returnValue,
            };
        });

        expect(result.supported).toBe(true);
        expect(result.called).toBe(true);
        expect(result.returnValue).toBe(42);
    });

    test('should track metrics across multiple calls', async ({ page }) => {
        const result = await page.evaluate(() => {
            if (!window.PerfMonitor || typeof window.PerfMonitor.measureFunction !== 'function') {
                return { supported: false };
            }

            // Call multiple times
            for (let i = 0; i < 10; i++) {
                window.PerfMonitor.measureFunction('repeated-operation', () => {
                    // Simulate some work
                    let sum = 0;
                    for (let j = 0; j < 1000; j++) sum += j;
                    return sum;
                });
            }

            const stats = window.PerfMonitor.getStats('repeated-operation');
            return {
                supported: true,
                stats,
            };
        });

        expect(result.supported).toBe(true);
        expect(result.stats).toBeDefined();
        expect(result.stats.count).toBe(10);
        expect(result.stats.avg).toBeGreaterThan(0);
        expect(result.stats.min).toBeGreaterThan(0);
        expect(result.stats.max).toBeGreaterThan(0);
        expect(result.stats.p95).toBeGreaterThan(0);
    });

    test('should calculate correct statistics', async ({ page }) => {
        const result = await page.evaluate(() => {
            if (!window.PerfMonitor || typeof window.PerfMonitor.measureFunction !== 'function') {
                return { supported: false };
            }

            // Create predictable timings by directly adding to metrics
            window.PerfMonitor.metrics.set('test-stats', [10, 20, 30, 40, 50]);

            const stats = window.PerfMonitor.getStats('test-stats');
            return {
                supported: true,
                stats,
            };
        });

        expect(result.supported).toBe(true);
        expect(result.stats).toBeDefined();
        expect(result.stats.count).toBe(5);
        expect(result.stats.avg).toBe(30); // (10+20+30+40+50)/5
        expect(result.stats.min).toBe(10);
        expect(result.stats.max).toBe(50);
        expect(result.stats.p95).toBe(50); // 95th percentile of [10,20,30,40,50]
    });

    test('should return null for non-existent metrics', async ({ page }) => {
        const result = await page.evaluate(() => {
            if (!window.PerfMonitor || typeof window.PerfMonitor.getStats !== 'function') {
                return { supported: false };
            }

            const stats = window.PerfMonitor.getStats('non-existent-metric');
            return {
                supported: true,
                stats,
            };
        });

        expect(result.supported).toBe(true);
        expect(result.stats).toBeNull();
    });

    test('should support reportStats() with console.table', async ({ page }) => {
        // Capture console.table calls
        const tableData = [];
        await page.exposeFunction('captureTable', data => {
            tableData.push(data);
        });

        // Override console.table to capture data
        await page.evaluate(() => {
            const original = console.table;
            console.table = function (data) {
                window.captureTable(JSON.parse(JSON.stringify(data)));
                original.apply(console, arguments);
            };
        });

        // Add some metrics
        await page.evaluate(() => {
            if (window.PerfMonitor && typeof window.PerfMonitor.measureFunction === 'function') {
                for (let i = 0; i < 5; i++) {
                    window.PerfMonitor.measureFunction('test-op-1', () => {
                        let sum = 0;
                        for (let j = 0; j < 100; j++) sum += j;
                    });
                    window.PerfMonitor.measureFunction('test-op-2', () => {
                        let sum = 0;
                        for (let j = 0; j < 200; j++) sum += j;
                    });
                }

                window.PerfMonitor.reportStats();
            }
        });

        // Wait a bit for async console operations
        await page.waitForTimeout(500);

        // Should have called console.table at least once
        expect(tableData.length).toBeGreaterThan(0);

        // Check structure of data
        const firstTable = tableData[0];
        expect(Array.isArray(firstTable)).toBe(true);
        expect(firstTable.length).toBeGreaterThan(0);
        expect(firstTable[0]).toHaveProperty('Operation');
        expect(firstTable[0]).toHaveProperty('avg');
        expect(firstTable[0]).toHaveProperty('min');
        expect(firstTable[0]).toHaveProperty('max');
        expect(firstTable[0]).toHaveProperty('p95');
        expect(firstTable[0]).toHaveProperty('count');
    });

    test('should be accessible via API.performance facade', async ({ page }) => {
        const result = await page.evaluate(() => {
            if (
                !window.API ||
                !window.API.performance ||
                typeof window.API.performance.measureFunction !== 'function'
            ) {
                return { supported: false };
            }

            // Call via API
            const value = window.API.performance.measureFunction('api-test', () => 123);

            const stats = window.API.performance.getStats('api-test');

            return {
                supported: true,
                value,
                stats,
            };
        });

        expect(result.supported).toBe(true);
        expect(result.value).toBe(123);
        expect(result.stats).toBeDefined();
        expect(result.stats.count).toBe(1);
    });
});
