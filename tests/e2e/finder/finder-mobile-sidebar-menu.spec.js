// @ts-check
const { test, expect } = require('@playwright/test');
const {
    gotoHome,
    waitForAppReady,
    dismissWelcomeDialogIfPresent,
    openFinderWindow,
} = require('../utils');

test.describe('Finder mobile menu/detail layout', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('uiModePreference', 'mobile');
        });
    });

    test('starts in menu view and opens finder content as detail view', async ({
        page,
        baseURL,
    }) => {
        await gotoHome(page, baseURL);
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);

        const finderWindow = await openFinderWindow(page);
        const mobileLayout = finderWindow.locator('.finder-mobile-layout');

        await expect(mobileLayout).toHaveAttribute('data-finder-mobile-view', 'menu');

        const githubItem = finderWindow.locator('[data-sidebar-id="github"]');
        await githubItem.click();

        await expect(mobileLayout).toHaveAttribute('data-finder-mobile-view', 'detail');
        await expect(finderWindow.locator('[data-finder-mobile-menu-back="1"]')).toBeVisible();
    });

    test('returns from detail view to menu via mobile menu back button', async ({
        page,
        baseURL,
    }) => {
        await gotoHome(page, baseURL);
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);

        const finderWindow = await openFinderWindow(page);
        const mobileLayout = finderWindow.locator('.finder-mobile-layout');

        await finderWindow.locator('[data-sidebar-id="home"]').click();
        await expect(mobileLayout).toHaveAttribute('data-finder-mobile-view', 'detail');

        const backButton = finderWindow.locator('[data-finder-mobile-menu-back="1"]');
        await expect(backButton).toBeVisible();
        await backButton.click();

        const viewAfterFirstBack = await mobileLayout.getAttribute('data-finder-mobile-view');
        if (viewAfterFirstBack !== 'menu') {
            await expect(mobileLayout).toHaveAttribute('data-finder-mobile-view', 'detail');
            await expect(backButton).toBeVisible();
            await backButton.click();
        }

        await expect(mobileLayout).toHaveAttribute('data-finder-mobile-view', 'menu');
        await expect(finderWindow.locator('[data-sidebar-id="locations"]')).toHaveCount(0);
        await expect(finderWindow.locator('[data-sidebar-id="github"]')).toHaveCount(1);
    });
});
