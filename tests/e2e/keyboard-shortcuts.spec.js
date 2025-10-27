// E2E tests for keyboard shortcuts (Ctrl/Cmd+1-9, Ctrl+W, Ctrl+N, Ctrl+Tab)
const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

test.describe('Keyboard Shortcuts for Window Tabs', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test.describe('Finder Keyboard Shortcuts', () => {
        test('Ctrl+1-9 switches to corresponding tab', async ({ page }) => {
            // Open Finder
            await page.getByRole('img', { name: 'Finder Icon' }).click();
            await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

            // Create 3 tabs total (1 already exists, create 2 more)
            const addButton = page.locator('#finder-tabs-container .wt-add');
            await addButton.click();
            await page.waitForTimeout(300);
            await addButton.click();
            await page.waitForTimeout(300);

            // Verify 3 tabs exist
            const tabs = page.locator('#finder-tabs-container .wt-tab');
            await expect(tabs).toHaveCount(3);

            // Press Ctrl+2 to switch to second tab
            await page.keyboard.press('Control+Digit2');
            await page.waitForTimeout(200);

            // Verify second tab is active
            const activeAfterCtrl2 = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return {
                    activeId: active?.instanceId,
                    isSecondActive: active?.instanceId === all[1]?.instanceId,
                };
            });

            expect(activeAfterCtrl2).not.toBeNull();
            expect(activeAfterCtrl2.isSecondActive).toBe(true);

            // Press Ctrl+1 to switch to first tab
            await page.keyboard.press('Control+Digit1');
            await page.waitForTimeout(200);

            // Verify first tab is active
            const activeAfterCtrl1 = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return {
                    activeId: active?.instanceId,
                    isFirstActive: active?.instanceId === all[0]?.instanceId,
                };
            });

            expect(activeAfterCtrl1).not.toBeNull();
            expect(activeAfterCtrl1.isFirstActive).toBe(true);

            // Press Ctrl+3 to switch to third tab
            await page.keyboard.press('Control+Digit3');
            await page.waitForTimeout(200);

            // Verify third tab is active
            const activeAfterCtrl3 = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return {
                    activeId: active?.instanceId,
                    isThirdActive: active?.instanceId === all[2]?.instanceId,
                };
            });

            expect(activeAfterCtrl3).not.toBeNull();
            expect(activeAfterCtrl3.isThirdActive).toBe(true);
        });

        test('Ctrl+W closes active tab and updates UI', async ({ page }) => {
            // Open Finder
            await page.getByRole('img', { name: 'Finder Icon' }).click();
            await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

            // Create 3 tabs
            const addButton = page.locator('#finder-tabs-container .wt-add');
            await addButton.click();
            await page.waitForTimeout(300);
            await addButton.click();
            await page.waitForTimeout(300);

            // Verify 3 tabs
            let tabs = page.locator('#finder-tabs-container .wt-tab');
            await expect(tabs).toHaveCount(3);

            // Get the active instance ID before closing
            const beforeClose = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                return {
                    count: window.FinderInstanceManager.getInstanceCount(),
                    activeId: active?.instanceId,
                };
            });

            expect(beforeClose.count).toBe(3);

            // Press Ctrl+W to close active tab
            await page.keyboard.press('Control+KeyW');
            await page.waitForTimeout(500);

            // Verify instance count decreased
            const afterClose = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                return {
                    count: window.FinderInstanceManager.getInstanceCount(),
                    activeId: window.FinderInstanceManager.getActiveInstance()?.instanceId,
                };
            });

            expect(afterClose.count).toBe(2);
            expect(afterClose.activeId).not.toBe(beforeClose.activeId);

            // Verify only 2 tabs in UI
            tabs = page.locator('#finder-tabs-container .wt-tab');
            await expect(tabs).toHaveCount(2);
        });

        test('Ctrl+N creates new tab', async ({ page }) => {
            // Open Finder
            await page.getByRole('img', { name: 'Finder Icon' }).click();
            await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

            // Verify 1 tab initially
            let tabs = page.locator('#finder-tabs-container .wt-tab');
            await expect(tabs).toHaveCount(1);

            // Press Ctrl+N to create new tab
            await page.keyboard.press('Control+KeyN');
            await page.waitForTimeout(300);

            // Verify 2 tabs now
            tabs = page.locator('#finder-tabs-container .wt-tab');
            await expect(tabs).toHaveCount(2);

            // Verify instance count
            const instanceCount = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return 0;
                return window.FinderInstanceManager.getInstanceCount();
            });

            expect(instanceCount).toBe(2);

            // Press Ctrl+N again
            await page.keyboard.press('Control+KeyN');
            await page.waitForTimeout(300);

            // Verify 3 tabs
            tabs = page.locator('#finder-tabs-container .wt-tab');
            await expect(tabs).toHaveCount(3);
        });

        test('Ctrl+Tab cycles to next tab', async ({ page }) => {
            // Open Finder
            await page.getByRole('img', { name: 'Finder Icon' }).click();
            await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

            // Create 3 tabs
            const addButton = page.locator('#finder-tabs-container .wt-add');
            await addButton.click();
            await page.waitForTimeout(300);
            await addButton.click();
            await page.waitForTimeout(300);

            // Switch to first tab
            const tabs = page.locator('#finder-tabs-container .wt-tab');
            await tabs.nth(0).click();
            await page.waitForTimeout(200);

            // Verify first tab is active
            const beforeCycle = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return {
                    activeIndex: all.findIndex(i => i.instanceId === active?.instanceId),
                };
            });

            expect(beforeCycle.activeIndex).toBe(0);

            // Press Ctrl+Tab to go to next
            await page.keyboard.press('Control+Tab');
            await page.waitForTimeout(300);

            // Verify second tab is active
            const afterFirstCycle = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return {
                    activeIndex: all.findIndex(i => i.instanceId === active?.instanceId),
                };
            });

            expect(afterFirstCycle.activeIndex).toBe(1);

            // Press Ctrl+Tab again
            await page.keyboard.press('Control+Tab');
            await page.waitForTimeout(300);

            // Verify third tab is active
            const afterSecondCycle = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return {
                    activeIndex: all.findIndex(i => i.instanceId === active?.instanceId),
                };
            });

            expect(afterSecondCycle.activeIndex).toBe(2);

            // Press Ctrl+Tab once more (should wrap to first)
            await page.keyboard.press('Control+Tab');
            await page.waitForTimeout(300);

            // Verify back to first tab
            const afterWrap = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return {
                    activeIndex: all.findIndex(i => i.instanceId === active?.instanceId),
                };
            });

            expect(afterWrap.activeIndex).toBe(0);
        });

        test('Ctrl+Shift+Tab cycles to previous tab', async ({ page }) => {
            // Open Finder
            await page.getByRole('img', { name: 'Finder Icon' }).click();
            await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

            // Create 3 tabs
            const addButton = page.locator('#finder-tabs-container .wt-add');
            await addButton.click();
            await page.waitForTimeout(300);
            await addButton.click();
            await page.waitForTimeout(300);

            // Third tab should be active (just created)
            const beforeCycle = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return {
                    activeIndex: all.findIndex(i => i.instanceId === active?.instanceId),
                };
            });

            expect(beforeCycle.activeIndex).toBe(2);

            // Press Ctrl+Shift+Tab to go to previous
            await page.keyboard.press('Control+Shift+Tab');
            await page.waitForTimeout(300);

            // Verify second tab is active
            const afterFirstCycle = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return {
                    activeIndex: all.findIndex(i => i.instanceId === active?.instanceId),
                };
            });

            expect(afterFirstCycle.activeIndex).toBe(1);

            // Press Ctrl+Shift+Tab again
            await page.keyboard.press('Control+Shift+Tab');
            await page.waitForTimeout(300);

            // Verify first tab is active
            const afterSecondCycle = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return {
                    activeIndex: all.findIndex(i => i.instanceId === active?.instanceId),
                };
            });

            expect(afterSecondCycle.activeIndex).toBe(0);

            // Press Ctrl+Shift+Tab once more (should wrap to last)
            await page.keyboard.press('Control+Shift+Tab');
            await page.waitForTimeout(300);

            // Verify back to third tab
            const afterWrap = await page.evaluate(() => {
                if (!window.FinderInstanceManager) return null;
                const active = window.FinderInstanceManager.getActiveInstance();
                const all = window.FinderInstanceManager.getAllInstances();
                return {
                    activeIndex: all.findIndex(i => i.instanceId === active?.instanceId),
                };
            });

            expect(afterWrap.activeIndex).toBe(2);
        });
    });
});
