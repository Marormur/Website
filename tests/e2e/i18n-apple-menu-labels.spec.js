const { test, expect } = require('@playwright/test');

// Force a known browser locale for deterministic 'system' behavior
// We'll use en-US so 'system' should show English labels
test.use({ locale: 'en-US' });

async function gotoHome(page, baseURL) {
    await page.goto(baseURL + '/index.html');
}

async function openAppleMenu(page) {
    const trigger = page.locator('#apple-menu-trigger');
    await trigger.click();
}

async function closeAppleMenuIfOpen(page) {
    // Click somewhere else to close the dropdown if it's open
    await page.locator('body').click();
}

async function openSettingsViaAppleMenu(page, label) {
    await openAppleMenu(page);
    await page.getByRole('menuitem', { name: label }).click();
    await expect(page.locator('#settings-modal')).toBeVisible();
}

function languageRadio(page, value) {
    return page.locator(`input[name="language-preference"][value="${value}"]`);
}

// Checks that the Apple menu settings label matches expected text
async function expectAppleMenuSettingsLabel(page, expectedLabel) {
    await closeAppleMenuIfOpen(page);
    await openAppleMenu(page);
    await expect(page.getByRole('menuitem', { name: expectedLabel })).toBeVisible();
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
    await page.getByRole('button', { name: /Language|Sprache/ }).click();

    // Switch to German
    await languageRadio(page, 'de').check();

    // Apple menu should now show German label
    await expectAppleMenuSettingsLabel(page, 'Systemeinstellungen');

    // Switch back to "System" (which is en-US here)
    await openSettingsViaAppleMenu(page, 'Systemeinstellungen');
    await page.getByRole('button', { name: /Sprache|Language/ }).click();
    await languageRadio(page, 'system').check();

    // Expect English again
    await expectAppleMenuSettingsLabel(page, 'System settings');
});
