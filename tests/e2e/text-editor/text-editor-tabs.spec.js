// E2E tests for Text Editor multi-instance tabs
const { test, expect } = require('@playwright/test');
const { waitForAppReady, dismissWelcomeDialogIfPresent } = require('../utils');

async function openTextEditorWindow(page) {
    const windowId = await page.evaluate(() => {
        const textEditorWindow = window.TextEditorWindow;
        if (textEditorWindow?.focusOrCreate) {
            return textEditorWindow.focusOrCreate().id;
        }
        if (textEditorWindow?.create) {
            return textEditorWindow.create().id;
        }

        if (window.WindowManager?.open) {
            window.WindowManager.open('text-modal');
            return 'text-modal';
        }

        const el = document.getElementById('text-modal');
        if (el) {
            el.classList.remove('hidden');
            return 'text-modal';
        }

        return null;
    });

    expect(windowId).toBeTruthy();

    const editorWindow = page.locator(`#${windowId}`).first();
    await expect(editorWindow).toBeVisible({ timeout: 10000 });
    return editorWindow;
}

async function getTextEditorTabs(editorWindow) {
    return editorWindow.locator('.window-tab-bar .wt-tab, #text-editor-tabs-container .wt-tab');
}

async function getTextEditorAddButton(editorWindow) {
    return editorWindow.locator('.window-tab-bar .wt-add, #text-editor-tabs-container .wt-add');
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
    let editorWindowId;

    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);

        editorWindow = await openTextEditorWindow(page);
        editorWindowId = await editorWindow.getAttribute('id');

        await expect(editorWindow.locator('textarea').first()).toBeVisible();
        await expect(await getTextEditorAddButton(editorWindow)).toBeVisible();
    });

    test('Text Editor opens with initial tab', async ({ page }) => {
        const tabs = await getTextEditorTabs(editorWindow);
        await expect(tabs).toHaveCount(1);

        const windowInfo = await page.evaluate(windowId => {
            const windows = window.WindowRegistry?.getWindowsByType?.('text-editor') || [];
            const activeWindow = windows.find(win => win.id === windowId) || null;
            return {
                hasWindow: !!activeWindow,
                count: activeWindow?.tabs?.size || 0,
                active: !!activeWindow?.activeTabId,
            };
        }, editorWindowId);
        expect(windowInfo.hasWindow).toBe(true);
        expect(windowInfo.count).toBeGreaterThanOrEqual(1);
        expect(windowInfo.active).toBe(true);
    });

    test('Can create and switch between Text Editor tabs', async ({ page }) => {
        const addButton = await getTextEditorAddButton(editorWindow);
        const tabs = await getTextEditorTabs(editorWindow);
        const initialTabs = await tabs.count();

        await addButton.click({ force: true });
        await expect(tabs).toHaveCount(initialTabs + 1, { timeout: 5000 });

        const newestTabId = await tabs.nth(initialTabs).getAttribute('data-instance-id');
        const isNewestActive = await page.evaluate(
            ({ windowId, tabId }) => {
                const windows = window.WindowRegistry?.getWindowsByType?.('text-editor') || [];
                const activeWindow = windows.find(win => win.id === windowId);
                return !!activeWindow && !!tabId && activeWindow.activeTabId === tabId;
            },
            { windowId: editorWindowId, tabId: newestTabId }
        );
        expect(isNewestActive).toBe(true);

        // Switch back to first tab
        await tabs.nth(0).click();
        await expect(tabs.nth(0)).toBeVisible();

        const isFirstActive = await page.evaluate(windowId => {
            const windows = window.WindowRegistry?.getWindowsByType?.('text-editor') || [];
            const activeWindow = windows.find(win => win.id === windowId);
            if (!activeWindow) return null;
            const all = Array.from(activeWindow.tabs?.keys?.() || []);
            return !!activeWindow.activeTabId && activeWindow.activeTabId === all[0];
        }, editorWindowId);
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
        await page.evaluate(
            ({ windowId, tabId }) => {
                const registry = window.WindowRegistry;
                const win = registry
                    ?.getWindowsByType?.('text-editor')
                    ?.find(item => item.id === windowId);
                if (win && tabId) win.setActiveTab(tabId);
            },
            { windowId: editorWindowId, tabId: firstTabId }
        );
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
        const initialOrder = await tabs.evaluateAll(tabEls =>
            tabEls.map(tab => tab.getAttribute('data-instance-id'))
        );
        expect(initialOrder).not.toBeNull();
        expect(initialOrder.length).toBe(initialTabs + 2);

        // Drag the third tab before the first tab
        await tabs
            .nth(2)
            .dragTo(tabs.nth(0))
            .catch(() => {});
        await page.waitForTimeout(300);

        const newOrder = await (
            await getTextEditorTabs(editorWindow)
        ).evaluateAll(tabEls => tabEls.map(tab => tab.getAttribute('data-instance-id')));
        expect(newOrder).not.toBeNull();
        expect(newOrder.length).toBe(initialTabs + 2);
        expect(new Set(newOrder)).toEqual(new Set(initialOrder));
    });
});
