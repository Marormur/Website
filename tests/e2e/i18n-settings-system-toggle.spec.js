const { test, expect } = require('@playwright/test');

// Force a known browser locale so 'system' is deterministic in this test
test.use({ locale: 'en-US' });

async function gotoHome(page, baseURL) {
    await page.goto(baseURL + '/index.html');
}

async function openAppleMenu(page) {
    await page.locator('#apple-menu-trigger').click();
}

async function openSettings(page) {
    await openAppleMenu(page);
    // Use role by name to be robust against attribute structure
    const label = 'System settings';
    await page.getByRole('menuitem', { name: label }).click();
    // Settings modal should be visible
    await expect(page.locator('#settings-modal')).toBeVisible();
}

function languageHeadingLocator(page) {
    // This heading text changes with language:
    // de: "Sprache"; en: "Language"
    return page.locator('#settings-language h2[data-i18n="settingsPage.language.title"]');
}

function languageRadio(page, value) {
    return page.locator(`input[name="language-preference"][value="${value}"]`);
}

// This test verifies that selecting 'system' uses the browser locale and that switching
// away and back updates the UI accordingly.
// Flow:
// 1) Page loads with system preference (default) -> English heading expected
// 2) Select 'Deutsch' -> German heading expected
// 3) Select 'System' -> English heading expected again

test('Language settings: switch to German, back to System (en-US)', async ({ page, baseURL }) => {
    await gotoHome(page, baseURL);
    await openSettings(page);

    // Navigate to the "Language" section
    await page.getByRole('button', { name: /Language|Sprache/ }).click();

    const heading = languageHeadingLocator(page);

    // With locale en-US and default preference 'system', UI should be English
    await expect(heading).toHaveText('Language');

    // Switch to German
    await languageRadio(page, 'de').check();
    await expect(heading).toHaveText('Sprache');

    // Switch back to System -> should become English again due to en-US browser locale
    await languageRadio(page, 'system').check();
    await expect(heading).toHaveText('Language');
});
