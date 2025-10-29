// E2E: Desktop shortcuts (currently empty by design)
const { test, expect } = require('@playwright/test');

test.describe('Desktop shortcuts', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
    });

    test('Desktop area exists but contains no shortcuts by default', async ({ page }) => {
        // Desktop icons container should exist
        const desktopContainer = page.locator('#desktop-icons');
        await expect(desktopContainer).toBeVisible();

        // Should contain no shortcuts (Photos was removed; accessible via Dock/Launchpad)
        const shortcuts = page.locator('#desktop-icons .desktop-shortcut');
        await expect(shortcuts).toHaveCount(0);
    });
});
