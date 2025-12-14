import { test, expect } from '@playwright/test';
import utils from '../utils.js';

test.describe('Error Handler Integration @basic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('should have ErrorHandler available on window', async ({ page }) => {
        const hasErrorHandler = await page.evaluate(() => {
            return typeof window.ErrorHandler !== 'undefined';
        });
        expect(hasErrorHandler).toBe(true);
    });

    test('should have API.error namespace available', async ({ page }) => {
        const hasAPIError = await page.evaluate(() => {
            return (
                typeof window.API !== 'undefined' &&
                typeof window.API.error !== 'undefined' &&
                typeof window.API.error.getLogs === 'function'
            );
        });
        expect(hasAPIError).toBe(true);
    });

    test('should be enabled by default', async ({ page }) => {
        const isEnabled = await page.evaluate(() => {
            return window.ErrorHandler.enabled === true;
        });
        expect(isEnabled).toBe(true);
    });

    test('should capture unhandled errors', async ({ page }) => {
        // Clear existing logs first
        await page.evaluate(() => {
            window.ErrorHandler.clearLogs();
        });

        // Trigger an error by accessing non-existent property
        await page.evaluate(() => {
            setTimeout(() => {
                // This will trigger a ReferenceError
                // eslint-disable-next-line no-undef
                nonExistentFunction();
            }, 100);
        });

        // Wait for error to be captured
        await page.waitForTimeout(500);

        // Check if error was logged
        const errorLogs = await page.evaluate(() => {
            return window.ErrorHandler.getLogs();
        });

        expect(errorLogs.length).toBeGreaterThan(0);
        expect(errorLogs[0].type).toBe('error');
    });

    test('should capture unhandled promise rejections', async ({ page }) => {
        // Clear existing logs first
        await page.evaluate(() => {
            window.ErrorHandler.clearLogs();
        });

        // Trigger an unhandled promise rejection
        await page.evaluate(() => {
            Promise.reject(new Error('Test rejection'));
        });

        // Wait for rejection to be captured
        await page.waitForTimeout(500);

        // Check if rejection was logged
        const errorLogs = await page.evaluate(() => {
            return window.ErrorHandler.getLogs();
        });

        expect(errorLogs.length).toBeGreaterThan(0);
        const rejectionLog = errorLogs.find(log => log.type === 'unhandledrejection');
        expect(rejectionLog).toBeDefined();
    });

    test('should support enable/disable functionality', async ({ page }) => {
        // Disable error handler
        await page.evaluate(() => {
            window.ErrorHandler.disable();
        });

        let isEnabled = await page.evaluate(() => {
            return window.ErrorHandler.enabled;
        });
        expect(isEnabled).toBe(false);

        // Re-enable error handler
        await page.evaluate(() => {
            window.ErrorHandler.enable();
        });

        isEnabled = await page.evaluate(() => {
            return window.ErrorHandler.enabled;
        });
        expect(isEnabled).toBe(true);
    });

    test('should support clearing logs', async ({ page }) => {
        // Clear logs
        await page.evaluate(() => {
            window.ErrorHandler.clearLogs();
        });

        let logs = await page.evaluate(() => {
            return window.ErrorHandler.getLogs();
        });
        expect(logs.length).toBe(0);

        // Trigger an error
        await page.evaluate(() => {
            setTimeout(() => {
                // eslint-disable-next-line no-undef
                triggerError();
            }, 100);
        });

        await page.waitForTimeout(500);

        logs = await page.evaluate(() => {
            return window.ErrorHandler.getLogs();
        });
        expect(logs.length).toBeGreaterThan(0);

        // Clear again
        await page.evaluate(() => {
            window.ErrorHandler.clearLogs();
        });

        logs = await page.evaluate(() => {
            return window.ErrorHandler.getLogs();
        });
        expect(logs.length).toBe(0);
    });

    test('should work via API.error facade', async ({ page }) => {
        // Test via API facade
        await page.evaluate(() => {
            window.API.error.clearLogs();
        });

        const logs = await page.evaluate(() => {
            return window.API.error.getLogs();
        });
        expect(logs.length).toBe(0);

        // Test enable/disable
        await page.evaluate(() => {
            window.API.error.disable();
        });

        let isEnabled = await page.evaluate(() => {
            return window.ErrorHandler.enabled;
        });
        expect(isEnabled).toBe(false);

        await page.evaluate(() => {
            window.API.error.enable();
        });

        isEnabled = await page.evaluate(() => {
            return window.ErrorHandler.enabled;
        });
        expect(isEnabled).toBe(true);
    });

    test('should persist error logs to localStorage', async ({ page }) => {
        // Clear and add an error
        await page.evaluate(() => {
            window.ErrorHandler.clearLogs();
            window.ErrorHandler._record({
                type: 'error',
                time: new Date().toISOString(),
                message: 'Test error for persistence',
                error: { name: 'TestError', message: 'Test error for persistence' },
            });
        });

        // Reload page
        await page.reload();
        await utils.waitForAppReady(page);

        // Check if logs persisted
        const logs = await page.evaluate(() => {
            return window.ErrorHandler.getLogs();
        });

        expect(logs.length).toBeGreaterThan(0);
        const testLog = logs.find(log => log.message === 'Test error for persistence');
        expect(testLog).toBeDefined();
    });
});
