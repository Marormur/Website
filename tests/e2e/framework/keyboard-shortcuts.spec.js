const { test, expect } = require('@playwright/test');

test.describe('MacUI Framework - Keyboard Shortcuts', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY);
    });

    test('KeyboardShortcuts manager is available', async ({ page }) => {
        const hasManager = await page.evaluate(() => {
            return typeof window.MacUI.keyboardShortcuts !== 'undefined';
        });

        expect(hasManager).toBe(true);
    });

    test('Can register and get shortcuts', async ({ page }) => {
        const shortcut = await page.evaluate(() => {
            const { keyboardShortcuts } = window.MacUI;
            
            keyboardShortcuts.register({
                id: 'test-save',
                key: 'Meta+S',
                scope: 'global',
                description: 'Save file',
                callback: () => {}
            });

            return keyboardShortcuts.get('test-save');
        });

        expect(shortcut).toBeDefined();
        expect(shortcut.id).toBe('test-save');
    });
});
