const { test, expect } = require('@playwright/test');
const { gotoHome, waitForAppReady } = require('../utils');

test.describe('UI mode auto detection', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('uiModePreference', 'auto');
        });
    });

    test('switches to mobile on a phone-like viewport without coarse pointer', async ({
        page,
        baseURL,
    }) => {
        await page.setViewportSize({ width: 440, height: 956 });
        await gotoHome(page, baseURL);
        await waitForAppReady(page);

        await expect
            .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-ui-mode')))
            .toBe('mobile');

        const snapshot = await page.evaluate(() => {
            const uiMode = window.UiModeSystem;

            return {
                preference: uiMode?.getUIModePreference?.(),
                effective: uiMode?.getEffectiveUIMode?.(),
            };
        });

        expect(snapshot.preference).toBe('auto');
        expect(snapshot.effective).toBe('mobile');
    });

    test('stays desktop on a regular desktop viewport in auto mode', async ({ page, baseURL }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await gotoHome(page, baseURL);
        await waitForAppReady(page);

        await expect
            .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-ui-mode')))
            .toBe('desktop');

        const snapshot = await page.evaluate(() => {
            const uiMode = window.UiModeSystem;

            return {
                preference: uiMode?.getUIModePreference?.(),
                effective: uiMode?.getEffectiveUIMode?.(),
            };
        });

        expect(snapshot.preference).toBe('auto');
        expect(snapshot.effective).toBe('desktop');
    });
});
