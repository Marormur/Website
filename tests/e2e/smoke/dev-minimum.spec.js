const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    dismissWelcomeDialogIfPresent,
    openFinderWindow,
    getFinderAddTabButton,
    getFinderTabs,
    waitForSessionSaved,
    getSavedSessionPayload,
} = require('../utils');

// Dev-Minimum smoke suite:
// Keep these checks behavior-focused and resilient to layout refactors.
test.describe('Dev Minimum Smoke @smoke', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);
    });

    test('app shell starts and dock is visible', async ({ page }) => {
        await expect(page.locator('#dock .dock-tray .dock-item').first()).toBeVisible();
        await expect(page.locator('#apple-menu-trigger')).toBeVisible();
    });

    test('finder opens and can add one tab', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await expect(finderWindow).toBeVisible();

        const addButton = await getFinderAddTabButton(page, finderWindow);
        const tabs = await getFinderTabs(page, finderWindow);
        const initial = await tabs.count();

        await addButton.click({ force: true });
        await expect(tabs).toHaveCount(initial + 1, { timeout: 8000 });
    });

    test('text editor opens from window manager', async ({ page }) => {
        const windowId = await page.evaluate(() => {
            if (window.WindowManager?.open) {
                window.WindowManager.open('text-modal');
            }

            const windows = window.WindowRegistry?.getWindowsByType?.('text-editor') || [];
            return windows[windows.length - 1]?.id || null;
        });

        expect(windowId).toBeTruthy();

        const editorWindow = page.locator(`#${windowId}`).first();
        await expect(editorWindow).toBeVisible({ timeout: 10000 });
        await expect(editorWindow.locator('textarea').first()).toBeVisible();
    });

    test('settings window opens', async ({ page }) => {
        await page.evaluate(() => {
            if (window.WindowManager?.open) {
                window.WindowManager.open('settings-modal');
            }
        });

        await expect(page.locator('#settings-modal')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('#settings-modal [data-settings-page]').first()).toBeVisible();
    });

    test('session snapshot is persisted', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click({ force: true });

        await waitForSessionSaved(page, 8000);
        const payload = await getSavedSessionPayload(page);
        expect(payload.key).not.toBeNull();
        expect(payload.raw).toBeTruthy();
    });
});
