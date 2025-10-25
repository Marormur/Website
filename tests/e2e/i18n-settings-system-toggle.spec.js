const { test, expect } = require('@playwright/test');

// Force a known browser locale so 'system' is deterministic in this test
test.use({ locale: 'en-US' });

async function gotoHome(page, baseURL) {
    await page.goto(baseURL + '/index.html');
    await page.waitForLoadState('load');
    await page.waitForSelector('#dock .dock-tray .dock-item', { timeout: 10000 });
}

async function openAppleMenu(page) {
    const trigger = page.locator('#apple-menu-trigger');
    await trigger.waitFor({ state: 'visible', timeout: 10000 });
    await trigger.click();
    try {
        await page.waitForSelector('#apple-menu-dropdown', { state: 'visible', timeout: 1500 });
    } catch {
        await trigger.click();
        await page.waitForSelector('#apple-menu-dropdown', { state: 'visible', timeout: 5000 });
    }
}

async function openSettings(page) {
    await openAppleMenu(page);
    // Use role by name to be robust against attribute structure
    const label = 'System settings';
    const menuItem = page.getByRole('menuitem', { name: label });
    await menuItem.waitFor({ state: 'visible', timeout: 10000 });
    await menuItem.click();
    // Settings modal should be visible
    await expect(page.locator('#settings-modal')).toBeVisible({ timeout: 10000 });
    // Wait for settings sidebar buttons to be rendered
    await page.waitForSelector('[data-settings-page]', { state: 'visible', timeout: 10000 });
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
    const languageButton = page.getByRole('button', { name: /Language|Sprache/ });
    await languageButton.waitFor({ state: 'visible', timeout: 10000 });
    await languageButton.click();

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
