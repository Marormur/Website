// E2E test for ghost tab fix - ensures tab UI updates when instances are destroyed
const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

test.describe('Finder Tabs - Ghost Tab Fix', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('Closing middle tab removes it from DOM (no ghost tabs)', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Create two more tabs (total 3)
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await addButton.click();
        await page.waitForTimeout(300);
        await addButton.click();
        await page.waitForTimeout(300);

        // Verify 3 tabs exist
        let tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(3);

        // Get the tab titles before closing
        const tabTitlesBefore = await tabs.allTextContents();
        expect(tabTitlesBefore).toHaveLength(3);
        expect(tabTitlesBefore.some(t => t.includes('Finder'))).toBe(true);
        expect(tabTitlesBefore.some(t => t.includes('Finder 2'))).toBe(true);
        expect(tabTitlesBefore.some(t => t.includes('Finder 3'))).toBe(true);

        // Close the MIDDLE tab (Finder 2)
        const middleTabClose = tabs.nth(1).locator('.wt-tab-close');
        await middleTabClose.click();

        // Wait for UI to update
        await page.waitForTimeout(300);

        // Verify only 2 tabs remain
        tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(2);

        // Verify the correct tabs remain (Finder and Finder 3, NOT Finder 2)
        const tabTitlesAfter = await tabs.allTextContents();
        expect(tabTitlesAfter).toHaveLength(2);
        expect(tabTitlesAfter.some(t => t.includes('Finder') && !t.includes('2') && !t.includes('3'))).toBe(true);
        expect(tabTitlesAfter.some(t => t.includes('Finder 3'))).toBe(true);
        expect(tabTitlesAfter.some(t => t.includes('Finder 2'))).toBe(false); // Middle tab should be gone

        // Verify instance manager state matches UI
        const instanceInfo = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            const instances = window.FinderInstanceManager.getAllInstances();
            return {
                count: instances.length,
                ids: instances.map(i => i.instanceId),
            };
        });

        expect(instanceInfo).not.toBeNull();
        expect(instanceInfo.count).toBe(2);
        expect(instanceInfo.ids).toContain('finder-1');
        expect(instanceInfo.ids).not.toContain('finder-2'); // Instance should be destroyed
        expect(instanceInfo.ids).toContain('finder-3');
    });

    test('Closing last remaining tab closes modal', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Verify 1 tab exists
        let tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(1);

        // Close the only tab
        const closeButton = tabs.first().locator('.wt-tab-close');
        await closeButton.click();
        await page.waitForTimeout(300);

        // Verify modal is hidden
        await expect(page.locator('#finder-modal')).toHaveClass(/hidden/);

        // Verify no instances remain
        const instanceCount = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return -1;
            return window.FinderInstanceManager.getInstanceCount();
        });
        expect(instanceCount).toBe(0);
    });

    test('No "Instance not found" warnings after close', async ({ page }) => {
        // Listen for console warnings
        const warnings = [];
        page.on('console', msg => {
            if (msg.type() === 'warning') {
                warnings.push(msg.text());
            }
        });

        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Create second tab
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await addButton.click();
        await page.waitForTimeout(300);

        // Close second tab
        let tabs = page.locator('#finder-tabs-container .wt-tab');
        const secondTabClose = tabs.nth(1).locator('.wt-tab-close');
        await secondTabClose.click();
        await page.waitForTimeout(300);

        // Verify no "not found" warnings
        const notFoundWarnings = warnings.filter(w => w.includes('not found'));
        expect(notFoundWarnings).toHaveLength(0);

        // Try to interact with remaining tab (should not cause warnings)
        tabs = page.locator('#finder-tabs-container .wt-tab');
        await tabs.first().click();
        await page.waitForTimeout(200);

        // Still no warnings
        const notFoundWarningsAfter = warnings.filter(w => w.includes('not found'));
        expect(notFoundWarningsAfter).toHaveLength(0);
    });

    test('Active tab is reassigned after closing active tab', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Create two more tabs
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await addButton.click();
        await page.waitForTimeout(300);
        await addButton.click();
        await page.waitForTimeout(300);

        // Verify 3 tabs, third is active
        let tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(3);

        const activeBeforeClose = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return window.FinderInstanceManager.getActiveInstance()?.instanceId;
        });
        expect(activeBeforeClose).toBe('finder-3');

        // Close the active tab (third)
        const thirdTabClose = tabs.nth(2).locator('.wt-tab-close');
        await thirdTabClose.click();
        await page.waitForTimeout(300);

        // Verify 2 tabs remain
        tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(2);

        // Verify a new active tab is assigned (should be the last remaining)
        const activeAfterClose = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return window.FinderInstanceManager.getActiveInstance()?.instanceId;
        });
        expect(activeAfterClose).not.toBeNull();
        expect(activeAfterClose).not.toBe('finder-3'); // Old active is gone
        expect(['finder-1', 'finder-2']).toContain(activeAfterClose); // One of the remaining tabs
    });
});
