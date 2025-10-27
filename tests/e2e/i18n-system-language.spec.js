const { test, expect } = require('@playwright/test');
const { gotoHome, openAppleMenu } = require('./utils');

// shared helpers imported from ./utils

// System language should follow the browser locale when set to 'system'
test.describe('i18n: system language detection', () => {
    test.describe('supported locale -> uses that locale', () => {
        test.use({ locale: 'de-DE' });

        test('uses German when browser locale is de-DE', async ({ page, baseURL }) => {
            await gotoHome(page, baseURL);

            // Open Apple menu and verify the label of the settings entry is German
            await openAppleMenu(page);
            const menuItem = page.getByRole('menuitem', {
                name: 'Systemeinstellungen',
            });
            await expect(menuItem).toBeVisible({ timeout: 10000 });
        });
    });

    test.describe('unsupported locale -> falls back to English', () => {
        test.use({ locale: 'fr-FR' });

        test('falls back to English when browser locale is fr-FR', async ({ page, baseURL }) => {
            await gotoHome(page, baseURL);

            // Open Apple menu and verify the label of the settings entry is English
            await openAppleMenu(page);
            await expect(page.getByRole('menuitem', { name: 'System settings' })).toBeVisible();
        });
    });
});
