const { test, expect } = require('@playwright/test');

test.describe('MacUI Framework - Drag & Drop', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY);
    });

    test('DragDropManager is available', async ({ page }) => {
        const hasManager = await page.evaluate(() => {
            return typeof window.MacUI.dragDropManager !== 'undefined';
        });

        expect(hasManager).toBe(true);
    });

    test('Can make element draggable', async ({ page }) => {
        const isDraggable = await page.evaluate(() => {
            const { dragDropManager } = window.MacUI;
            const element = document.createElement('div');
            element.id = 'draggable-test';
            document.body.appendChild(element);

            dragDropManager.makeDraggable({
                element,
                data: { type: 'test', data: 'test-data' },
            });

            return element.draggable === true;
        });

        expect(isDraggable).toBe(true);
    });
});
