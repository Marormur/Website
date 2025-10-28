// E2E tests for Text Editor multi-instance tabs
const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

/**
 * Scope: Validate Window Tabs in Texteditor modal
 * - Modal opens and has initial tab
 * - + adds a new instance/tab
 * - Clicking tabs switches active instance
 * - Close button removes a tab
 * - Keyboard: Ctrl+N / Ctrl+W / Ctrl+Tab work (scoped to manager via integration)
 */

test.describe('Text Editor Multi-Instance Tabs', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);

        // Open Texteditor via Dock item
        const textDockItem = page.locator('.dock-item[data-window-id="text-modal"]');
        await textDockItem.click();
        await expect(page.locator('#text-modal')).toBeVisible();

        // Wait for editor container to be ready (content is rendered by TextEditorSystem)
        await expect(page.locator('#text-editor-container')).toBeVisible();
    });

    test('Text Editor opens with initial tab', async ({ page }) => {
        const tabs = page.locator('#text-editor-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(1);

        const managerInfo = await page.evaluate(() => {
            return {
                hasMgr: !!window.TextEditorInstanceManager,
                count: window.TextEditorInstanceManager?.getInstanceCount?.() || 0,
                active: !!window.TextEditorInstanceManager?.getActiveInstance?.(),
            };
        });
        expect(managerInfo.hasMgr).toBe(true);
        expect(managerInfo.count).toBe(1);
        expect(managerInfo.active).toBe(true);
    });

    test('Can create and switch between Text Editor tabs', async ({ page }) => {
        const addButton = page.locator('#text-editor-tabs-container .wt-add');
        const tabs = page.locator('#text-editor-tabs-container .wt-tab');

        await addButton.click();
        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Just created tab should be active
        await expect(tabs.nth(1)).toHaveClass(/bg-white|dark:bg-gray-900/);

        // Switch back to first tab
        await tabs.nth(0).click();
        await expect(tabs.nth(0)).toBeVisible();

        const isFirstActive = await page.evaluate(() => {
            const mgr = window.TextEditorInstanceManager;
            if (!mgr) return null;
            const active = mgr.getActiveInstance();
            const all = mgr.getAllInstances();
            return !!active && active.instanceId === all[0]?.instanceId;
        });
        expect(isFirstActive).toBe(true);
    });

    test('Close button removes a Text Editor tab', async ({ page }) => {
        const addButton = page.locator('#text-editor-tabs-container .wt-add');
        let tabs = page.locator('#text-editor-tabs-container .wt-tab');

        await addButton.click();
        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        const closeBtn = tabs.nth(1).locator('.wt-tab-close');
        await closeBtn.click();

        await expect(page.locator('#text-editor-tabs-container .wt-tab')).toHaveCount(1, {
            timeout: 5000,
        });
    });

    test('Keyboard shortcuts: Ctrl+N / Ctrl+W / Ctrl+Tab', async ({ page }) => {
        const tabs = page.locator('#text-editor-tabs-container .wt-tab');

        // Ctrl+N: add tab
        await page.keyboard.press('Control+KeyN');
        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Ensure first tab is active, then Ctrl+Tab should switch to next
        await tabs.nth(0).click();
        await page.keyboard.press('Control+Tab');
        await page.waitForFunction(() => {
            try {
                const mgr = window.TextEditorInstanceManager;
                const all = mgr.getAllInstances();
                const active = mgr.getActiveInstance();
                return !!active && active.instanceId === all[1]?.instanceId;
            } catch {
                return false;
            }
        });

        // Ctrl+W: closes active tab
        await page.keyboard.press('Control+KeyW');
        await expect(tabs).toHaveCount(1, { timeout: 5000 });
    });

    test('Can reorder Text Editor tabs via drag and drop', async ({ page }) => {
        const addButton = page.locator('#text-editor-tabs-container .wt-add');
        const tabs = page.locator('#text-editor-tabs-container .wt-tab');

        // Create two more tabs (total 3)
        await addButton.click();
        await addButton.click();
        await expect(tabs).toHaveCount(3, { timeout: 5000 });

        // Capture initial order
        const initialOrder = await page.evaluate(() => {
            const mgr = window.TextEditorInstanceManager;
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
                    const cur = window.TextEditorInstanceManager.getAllInstanceIds();
                    return JSON.stringify(cur) !== JSON.stringify(prev);
                } catch {
                    return false;
                }
            },
            initialOrder,
            { timeout: 20000 }
        );

        const newOrder = await page.evaluate(() => {
            const mgr = window.TextEditorInstanceManager;
            return mgr ? mgr.getAllInstanceIds() : null;
        });
        expect(newOrder).not.toBeNull();
        expect(newOrder.length).toBe(3);
        expect(newOrder[0]).toBe(initialOrder[2]);

        // Check DOM order matches
        const firstTabId = await page
            .locator('#text-editor-tabs-container .wt-tab')
            .nth(0)
            .getAttribute('data-instance-id');
        expect(firstTabId).toBe(initialOrder[2]);
    });
});

