const { test, expect } = require('@playwright/test');
const {
    gotoHome,
    openAppleMenu,
    closeAppleMenuIfOpen,
    openSettingsViaAppleMenu,
    languageRadio,
    expectAppleMenuSettingsLabel,
} = require('./utils');

// Force a known browser locale for deterministic 'system' behavior
// We'll use en-US so 'system' should show English labels
test.use({ locale: 'en-US' });

// helpers moved to ./utils

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
