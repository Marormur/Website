const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

async function dismissWelcomeIfVisible(page) {
    const continueButton = page.locator('#welcome-dialog-continue');
    if (await continueButton.isVisible().catch(() => false)) {
        await continueButton.click({ force: true });
    }
}

test.describe('Core App Smoke', () => {
    test('desktop shell bootstraps and core APIs are available', async ({ page, baseURL }) => {
        await page.goto(`${baseURL}/index.html`, {
            waitUntil: 'load',
            timeout: 20000,
        });

        await waitForAppReady(page, 20000);
        await dismissWelcomeIfVisible(page);

        const dockItems = page.locator('#dock .dock-item');
        const count = await dockItems.count();
        expect(count).toBeGreaterThan(3);

        const appState = await page.evaluate(() => ({
            appReady: window.__APP_READY === true,
            hasWindowManager: !!window.WindowManager,
            hasWindowRegistry: !!window.__WindowRegistry,
            hasFinderWindow: !!window.FinderWindow,
        }));

        expect(appState.appReady).toBe(true);
        expect(appState.hasWindowManager).toBe(true);
        expect(appState.hasWindowRegistry).toBe(true);
        expect(appState.hasFinderWindow).toBe(true);
    });
});
