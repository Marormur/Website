const { test, expect } = require('@playwright/test');

test.describe('MacUI Framework - Tree Component', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY);
    });

    test('Tree component is available', async ({ page }) => {
        const hasTree = await page.evaluate(() => {
            return typeof window.MacUI.Tree !== 'undefined';
        });

        expect(hasTree).toBe(true);
    });

    test('Tree renders with nodes', async ({ page }) => {
        await page.evaluate(() => {
            const { Tree } = window.MacUI;
            const container = document.createElement('div');
            container.id = 'test-container';
            document.body.appendChild(container);

            const tree = new Tree({
                nodes: [
                    {
                        id: 'folder1',
                        label: 'Folder 1',
                        icon: '📁',
                        children: [{ id: 'file1', label: 'File 1', icon: '📄' }],
                    },
                ],
            });
            tree.mount(container);
        });

        const hasTree = await page.evaluate(() => {
            return document.querySelector('.macui-tree') !== null;
        });

        expect(hasTree).toBe(true);
    });
});
