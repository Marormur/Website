const { test, expect } = require('@playwright/test');

test.describe('MacUI Framework - Table Component', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY);
    });

    test('Table component is available', async ({ page }) => {
        const hasTable = await page.evaluate(() => {
            return typeof window.MacUI.Table !== 'undefined';
        });

        expect(hasTable).toBe(true);
    });

    test('Table renders with data', async ({ page }) => {
        await page.evaluate(() => {
            const { Table } = window.MacUI;
            const container = document.createElement('div');
            container.id = 'test-container';
            document.body.appendChild(container);

            const table = new Table({
                columns: [
                    { key: 'name', label: 'Name', sortable: true },
                    { key: 'email', label: 'Email' },
                ],
                data: [
                    { name: 'John', email: 'john@example.com' },
                    { name: 'Jane', email: 'jane@example.com' },
                ],
            });
            table.mount(container);
        });

        const hasTable = await page.evaluate(() => {
            return document.querySelector('.macui-table') !== null;
        });

        expect(hasTable).toBe(true);
    });
});
