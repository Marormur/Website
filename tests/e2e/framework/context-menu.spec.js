const { test, expect } = require('@playwright/test');

test.describe('MacUI Framework - Context Menu', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY);
    });

    test('ContextMenu component is available', async ({ page }) => {
        const hasContextMenu = await page.evaluate(() => {
            return typeof window.MacUI.ContextMenu !== 'undefined';
        });

        expect(hasContextMenu).toBe(true);
    });

    test('ContextMenu renders with items', async ({ page }) => {
        await page.evaluate(() => {
            const { ContextMenu } = window.MacUI;
            const container = document.createElement('div');
            container.id = 'test-container';
            document.body.appendChild(container);

            const menu = new ContextMenu({
                items: [
                    { id: 'copy', label: 'Copy', icon: '📋', onClick: () => {} },
                    { id: 'paste', label: 'Paste', icon: '📄', onClick: () => {} },
                ],
                position: { x: 100, y: 100 },
                onClose: () => {},
            });
            menu.mount(container);
        });

        const hasMenu = await page.evaluate(() => {
            return document.querySelector('.macui-context-menu') !== null;
        });

        expect(hasMenu).toBe(true);
    });
});
