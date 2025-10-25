const { test, expect } = require('@playwright/test');

// Force a known browser locale for deterministic 'system' behavior
// We'll use en-US so 'system' should show English labels
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
    // Wait for dropdown to appear; retry once if it didn't open on first click
    try {
        await page.waitForSelector('#apple-menu-dropdown', { state: 'visible', timeout: 1500 });
    } catch {
        await trigger.click();
        await page.waitForSelector('#apple-menu-dropdown', { state: 'visible', timeout: 5000 });
    }
}

async function closeAppleMenuIfOpen(page) {
    // Click on the desktop area to close the dropdown if it's open
    // Use a specific visible element instead of body
    const desktop = page.locator('#desktop');
    if (await desktop.isVisible()) {
        await desktop.click({ position: { x: 10, y: 10 }, force: true });
    }
}

async function openSettingsViaAppleMenu(page, label) {
    await openAppleMenu(page);
    const menuItem = page.getByRole('menuitem', { name: label });
    await menuItem.waitFor({ state: 'visible', timeout: 10000 });
    await menuItem.click();
    await expect(page.locator('#settings-modal')).toBeVisible({ timeout: 10000 });
    // Wait for settings sidebar buttons to be rendered
    await page.waitForSelector('[data-settings-page]', { state: 'visible', timeout: 10000 });
}

function languageRadio(page, value) {
    return page.locator(`input[name="language-preference"][value="${value}"]`);
}

// Checks that the Apple menu settings label matches expected text
async function expectAppleMenuSettingsLabel(page, expectedLabel) {
    await closeAppleMenuIfOpen(page);
    await openAppleMenu(page);
    const menuItem = page.getByRole('menuitem', { name: expectedLabel });
    await menuItem.waitFor({ state: 'visible', timeout: 10000 });
    await expect(menuItem).toBeVisible();
}

// Scenario: With system=en-US, Apple menu should show English. After switching to German,
// Apple menu should show German, then switching back to system should show English again.

test('Apple menu labels update when toggling language', async ({ page, baseURL }) => {
    await gotoHome(page, baseURL);

    // Initially with system=en-US
    await expectAppleMenuSettingsLabel(page, 'System settings');

    // Open settings
    await openSettingsViaAppleMenu(page, 'System settings');

    // Go to Language section (button text depends on current language)
    const languageButton = page.getByRole('button', { name: /Language|Sprache/ });
    await languageButton.waitFor({ state: 'visible', timeout: 10000 });
    await languageButton.click();

    // Switch to German
    await languageRadio(page, 'de').check();

    // Apple menu should now show German label
    await expectAppleMenuSettingsLabel(page, 'Systemeinstellungen');

    // Switch back to "System" (which is en-US here)
    await openSettingsViaAppleMenu(page, 'Systemeinstellungen');
    const sprachButton = page.getByRole('button', { name: /Sprache|Language/ });
    await sprachButton.waitFor({ state: 'visible', timeout: 10000 });
    await sprachButton.click();
    await languageRadio(page, 'system').check();

    // Expect English again
    await expectAppleMenuSettingsLabel(page, 'System settings');
});
