import { test, expect } from '@playwright/test';
import utils from '../utils.js';

test.describe('Error Handler Integration @basic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('should capture unhandled errors', async ({ page }) => {
        // Clear existing logs first
        await page.evaluate(() => {
            const handler = /** @type {any} */ (window.ErrorHandler);
            handler?.clearLogs?.();
        });

        // Trigger an error by accessing non-existent property
        await page.evaluate(() => {
            setTimeout(() => {
                // Trigger an unhandled runtime error intentionally.
                /** @type {any} */ (globalThis).nonExistentFunction();
            }, 100);
        });

        // Wait for error to be captured
        await page.waitForTimeout(500);

        // Check if error was logged
        const errorLogs = await page.evaluate(() => {
            const handler = /** @type {any} */ (window.ErrorHandler);
            return handler?.getLogs?.() || [];
        });

        expect(errorLogs.length).toBeGreaterThan(0);
        expect(errorLogs[0].type).toBe('error');
    });

    test('should capture unhandled promise rejections', async ({ page }) => {
        // Clear existing logs first
        await page.evaluate(() => {
            const handler = /** @type {any} */ (window.ErrorHandler);
            handler?.clearLogs?.();
        });

        // Trigger an unhandled promise rejection
        await page.evaluate(() => {
            Promise.reject(new Error('Test rejection'));
        });

        // Wait for rejection to be captured
        await page.waitForTimeout(500);

        // Check if rejection was logged
        const errorLogs = await page.evaluate(() => {
            const handler = /** @type {any} */ (window.ErrorHandler);
            return handler?.getLogs?.() || [];
        });

        expect(errorLogs.length).toBeGreaterThan(0);
        const rejectionLog = errorLogs.find(log => log.type === 'unhandledrejection');
        expect(rejectionLog).toBeDefined();
    });
});
