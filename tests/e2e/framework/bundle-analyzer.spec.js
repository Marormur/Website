const { test, expect } = require('@playwright/test');

test.describe('Bundle Analyzer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:5173');
        await page.waitForFunction(() => window.__APP_READY === true);
    });

    test('should provide bundle size information', async ({ page }) => {
        const result = await page.evaluate(() => {
            const { bundleAnalyzer } = window.MacUI;
            const report = bundleAnalyzer.getReport();
            return {
                totalSizeKB: report.totalSizeKB,
                componentCount: report.componentCount,
                hasLargestComponents: report.largestComponents.length > 0,
            };
        });

        expect(result.totalSizeKB).toBeGreaterThan(0);
        expect(result.componentCount).toBeGreaterThan(0);
        expect(result.hasLargestComponents).toBe(true);
    });

    test('should identify largest components', async ({ page }) => {
        const result = await page.evaluate(() => {
            const { bundleAnalyzer } = window.MacUI;
            const largest = bundleAnalyzer.getLargestComponents(3);
            return {
                count: largest.length,
                firstComponent: largest[0]?.name,
            };
        });

        expect(result.count).toBeLessThanOrEqual(3);
        expect(result.firstComponent).toBeTruthy();
    });

    test('should check target size', async ({ page }) => {
        const result = await page.evaluate(() => {
            const { bundleAnalyzer } = window.MacUI;
            return {
                exceedsSmall: bundleAnalyzer.exceedsTarget(10), // 10KB
                exceedsLarge: bundleAnalyzer.exceedsTarget(1000), // 1000KB
            };
        });

        expect(result.exceedsSmall).toBe(true); // Should exceed 10KB
        expect(result.exceedsLarge).toBe(false); // Should not exceed 1000KB
    });
});
