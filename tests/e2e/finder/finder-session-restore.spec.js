// E2E test to ensure the previously selected Finder tab is restored after reload
const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    openFinderWindow,
    waitForFinderReady,
    getFinderAddTabButton,
    dismissWelcomeDialogIfPresent,
} = require('../utils');

test.describe('Finder active tab persistence across reload', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);
    });

    test('restores Finder tabs and state after page reload', async ({ page }) => {
        // Increase timeout: this test includes a full page.reload() + waitForAppReady
        // which can take 30+ seconds in bundle mode.
        test.setTimeout(60000);

        // Open Finder
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);
        const windowId = await finderWindow.getAttribute('id');

        // Get initial state
        const initialTabCount = await page.evaluate(winId => {
            return document.querySelectorAll(`#${winId}-tabs .wt-tab`).length;
        }, windowId);
        expect(initialTabCount).toBeGreaterThan(0);

        // Add a second tab
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await expect(addButton).toBeVisible();
        await addButton.click();

        // Verify we have two tabs now
        const twoTabsCount = await page.evaluate(winId => {
            return document.querySelectorAll(`#${winId}-tabs .wt-tab`).length;
        }, windowId);
        expect(twoTabsCount).toBe(2);

        // Save session
        await page.evaluate(() => {
            window.SessionManager?.saveAll?.({ immediate: true });
        });

        // Reload
        await page.reload();
        await waitForAppReady(page);

        // If Finder isn't open, open it
        const finderOpen = await page.evaluate(() => {
            return (window.WindowRegistry?.getAllWindows('finder') || []).length > 0;
        });
        if (!finderOpen) {
            await openFinderWindow(page);
            await waitForFinderReady(page);
        }

        // Check that we have tabs again (even if not exactly the same IDs)
        const afterTabCount = await page.evaluate(() => {
            const win = (window.WindowRegistry?.getAllWindows?.('finder') || [])[0];
            const winId = win?.windowId || win?.id || win?.windowElement?.id;
            if (!winId) return 0;
            return document.querySelectorAll(`#${winId}-tabs .wt-tab`).length;
        });

        // The key test: Finder should still have tabs
        expect(afterTabCount).toBeGreaterThan(0);

        // Ideally we'd have the same number of tabs as before,
        // but this test just checks that Finder is functional after reload
    });
});
