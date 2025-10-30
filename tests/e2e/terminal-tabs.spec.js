// E2E tests for Terminal multi-instance tabs
const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

/**
 * Scope: Validate Window Tabs in Terminal modal
 * - Modal opens and has initial tab
 * - + adds a new instance/tab
 * - Clicking tabs switches active instance
 * - Close button removes a tab
 * - Keyboard: Ctrl+N / Ctrl+W / Ctrl+Tab work
 */

test.describe('Terminal Multi-Instance Tabs', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);

        // Open Terminal via Dock item to avoid alt-text mismatch
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();
        await expect(page.locator('#terminal-modal')).toBeVisible();

        // Wait for terminal input to ensure initial instance rendered
        await page.waitForSelector('.terminal-input', { timeout: 5000 });
    });

    test('Terminal opens with initial tab', async ({ page }) => {
        const tabs = page.locator('#terminal-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(1);

        const managerInfo = await page.evaluate(() => {
            return {
                hasMgr: !!window.TerminalInstanceManager,
                count: window.TerminalInstanceManager?.getInstanceCount?.() || 0,
                active: !!window.TerminalInstanceManager?.getActiveInstance?.(),
            };
        });
        expect(managerInfo.hasMgr).toBe(true);
        expect(managerInfo.count).toBe(1);
        expect(managerInfo.active).toBe(true);
    });

    test('Can create and switch between Terminal tabs', async ({ page }) => {
        const addButton = page.locator('#terminal-tabs-container .wt-add');
        const tabs = page.locator('#terminal-tabs-container .wt-tab');

        await addButton.click();
        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Just created tab should be active (index 1)
        await expect(tabs.nth(1)).toHaveClass(/bg-white|dark:bg-gray-900/);

        // Switch to first tab
        await tabs.nth(0).click();
        await expect(tabs.nth(0)).toBeVisible();

        const isFirstActive = await page.evaluate(() => {
            const mgr = window.TerminalInstanceManager;
            if (!mgr) return null;
            const active = mgr.getActiveInstance();
            const all = mgr.getAllInstances();
            return !!active && active.instanceId === all[0]?.instanceId;
        });
        expect(isFirstActive).toBe(true);
    });

    test('Close button removes a Terminal tab', async ({ page }) => {
        const addButton = page.locator('#terminal-tabs-container .wt-add');
        let tabs = page.locator('#terminal-tabs-container .wt-tab');

        await addButton.click();
        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        const closeBtn = tabs.nth(1).locator('.wt-tab-close');
        await closeBtn.click();

        await expect(page.locator('#terminal-tabs-container .wt-tab')).toHaveCount(1, {
            timeout: 5000,
        });
    });

    test('Keyboard shortcuts: Ctrl+N / Ctrl+W / Ctrl+Tab', async ({ page }) => {
        const tabs = page.locator('#terminal-tabs-container .wt-tab');

        // Ctrl+N: add tab
        await page.keyboard.press('Control+KeyN');
        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Ensure first tab is active, then Ctrl+Tab should switch to next
        await tabs.nth(0).click();
        await page.keyboard.press('Control+Tab');
        await page.waitForFunction(() => {
            try {
                const mgr = window.TerminalInstanceManager;
                const all = mgr.getAllInstances();
                const active = mgr.getActiveInstance();
                return !!active && active.instanceId === all[1]?.instanceId;
            } catch {
                return false;
            }
        });

        // Ctrl+W: closes active tab (now index 1)
        await page.keyboard.press('Control+KeyW');
        await expect(tabs).toHaveCount(1, { timeout: 5000 });
    });

    test('Can reorder Terminal tabs via drag and drop', async ({ page }) => {
        const addButton = page.locator('#terminal-tabs-container .wt-add');
        const tabs = page.locator('#terminal-tabs-container .wt-tab');

        // Create two more tabs (total 3)
        await addButton.click();
        await addButton.click();
        await expect(tabs).toHaveCount(3, { timeout: 5000 });

        // Capture initial order
        const initialOrder = await page.evaluate(() => {
            const mgr = window.TerminalInstanceManager;
            return mgr ? mgr.getAllInstanceIds() : null;
        });
        expect(initialOrder).not.toBeNull();
        expect(initialOrder.length).toBe(3);

        // Drag the third tab before the first tab
        await tabs.nth(2).dragTo(tabs.nth(0));

        // Wait for order to change
        await page.waitForFunction(
            prev => {
                try {
                    const cur = window.TerminalInstanceManager.getAllInstanceIds();
                    return JSON.stringify(cur) !== JSON.stringify(prev);
                } catch {
                    return false;
                }
            },
            initialOrder,
            { timeout: 20000 }
        );

        const newOrder = await page.evaluate(() => {
            const mgr = window.TerminalInstanceManager;
            return mgr ? mgr.getAllInstanceIds() : null;
        });
        expect(newOrder).not.toBeNull();
        expect(newOrder.length).toBe(3);
        expect(newOrder[0]).toBe(initialOrder[2]);

        // Check DOM order matches
        const firstTabId = await page
            .locator('#terminal-tabs-container .wt-tab')
            .nth(0)
            .getAttribute('data-instance-id');
        expect(firstTabId).toBe(initialOrder[2]);
    });

    test('Closing last Terminal tab closes the modal', async ({ page }) => {
        // Terminal should be open with one tab
        const tabs = page.locator('#terminal-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(1);

        // Close the last tab
        const closeBtn = tabs.nth(0).locator('.wt-tab-close');
        await closeBtn.click();

        // Modal should be hidden
        await expect(page.locator('#terminal-modal')).toBeHidden({ timeout: 5000 });

        // Verify no instances remain
        const managerInfo = await page.evaluate(() => {
            const mgr = window.TerminalInstanceManager;
            return {
                count: mgr ? mgr.getInstanceCount?.() || mgr.getAllInstances().length : -1,
            };
        });
        expect(managerInfo.count).toBe(0);
    });

    test('Reopening Terminal after closing all tabs creates a new instance', async ({ page }) => {
        // Close the initial tab
        const tabs = page.locator('#terminal-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(1);
        const closeBtn = tabs.nth(0).locator('.wt-tab-close');
        await closeBtn.click();

        // Modal should be hidden
        await expect(page.locator('#terminal-modal')).toBeHidden({ timeout: 5000 });

        // Reopen Terminal via Dock
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();
        await expect(page.locator('#terminal-modal')).toBeVisible();

        // Should have a new tab
        await expect(page.locator('#terminal-tabs-container .wt-tab')).toHaveCount(1, {
            timeout: 5000,
        });

        // Verify instance was created
        const managerInfo = await page.evaluate(() => {
            const mgr = window.TerminalInstanceManager;
            return {
                count: mgr ? mgr.getInstanceCount?.() || mgr.getAllInstances().length : -1,
            };
        });
        expect(managerInfo.count).toBe(1);
    });
});
