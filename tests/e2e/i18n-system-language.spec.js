const { test, expect } = require('@playwright/test');

// Open the Apple menu and return the locator for the menu
async function openAppleMenu(page) {
    const trigger = page.locator('#apple-menu-trigger');
    await trigger.click();
    return page.locator('#apple-menu-dropdown');
}

// Helper: navigate to index using configured baseURL
async function gotoHome(page, baseURL) {
    // Keep consistent with existing tests that use baseURL + '/index.html'
    await page.goto(baseURL + '/index.html');
}

// System language should follow the browser locale when set to 'system'
test.describe('i18n: system language detection', () => {
    test.describe('supported locale -> uses that locale', () => {
        test.use({ locale: 'de-DE' });

        test('uses German when browser locale is de-DE', async ({ page, baseURL }) => {
            await gotoHome(page, baseURL);

            // Open Apple menu and verify the label of the settings entry is German
            await openAppleMenu(page);
            await expect(
                page.getByRole('menuitem', { name: 'Systemeinstellungen' })
            ).toBeVisible();
        });
    });

    test.describe('unsupported locale -> falls back to English', () => {
        test.use({ locale: 'fr-FR' });

        test('falls back to English when browser locale is fr-FR', async ({ page, baseURL }) => {
            await gotoHome(page, baseURL);

            // Open Apple menu and verify the label of the settings entry is English
            await openAppleMenu(page);
            await expect(
                page.getByRole('menuitem', { name: 'System settings' })
            ).toBeVisible();
        });
    });
});
