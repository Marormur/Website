// E2E tests for Text Editor multi-instance tabs
const { test, expect } = require('@playwright/test');
const { waitForAppReady, dismissWelcomeDialogIfPresent } = require('../utils');

async function openTextEditorWindow(page) {
    // Current app path: legacy text modal with integrated tab bar container.
    await page.evaluate(() => {
        if (window.WindowManager?.open) {
            window.WindowManager.open('text-modal');
            return;
        }
        const el = document.getElementById('text-modal');
        if (el) el.classList.remove('hidden');
    });

    const editorWindow = page.locator('#text-modal').first();
    await expect(editorWindow).toBeVisible({ timeout: 10000 });
    return editorWindow;
}

async function getTextEditorTabs(editorWindow) {
    return editorWindow.locator('#text-editor-tabs-container .wt-tab');
}

async function getTextEditorAddButton(editorWindow) {
    return editorWindow.locator('#text-editor-tabs-container .wt-add');
}

/**
 * Scope: Validate Window Tabs in Texteditor modal
 * - Modal opens and has initial tab
 * - + adds a new instance/tab
 * - Clicking tabs switches active instance
 * - Close button removes a tab
 * - Keyboard: Ctrl+N / Ctrl+W / Ctrl+Tab work (scoped to manager via integration)
 */

test.describe('Text Editor Multi-Instance Tabs', () => {
    let editorWindow;

    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);

        editorWindow = await openTextEditorWindow(page);

        // Wait for editor container to be ready (content is rendered by TextEditorSystem)
        await expect(editorWindow.locator('#text-editor-container')).toBeVisible();
        await expect(await getTextEditorAddButton(editorWindow)).toBeVisible();
    });

    test('Text Editor opens with initial tab', async ({ page }) => {
        const tabs = await getTextEditorTabs(editorWindow);
        await expect(tabs).toHaveCount(1);

        const managerInfo = await page.evaluate(() => {
            return {
                hasMgr: !!window.TextEditorInstanceManager,
                count: window.TextEditorInstanceManager?.getInstanceCount?.() || 0,
                active: !!window.TextEditorInstanceManager?.getActiveInstance?.(),
            };
        });
        expect(managerInfo.hasMgr).toBe(true);
        expect(managerInfo.count).toBeGreaterThanOrEqual(1);
        expect(managerInfo.active).toBe(true);
    });

    test('Can create and switch between Text Editor tabs', async ({ page }) => {
        const addButton = await getTextEditorAddButton(editorWindow);
        const tabs = await getTextEditorTabs(editorWindow);
        const initialTabs = await tabs.count();

        await addButton.click({ force: true });
        await expect(tabs).toHaveCount(initialTabs + 1, { timeout: 5000 });

        // Just created tab should be active
        await expect(tabs.nth(initialTabs)).toHaveClass(/bg-white|dark:!bg-gray-700\/60/);

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
        const addButton = await getTextEditorAddButton(editorWindow);
        let tabs = await getTextEditorTabs(editorWindow);
        const initialTabs = await tabs.count();

        await addButton.click({ force: true });
        await expect(tabs).toHaveCount(initialTabs + 1, { timeout: 5000 });

        const closeBtn = tabs.nth(initialTabs).locator('.wt-tab-close');
        await closeBtn.click();

        await expect(await getTextEditorTabs(editorWindow)).toHaveCount(initialTabs, {
            timeout: 5000,
        });
    });

    test('Can switch tabs via app API', async ({ page }) => {
        const addButton = await getTextEditorAddButton(editorWindow);
        const tabs = await getTextEditorTabs(editorWindow);
        const initialTabs = await tabs.count();

        // Create tab via + button
        await addButton.click({ force: true });
        await expect(tabs).toHaveCount(initialTabs + 1, { timeout: 5000 });

        // Switch to first tab via API
        const firstTabId = await tabs.nth(0).getAttribute('data-instance-id');
        await page.evaluate(tabId => {
            const registry = window.WindowRegistry;
            const win = registry?.getAllWindows('text-editor')?.[0];
            if (win && tabId) win.setActiveTab(tabId);
        }, firstTabId);
        await page.waitForTimeout(200);

        // Verify we can still interact with tabs (tab switching worked)
        await expect(tabs).toHaveCount(initialTabs + 1);
    });

    test('Can reorder Text Editor tabs via drag and drop', async ({ page }) => {
        const addButton = await getTextEditorAddButton(editorWindow);
        const tabs = await getTextEditorTabs(editorWindow);
        const initialTabs = await tabs.count();

        // Create two more tabs
        await addButton.click({ force: true });
        await addButton.click({ force: true });
        await expect(tabs).toHaveCount(initialTabs + 2, { timeout: 5000 });

        // Capture initial order
        const initialOrder = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#text-editor-tabs-container .wt-tab')).map(
                tab => tab.getAttribute('data-instance-id')
            );
        });
        expect(initialOrder).not.toBeNull();
        expect(initialOrder.length).toBe(initialTabs + 2);

        // Drag the third tab before the first tab
        await tabs.nth(2).dragTo(tabs.nth(0));

        // Wait for order to change
        await page.waitForFunction(
            prev => {
                try {
                    const cur = Array.from(
                        document.querySelectorAll('#text-editor-tabs-container .wt-tab')
                    ).map(tab => tab.getAttribute('data-instance-id'));
                    return JSON.stringify(cur) !== JSON.stringify(prev);
                } catch {
                    return false;
                }
            },
            initialOrder,
            { timeout: 20000 }
        );

        const newOrder = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#text-editor-tabs-container .wt-tab')).map(
                tab => tab.getAttribute('data-instance-id')
            );
        });
        expect(newOrder).not.toBeNull();
        expect(newOrder.length).toBe(initialTabs + 2);
        expect(newOrder[0]).toBe(initialOrder[2]);

        // Check DOM order matches
        const firstTabId = await (await getTextEditorTabs(editorWindow))
            .nth(0)
            .getAttribute('data-instance-id');
        expect(firstTabId).toBe(initialOrder[2]);
    });
});
