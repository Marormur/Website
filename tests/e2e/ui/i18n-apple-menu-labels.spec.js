const { test } = require('@playwright/test');
const {
    gotoHome,
    dismissWelcomeDialogIfPresent,
    openSettingsViaAppleMenu,
    languageRadio,
    expectAppleMenuSettingsLabel,
} = require('../utils');

// Force a known browser locale for deterministic 'system' behavior
// We'll use en-US so 'system' should show English labels
test.use({ locale: 'en-US' });

// helpers moved to ./utils

// Scenario: With system=en-US, Apple menu should show English. After switching to German,
// Apple menu should show German, then switching back to system should show English again.

test('Apple menu labels update when toggling language', async ({ page, baseURL }) => {
    await gotoHome(page, baseURL);
    await dismissWelcomeDialogIfPresent(page);

    const openLanguageSectionIfAvailable = async settingsWindow => {
        const sectionButton = settingsWindow
            .getByRole('button', {
                name: /Language|Sprache/,
            })
            .first();

        if (
            (await sectionButton.count()) > 0 &&
            (await sectionButton.isVisible().catch(() => false))
        ) {
            await sectionButton.click();
        }
    };

    // Initially with system=en-US
    await expectAppleMenuSettingsLabel(page, 'System settings');

    // Open settings
    const englishSettingsWindow = await openSettingsViaAppleMenu(page, 'System settings');
    await openLanguageSectionIfAvailable(englishSettingsWindow);

    // Switch to German
    await languageRadio(page, 'de').check();

    // Apple menu should now show German label
    await expectAppleMenuSettingsLabel(page, 'Systemeinstellungen');

    // Switch back to "System" (which is en-US here)
    const germanSettingsWindow = await openSettingsViaAppleMenu(page, 'Systemeinstellungen');
    await openLanguageSectionIfAvailable(germanSettingsWindow);
    await languageRadio(page, 'system').check();

    // Expect English again
    await expectAppleMenuSettingsLabel(page, 'System settings');
});
