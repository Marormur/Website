// End-to-end tests for menubar switching logic between Finder and Texteditor
const { test, expect } = require('@playwright/test');
const {
    gotoHome,
    waitForAppReady,
    dismissWelcomeDialogIfPresent,
    openFinderWindow,
    waitForFinderReady,
    clickDockIcon,
    expectMenuButton,
    expectMenuItem,
    openSettingsViaAppleMenu,
} = require('../utils');

test.describe('Menubar switches with active window (de-DE)', () => {
    test.use({ locale: 'de-DE' });

    test.beforeEach(async ({ page, baseURL }) => {
        await gotoHome(page, baseURL);
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);
    });

    test('Finder menus appear when Finder is active', async ({ page }) => {
        // Open Finder via helper and ensure it's ready
        const finderWindow = await openFinderWindow(page);
        await waitForFinderReady(page);

        // Program label becomes "Finder" (de-DE: "Sucher")
        const finderButton = page.getByRole('button', { name: /Finder|Sucher/i });
        await finderButton.waitFor({ state: 'visible', timeout: 10000 });
        await expect(finderButton).toBeVisible({ timeout: 10000 });

        // Finder menubar sections
        await expectMenuButton(page, 'Ablage');
        await expectMenuButton(page, 'Fenster');
        await expectMenuButton(page, 'Hilfe');

        // Verify Finder-specific menu items in Ablage (de-DE: "Sucher" instead of "Finder")
        await expectMenuItem(page, 'Ablage', /Neues (Finder|Sucher)-Fenster/);
        await expectMenuItem(page, 'Ablage', /Sucher neu laden/);
        await expectMenuItem(page, 'Ablage', 'Fenster schließen');
    });

    test('Switch to Texteditor and back to Finder updates menubar', async ({ page }) => {
        // Open Texteditor (use stable window id)
        await clickDockIcon(page, 'text-modal');
        const textEditorButton = page.getByRole('button', {
            name: 'Texteditor',
        });
        await textEditorButton.waitFor({ state: 'visible', timeout: 10000 });
        await expect(textEditorButton).toBeVisible({ timeout: 10000 });

        // Texteditor menubar sections
        await expectMenuButton(page, 'Ablage');
        await expectMenuButton(page, 'Bearbeiten');
        await expectMenuButton(page, 'Darstellung');
        await expectMenuButton(page, 'Fenster');
        await expectMenuButton(page, 'Hilfe');

        // Open Finder too (via helper)
        const finderWindow = await openFinderWindow(page);
        await waitForFinderReady(page);

        await page.waitForFunction(
            () => {
                const activeWindow = window.WindowRegistry?.getActiveWindow?.();
                if (!activeWindow || !('type' in activeWindow)) return false;
                return activeWindow.type === 'finder';
            },
            { timeout: 10000 }
        );

        // Program label switches to Finder (de-DE: "Sucher")
        await expect(page.getByRole('button', { name: /Finder|Sucher/i })).toBeVisible();

        // Back to Finder sections
        await expectMenuButton(page, 'Ablage');
        await expectMenuButton(page, 'Fenster');
        await expectMenuButton(page, 'Hilfe');
    });

    test('Switch from Terminal to Settings updates menubar context correctly', async ({ page }) => {
        await clickDockIcon(page, 'terminal-modal');

        const terminalButton = page.locator('#program-label').filter({ hasText: /Terminal/i });
        await expect(terminalButton).toBeVisible({ timeout: 10000 });
        await expectMenuButton(page, 'Bearbeiten');

        await openSettingsViaAppleMenu(page, 'Systemeinstellungen');

        const settingsButton = page
            .locator('#program-label')
            .filter({ hasText: /Systemeinstellungen|Settings/i });
        await expect(settingsButton).toBeVisible({ timeout: 10000 });

        // Settings menu should be active, not the Terminal menu.
        await expectMenuButton(page, 'Ablage');
        await expectMenuButton(page, 'Fenster');
        await expectMenuButton(page, 'Hilfe');
    });
});
