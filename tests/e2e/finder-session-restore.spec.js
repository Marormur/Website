// E2E test to ensure the previously selected Finder tab is restored after reload
const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('./utils');

test.describe('Finder active tab persistence across reload', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('restores the same active Finder tab after page reload', async ({ page }) => {
        // Open Finder and create two instances
        await clickDockIcon(page, 'Finder Icon');
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        const addButton = page.locator('#finder-tabs-container .wt-add');
        await expect(addButton).toBeVisible();
        await addButton.click(); // Now we have at least two instances

        // Switch to the first tab explicitly
        const tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs.nth(0)).toBeVisible();
        await tabs.nth(0).click();

        // Capture active instance id before reload
        const beforeId = await page.evaluate(() => {
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
        const finderModal = page.locator('#finder-modal');
        const cls = await finderModal.getAttribute('class');
        if (!cls || /hidden/.test(cls)) {
            await clickDockIcon(page, 'Finder Icon');
        }

        // Check that the same instance is active after restore
        const afterId = await page.evaluate(() => {
            return window.FinderInstanceManager?.getActiveInstance()?.instanceId || null;
        });

        expect(afterId).toBe(beforeId);
    });
});
 
