const { test, expect } = require('@playwright/test');

test.describe('MacUI Framework - Toast System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY);
    });

    test('Toast manager is available', async ({ page }) => {
        const hasToast = await page.evaluate(() => {
            return typeof window.toast !== 'undefined';
        });

        expect(hasToast).toBe(true);
    });

    test('Toast.success shows success message', async ({ page }) => {
        await page.evaluate(() => {
            window.toast.success('Test success message', 5000);
        });

        await page.waitForSelector('.macui-toast[data-type="success"]', { timeout: 2000 });
        const message = await page.textContent('.macui-toast[data-type="success"]');
        expect(message).toContain('Test success message');
    });

    test('Toast.error shows error message', async ({ page }) => {
        await page.evaluate(() => {
            window.toast.error('Test error message', 5000);
        });

        await page.waitForSelector('.macui-toast[data-type="error"]', { timeout: 2000 });
        const message = await page.textContent('.macui-toast[data-type="error"]');
        expect(message).toContain('Test error message');
    });
});
