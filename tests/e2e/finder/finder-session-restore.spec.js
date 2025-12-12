// E2E test to ensure the previously selected Finder tab is restored after reload
const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    openFinderWindow,
    waitForFinderReady,
    getFinderAddTabButton,
    getFinderTabs,
} = require('../utils');

test.describe('Finder active tab persistence across reload', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('restores the same active Finder tab after page reload', async ({ page }) => {
        // Open Finder and create two instances
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const addButton = await getFinderAddTabButton(page, finderWindow);
        await expect(addButton).toBeVisible();
        await addButton.click(); // Now we have at least two instances

        // Switch to the first tab explicitly
        const tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs.nth(0)).toBeVisible();
        await tabs.nth(0).click();

        // Capture active instance id before reload (use WindowRegistry when available)
        const beforeId = await page.evaluate(() => {
            const reg = window.WindowRegistry;
            if (reg && typeof reg.getActiveWindow === 'function')
                return reg.getActiveWindow()?.windowId || null;
            return window.FinderInstanceManager?.getActiveInstance()?.instanceId || null;
        });
        expect(beforeId).toBeTruthy();

        // Force save to ensure current active state is persisted
        await page.evaluate(() => {
            window.SessionManager?.saveAll?.({ immediate: true });
        });

        // Reload the page; auto-save on active change should have persisted selection
        await page.reload();
        await waitForAppReady(page);

        // If Finder isn't open, open it
        const isActive = await page.evaluate(() => {
            const reg = window.WindowRegistry;
            if (reg && typeof reg.getAllWindows === 'function')
                return (reg.getAllWindows('finder') || []).length > 0;
            return !!window.FinderInstanceManager?.getActiveInstance?.();
        });
        if (!isActive) {
            await openFinderWindow(page);
            await waitForFinderReady(page);
        }

        // Check that the same instance is active after restore
        const afterId = await page.evaluate(() => {
            const reg = window.WindowRegistry;
            if (reg && typeof reg.getActiveWindow === 'function')
                return reg.getActiveWindow()?.windowId || null;
            return window.FinderInstanceManager?.getActiveInstance()?.instanceId || null;
        });

        expect(afterId).toBe(beforeId);
    });
});
