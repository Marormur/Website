const { test, expect } = require('@playwright/test');

test.describe('MacUI Framework - Tooltip Component', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY);
    });

    test('Tooltip renders with content', async ({ page }) => {
        await page.evaluate(() => {
            const { Tooltip, Button } = window.MacUI;
            const container = document.createElement('div');
            container.id = 'test-container';
            document.body.appendChild(container);

            const tooltip = new Tooltip({
                content: 'This is a tooltip',
                placement: 'top',
                delay: 0,
                children: new Button({ label: 'Hover me' }).render(),
            });
            tooltip.mount(container);
        });

        const hasButton = await page.evaluate(() => {
            return document.querySelector('#test-container .macui-button') !== null;
        });

        expect(hasButton).toBe(true);
    });
});
