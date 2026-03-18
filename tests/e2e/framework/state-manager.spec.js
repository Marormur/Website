const { test, expect } = require('@playwright/test');

test.describe('MacUI Framework - State Manager', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY);
    });

    test('StateManager can get and set state', async ({ page }) => {
        const state = await page.evaluate(() => {
            const { StateManager } = window.MacUI;

            const manager = new StateManager({
                initialState: { count: 0, user: null },
            });

            manager.setState({ count: 5 });
            return manager.getState();
        });

        expect(state.count).toBe(5);
    });

    test('StateManager selectors work', async ({ page }) => {
        const result = await page.evaluate(() => {
            const { StateManager } = window.MacUI;

            const manager = new StateManager({
                initialState: { count: 10 },
            });

            const selector = manager.createSelector(state => state.count * 2);
            return selector();
        });

        expect(result).toBe(20);
    });
});
