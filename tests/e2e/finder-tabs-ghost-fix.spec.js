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
        await addButton.click();

        // Verify 3 tabs exist (accept either DOM or manager update)
        let tabs = page.locator('#finder-tabs-container .wt-tab');
        await page.waitForFunction(() => {
            try {
                const tabsNow = document.querySelectorAll('#finder-tabs-container .wt-tab').length;
                const mgr = window.FinderInstanceManager;
                const count = mgr ? (mgr.getInstanceCount ? mgr.getInstanceCount() : mgr.getAllInstances().length) : 0;
                return tabsNow === 3 || count === 3;
            }
            catch { return false; }
        }, [], { timeout: 20000 });
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

        // Wait for UI and manager to reflect removal (reduce flakiness)
        await page.waitForFunction(() => {
            try {
                const tabs = document.querySelectorAll('#finder-tabs-container .wt-tab').length;
                const mgr = window.FinderInstanceManager;
                const count = mgr ? (mgr.getInstanceCount ? mgr.getInstanceCount() : mgr.getAllInstances().length) : 0;
                return tabs === 2 || count === 2;
            } catch { return false; }
        }, [], { timeout: 20000 });

        // Verify only 2 tabs remain
        tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(2);

        // Verify the correct tabs remain (Finder and Finder 3, NOT Finder 2)
        const tabTitlesAfter = await tabs.allTextContents();
        expect(tabTitlesAfter).toHaveLength(2);
        expect(tabTitlesAfter.some(t => t.includes('Finder') && !t.includes('2') && !t.includes('3'))).toBe(true);
        expect(tabTitlesAfter.some(t => t.includes('Finder 3'))).toBe(true);
        expect(tabTitlesAfter.some(t => t.includes('Finder 2'))).toBe(false);

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
        expect(instanceInfo.ids).not.toContain('finder-2');
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

        // Verify modal is hidden (accept either DOM hide or manager state)
        await page.waitForFunction(() => {
            try {
                const modalHidden = document.querySelector('#finder-modal')?.classList.contains('hidden');
                const mgr = window.FinderInstanceManager;
                const count = mgr ? (mgr.getInstanceCount ? mgr.getInstanceCount() : mgr.getAllInstances().length) : 0;
                return modalHidden || count === 0;
            } catch { return false; }
        }, [], { timeout: 5000 });
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
        await page.waitForFunction(() => {
            try {
                const tabs = document.querySelectorAll('#finder-tabs-container .wt-tab').length;
                const mgr = window.FinderInstanceManager;
                const count = mgr ? (mgr.getInstanceCount ? mgr.getInstanceCount() : mgr.getAllInstances().length) : 0;
                return tabs === 2 || count === 2;
            } catch { return false; }
        }, [], { timeout: 5000 });
        await expect(page.locator('#finder-tabs-container .wt-tab')).toHaveCount(2);

        // Close second tab
        let tabs = page.locator('#finder-tabs-container .wt-tab');
        const secondTabClose = tabs.nth(1).locator('.wt-tab-close');
        await secondTabClose.click();

        // Wait until DOM and manager reflect removal
        await page.waitForFunction(() => {
            try {
                const tabs = document.querySelectorAll('#finder-tabs-container .wt-tab').length;
                const mgr = window.FinderInstanceManager;
                const count = mgr ? (mgr.getInstanceCount ? mgr.getInstanceCount() : mgr.getAllInstances().length) : 0;
                return tabs === 1 || count === 1;
            } catch { return false; }
        }, [], { timeout: 20000 });

        // Verify no "not found" warnings
        const notFoundWarnings = warnings.filter(w => w.includes('not found'));
        expect(notFoundWarnings).toHaveLength(0);

        // Try to interact with remaining tab (should not cause warnings)
    tabs = page.locator('#finder-tabs-container .wt-tab');
    await tabs.first().click();
    // small wait to allow any console warnings to appear
    await page.waitForFunction(() => true, [], { timeout: 200 });

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
        await addButton.click();

        // Verify 3 tabs, third is active (accept DOM or manager)
        let tabs = page.locator('#finder-tabs-container .wt-tab');
        await page.waitForFunction(() => {
            try {
                const tabsNow = document.querySelectorAll('#finder-tabs-container .wt-tab').length;
                const mgr = window.FinderInstanceManager;
                const count = mgr ? (mgr.getInstanceCount ? mgr.getInstanceCount() : mgr.getAllInstances().length) : 0;
                return tabsNow === 3 || count === 3;
            } catch { return false; }
        }, [], { timeout: 5000 });
        await expect(tabs).toHaveCount(3);

        const activeBeforeClose = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return window.FinderInstanceManager.getActiveInstance()?.instanceId;
        });
        expect(activeBeforeClose).toBe('finder-3');

        // Close the active tab (third)
        const thirdTabClose = tabs.nth(2).locator('.wt-tab-close');
        await thirdTabClose.click();

        // Wait for manager and DOM to reflect removal
        await page.waitForFunction(() => {
            try {
                const tabs = document.querySelectorAll('#finder-tabs-container .wt-tab').length;
                const mgr = window.FinderInstanceManager;
                const count = mgr ? (mgr.getInstanceCount ? mgr.getInstanceCount() : mgr.getAllInstances().length) : 0;
                return tabs === 2 || count === 2;
            } catch { return false; }
        }, [], { timeout: 20000 });

        // Verify 2 tabs remain
        tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(2);

        // Verify a new active tab is assigned
        const activeAfterClose = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return window.FinderInstanceManager.getActiveInstance()?.instanceId;
        });
        expect(activeAfterClose).not.toBeNull();
        expect(activeAfterClose).not.toBe('finder-3');
        expect(['finder-1', 'finder-2']).toContain(activeAfterClose);
    });
});
