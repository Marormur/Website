const { test, expect } = require('@playwright/test');

test.describe('MacUI Framework - Virtual List', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY);
    });

    test('VirtualList component is available', async ({ page }) => {
        const hasVirtualList = await page.evaluate(() => {
            return typeof window.MacUI.VirtualList !== 'undefined';
        });

        expect(hasVirtualList).toBe(true);
    });

    test('VirtualList renders items', async ({ page }) => {
        await page.evaluate(() => {
            const { VirtualList } = window.MacUI;
            const { h } = window.VDOM;
            const container = document.createElement('div');
            container.id = 'test-container';
            document.body.appendChild(container);

            const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));

            const list = new VirtualList({
                items,
                itemHeight: 40,
                height: 400,
                renderItem: (item) => h('div', {}, item.name)
            });
            list.mount(container);
        });

        const hasList = await page.evaluate(() => {
            return document.querySelector('.macui-virtual-list') !== null;
        });

        expect(hasList).toBe(true);
    });
});
