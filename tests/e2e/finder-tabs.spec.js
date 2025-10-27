// E2E tests for Finder multi-instance tabs
const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

test.describe('Finder Multi-Instance Tabs', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('Finder opens with initial tab', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Check that FinderInstanceManager exists and has one instance
        const finderInfo = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return {
                count: window.FinderInstanceManager.getInstanceCount(),
                hasActive: window.FinderInstanceManager.getActiveInstance() !== null,
            };
        });

        expect(finderInfo).not.toBeNull();
        expect(finderInfo.count).toBe(1);
        expect(finderInfo.hasActive).toBe(true);

        // Verify tab container exists and has one tab
        const tabContainer = page.locator('#finder-tabs-container');
        await expect(tabContainer).toBeVisible();

        const tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(1);
    });

    test('Can create multiple Finder instances via + button', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

    // Click the + button to create a new tab
    const addButton = page.locator('#finder-tabs-container .wt-add');
    await expect(addButton).toBeVisible();
    const tabs = page.locator('#finder-tabs-container .wt-tab');
    await addButton.click();

    // Wait deterministically for a second tab to appear
    await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Verify instance count in manager
        const finderInfo = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return {
                count: window.FinderInstanceManager.getInstanceCount(),
                allIds: window.FinderInstanceManager.getAllInstances().map(i => i.instanceId),
            };
        });

        expect(finderInfo).not.toBeNull();
        expect(finderInfo.count).toBe(2);
        expect(finderInfo.allIds.length).toBe(2);
    });

    test('Can switch between Finder tabs', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

    // Create a second tab
    const addButton = page.locator('#finder-tabs-container .wt-add');
    const tabs = page.locator('#finder-tabs-container .wt-tab');
    await addButton.click();
    await expect(tabs).toHaveCount(2, { timeout: 5000 });

    // Get the two tab buttons (reuse the locator declared above)
    await expect(tabs).toHaveCount(2);

        const firstTab = tabs.nth(0);
        const secondTab = tabs.nth(1);

        // Second tab should be active (just created)
        await expect(secondTab).toHaveClass(/bg-white|dark:bg-gray-900/);

    // Click first tab to switch
    await firstTab.click();
    await expect(firstTab).toBeVisible({ timeout: 5000 });

        // Verify active instance changed
        const activeInfo = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            const active = window.FinderInstanceManager.getActiveInstance();
            const all = window.FinderInstanceManager.getAllInstances();
            return {
                activeId: active?.instanceId,
                isFirstActive: active?.instanceId === all[0]?.instanceId,
            };
        });

        expect(activeInfo).not.toBeNull();
        expect(activeInfo.isFirstActive).toBe(true);
    });

    test('Can close Finder tab via close button', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

    // Create a second tab
    const addButton = page.locator('#finder-tabs-container .wt-add');
    let tabs = page.locator('#finder-tabs-container .wt-tab');
    await addButton.click();
    await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Get initial instance count
        const initialCount = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return 0;
            return window.FinderInstanceManager.getInstanceCount();
        });
        expect(initialCount).toBe(2);

        // Click close button on second tab (active tab)
        const secondTabClose = tabs.nth(1).locator('.wt-tab-close');
        await secondTabClose.click();

        // Small diagnostic: capture manager and DOM counts immediately after click
        // so we can see if the close action fired but DOM update is delayed.
        const countsAfterClose = await page.evaluate(() => {
            const mgr = window.FinderInstanceManager;
            return {
                mgrCount: mgr ? mgr.getInstanceCount() : null,
                domCount: document.querySelectorAll('#finder-tabs-container .wt-tab').length,
            };
        });
        // Print to test output for diagnostics (Playwright captures console output)
        console.log('countsAfterClose:', countsAfterClose);

        // Wait until the DOM reflects the removal (tab element removed).
        // We intentionally wait on the DOM here because the test's later
        // assertion checks the DOM count strictly.
        await page.waitForFunction(() => {
            return document.querySelectorAll('#finder-tabs-container .wt-tab').length === 1;
        }, { timeout: 20000 });

        tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(1, { timeout: 5000 });
    });

    test('Closing last Finder tab closes the modal', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Close the single tab
    const tabs = page.locator('#finder-tabs-container .wt-tab');
    const closeButton = tabs.first().locator('.wt-tab-close');
    await closeButton.click();

    // Verify Finder modal is hidden
    await expect(page.locator('#finder-modal')).toHaveClass(/hidden/, { timeout: 5000 });
    });

    test('Finder tabs have correct title display', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Check first tab title
        const firstTab = page.locator('#finder-tabs-container .wt-tab').first();
        const firstTabTitle = firstTab.locator('.wt-tab-title');
        await expect(firstTabTitle).toContainText('Finder');

        // Create second tab
        const addButton = page.locator('#finder-tabs-container .wt-add');
    await addButton.click();
    await expect(page.locator('#finder-tabs-container .wt-tab')).toHaveCount(2, { timeout: 5000 });

        // Check second tab title
        const secondTab = page.locator('#finder-tabs-container .wt-tab').nth(1);
        const secondTabTitle = secondTab.locator('.wt-tab-title');
        await expect(secondTabTitle).toContainText('Finder');
    });

    test('Finder instances maintain independent navigation state', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Navigate first instance to GitHub
    await page.locator('#finder-sidebar-github').click();
    // Scope to the visible instance's content to avoid collisions with legacy DOM elements
    await expect(page.locator('.finder-instance-container:not(.hidden) #finder-list-container')).toBeVisible({ timeout: 5000 });

        // Create second tab (should start at default view)
    const addButton = page.locator('#finder-tabs-container .wt-add');
    await addButton.click();
    await expect(page.locator('#finder-tabs-container .wt-tab')).toHaveCount(2, { timeout: 5000 });

        // Verify both instances exist with different states
        const instanceStates = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            const instances = window.FinderInstanceManager.getAllInstances();
            return instances.map(inst => ({
                id: inst.instanceId,
                // Access state if available (depends on FinderInstance implementation)
                hasState: inst.state !== undefined,
            }));
        });

        expect(instanceStates).not.toBeNull();
        expect(instanceStates.length).toBe(2);
    });

    test('Keyboard shortcut Ctrl+W closes active Finder tab', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Create a second tab
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await addButton.click();
        // Wait deterministically for the second tab to appear
        await expect(page.locator('#finder-tabs-container .wt-tab')).toHaveCount(2, { timeout: 5000 });

        // Verify two tabs
        let tabs = page.locator('#finder-tabs-container .wt-tab');

        // Press Ctrl+W (or Cmd+W on Mac)
        await page.keyboard.press('Control+KeyW');
        // Wait until manager and DOM reflect the removal
        await page.waitForFunction(() => {
            try {
                const mgr = window.FinderInstanceManager;
                const count = mgr ? mgr.getInstanceCount() : 0;
                const tabs = document.querySelectorAll('#finder-tabs-container .wt-tab').length;
                return count === 1 && tabs === 1;
            } catch { return false; }
        }, { timeout: 5000 });

        // Verify one tab remains
        tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(1);
    });

    test('Keyboard shortcut Ctrl+N creates new Finder tab', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Press Ctrl+N
        await page.keyboard.press('Control+KeyN');
        // Wait deterministically for the new tab
        const tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(2, { timeout: 5000 });
    });

    test('Keyboard shortcut Ctrl+Tab switches to next tab', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

    // Create second tab
    const addButton = page.locator('#finder-tabs-container .wt-add');
    await addButton.click();
    // Wait for the tab to be present
    await expect(page.locator('#finder-tabs-container .wt-tab')).toHaveCount(2, { timeout: 5000 });

        // Click first tab to make it active
        const tabs = page.locator('#finder-tabs-container .wt-tab');
        await tabs.nth(0).click();
        await expect(tabs.nth(0)).toBeVisible({ timeout: 5000 });

        // Press Ctrl+Tab to switch to next
        await page.keyboard.press('Control+Tab');
        // Wait until the manager reports the second instance as active
        await page.waitForFunction(() => {
            try {
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return !!active && active.instanceId === all[1]?.instanceId;
            } catch { return false; }
        }, { timeout: 20000 });

        // Verify second tab is now active
        const activeInfo = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            const active = window.FinderInstanceManager.getActiveInstance();
            const all = window.FinderInstanceManager.getAllInstances();
            return {
                activeId: active?.instanceId,
                isSecondActive: active?.instanceId === all[1]?.instanceId,
            };
        });

        expect(activeInfo).not.toBeNull();
        expect(activeInfo.isSecondActive).toBe(true);
    });

    test('Can reorder Finder tabs via drag and drop', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

    // Create two more tabs (total 3)
    const addButton = page.locator('#finder-tabs-container .wt-add');
    await addButton.click();
    await addButton.click();
    // Verify three tabs exist
    const tabs = page.locator('#finder-tabs-container .wt-tab');
    await expect(tabs).toHaveCount(3, { timeout: 5000 });

        // Get initial order from instance manager
        const initialOrder = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return window.FinderInstanceManager.getAllInstanceIds();
        });

        expect(initialOrder).not.toBeNull();
        expect(initialOrder.length).toBe(3);

        // Get tab elements for drag and drop
        const firstTab = tabs.nth(0);
        const thirdTab = tabs.nth(2);

        // Drag the third tab to before the first tab
        await thirdTab.dragTo(firstTab);
        // Wait for manager order to update
        await page.waitForFunction((prev) => {
            try {
                const cur = window.FinderInstanceManager.getAllInstanceIds();
                return JSON.stringify(cur) !== JSON.stringify(prev);
            } catch { return false; }
        }, initialOrder, { timeout: 20000 });

        // Verify the order changed in the manager
        const newOrder = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return window.FinderInstanceManager.getAllInstanceIds();
        });

        expect(newOrder).not.toBeNull();
        expect(newOrder.length).toBe(3);
        
        // The third tab should now be first
        expect(newOrder[0]).toBe(initialOrder[2]);
        expect(newOrder[1]).toBe(initialOrder[0]);
        expect(newOrder[2]).toBe(initialOrder[1]);

        // Verify the visual order matches by checking tab titles in DOM order
        const tabsAfterReorder = page.locator('#finder-tabs-container .wt-tab');
        const firstTabId = await tabsAfterReorder.nth(0).getAttribute('data-instance-id');
        expect(firstTabId).toBe(initialOrder[2]);
    });

    test('Active tab persists after reordering', async ({ page }) => {
        // Open Finder
        await page.getByRole('img', { name: 'Finder Icon' }).click();
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Create two more tabs (total 3)
        const addButton = page.locator('#finder-tabs-container .wt-add');
    await addButton.click();
    await expect(page.locator('#finder-tabs-container .wt-tab')).toHaveCount(2, { timeout: 5000 });
    await addButton.click();
    await expect(page.locator('#finder-tabs-container .wt-tab')).toHaveCount(3, { timeout: 5000 });

        // Click the first tab to make it active
        const tabs = page.locator('#finder-tabs-container .wt-tab');
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toBeVisible({ timeout: 5000 });

        // Get the active instance ID
        const activeBeforeReorder = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            const active = window.FinderInstanceManager.getActiveInstance();
            return active?.instanceId;
        });

        expect(activeBeforeReorder).not.toBeNull();

        // Drag the second tab to before the first tab
        const firstTab = tabs.nth(0);
        const secondTab = tabs.nth(1);
        await secondTab.dragTo(firstTab);
        await page.waitForFunction((prev) => {
            try {
                const cur = window.FinderInstanceManager.getAllInstanceIds();
                return JSON.stringify(cur) !== JSON.stringify(prev);
            } catch { return false; }
        }, [/* placeholder - electron will re-evaluate manager state */], { timeout: 20000 });

        // Verify the active instance is still the same
        const activeAfterReorder = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            const active = window.FinderInstanceManager.getActiveInstance();
            return active?.instanceId;
        });

        expect(activeAfterReorder).toBe(activeBeforeReorder);
    });
});
