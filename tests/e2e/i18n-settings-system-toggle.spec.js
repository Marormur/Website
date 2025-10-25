const { test, expect } = require("@playwright/test");
const {
    gotoHome,
    openAppleMenu,
    openSettingsViaAppleMenu,
    languageRadio,
} = require("./utils");

// Force a known browser locale so 'system' is deterministic in this test
test.use({ locale: "en-US" });

function languageHeadingLocator(page) {
    // This heading text changes with language:
    // de: "Sprache"; en: "Language"
    return page.locator(
        '#settings-language h2[data-i18n="settingsPage.language.title"]',
    );
}

// This test verifies that selecting 'system' uses the browser locale and that switching
// away and back updates the UI accordingly.
// Flow:
// 1) Page loads with system preference (default) -> English heading expected
// 2) Select 'Deutsch' -> German heading expected
// 3) Select 'System' -> English heading expected again

test("Language settings: switch to German, back to System (en-US)", async ({
    page,
    baseURL,
}) => {
    await gotoHome(page, baseURL);
    // Use shared helper to open settings via Apple menu
    await openSettingsViaAppleMenu(page, "System settings");

    // Navigate to the "Language" section
    const languageButton = page.getByRole("button", {
        name: /Language|Sprache/,
    });
    await languageButton.waitFor({ state: "visible", timeout: 10000 });
    await languageButton.click();

    const heading = languageHeadingLocator(page);

    // With locale en-US and default preference 'system', UI should be English
    await expect(heading).toHaveText("Language");

    // Switch to German
    await languageRadio(page, "de").check();
    await expect(heading).toHaveText("Sprache");

    // Switch back to System -> should become English again due to en-US browser locale
    await languageRadio(page, "system").check();
    await expect(heading).toHaveText("Language");
});
