const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    dismissWelcomeDialogIfPresent,
    openFinderWindow,
    openSettingsWindow,
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

        const editorWindow = page.locator(`#${windowId}:visible`).first();
        await expect(editorWindow).toBeVisible({ timeout: 10000 });
        await expect(editorWindow.locator('textarea').first()).toBeVisible();
    });

    test('settings window opens', async ({ page }) => {
        const settingsWindow = await openSettingsWindow(page);

        await expect(settingsWindow).toBeVisible({ timeout: 10000 });
        await expect(settingsWindow.locator('[data-settings-page]').first()).toBeVisible();
    });

    test('menu registry renders menubar for multiple app contexts', async ({ page }) => {
        const result = await page.evaluate(() => {
            const registry = window.MenuRegistry;
            const menuSystem = window.MenuSystem;

            if (!registry || typeof registry.getMenusForAppType !== 'function') {
                return { error: 'MenuRegistry unavailable' };
            }

            if (!menuSystem || typeof menuSystem.renderApplicationMenu !== 'function') {
                return { error: 'MenuSystem unavailable' };
            }

            const originalGetMenusForAppType = registry.getMenusForAppType.bind(registry);

            const captureRender = modalId => {
                let calledWith = null;
                registry.getMenusForAppType = appType => {
                    calledWith = appType;
                    return originalGetMenusForAppType(appType);
                };

                menuSystem.renderApplicationMenu(modalId);

                const labels = Array.from(
                    document.querySelectorAll('#menubar-links .menubar-item')
                ).map(element => element.textContent?.trim());

                registry.getMenusForAppType = originalGetMenusForAppType;
                return { calledWith, labels };
            };

            const finder = captureRender('projects-modal');
            const textEditor = captureRender('text-modal');
            const settings = captureRender('settings-modal');

            menuSystem.renderApplicationMenu('projects-modal');

            return {
                finder,
                textEditor,
                settings,
                registeredApps: registry.debug?.() || [],
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.registeredApps).toEqual(
            expect.arrayContaining(['finder', 'text-editor', 'settings'])
        );

        const expectOneOf = (labels, expectedVariants) => {
            const matched = expectedVariants.some(variant =>
                variant.every(label => labels.includes(label))
            );
            expect(matched).toBe(true);
        };

        expect(result.finder?.calledWith).toBe('finder');
        expectOneOf(result.finder?.labels || [], [
            ['Ablage', 'Fenster', 'Hilfe'],
            ['File', 'Window', 'Help'],
        ]);

        expect(result.textEditor?.calledWith).toBe('text-editor');
        expectOneOf(result.textEditor?.labels || [], [
            ['Ablage', 'Bearbeiten', 'Darstellung', 'Fenster', 'Hilfe'],
            ['File', 'Edit', 'View', 'Window', 'Help'],
        ]);

        expect(result.settings?.calledWith).toBe('settings');
        expectOneOf(result.settings?.labels || [], [
            ['Ablage', 'Fenster', 'Hilfe'],
            ['File', 'Window', 'Help'],
        ]);
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
