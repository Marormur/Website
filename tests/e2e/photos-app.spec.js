// E2E Smoke Tests for Photos App - Basic availability checks only
const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

test.describe('Photos App', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('Photos App module loads', async ({ page }) => {
        const photosAppApi = await page.evaluate(() => {
            return {
                exists: typeof window.PhotosApp !== 'undefined',
                hasInit: typeof window.PhotosApp?.init === 'function',
                hasShowExternalImage: typeof window.PhotosApp?.showExternalImage === 'function',
            };
        });

        expect(photosAppApi.exists).toBe(true);
        expect(photosAppApi.hasInit).toBe(true);
        expect(photosAppApi.hasShowExternalImage).toBe(true);
    });

    test('Photos App modal structure exists', async ({ page }) => {
        await expect(page.locator('#image-modal')).toHaveCount(1);
        await expect(page.locator('#photos-sidebar')).toHaveCount(1);
        await expect(page.locator('#photos-gallery')).toHaveCount(1);
    });

    test('Photos App modal can be opened', async ({ page }) => {
        const modal = page.locator('#image-modal');
        await expect(modal).toHaveClass(/hidden/);

        const dockIcon = page.locator('#dock .dock-item[data-window-id="image-modal"]');
        await dockIcon.click();

        await expect(modal).not.toHaveClass(/hidden/);
    });
});
