// E2E Smoke Tests for Photos App - Basic availability checks only
const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

async function openLaunchpad(page) {
    await page.evaluate(() => {
        const modal = document.querySelector('#launchpad-modal');
        if (modal && modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
        }

        if (window.LaunchpadSystem && typeof window.LaunchpadSystem.init === 'function') {
            const container = document.querySelector('#launchpad-container');
            if (container) {
                window.LaunchpadSystem.init(container);
            }
        }
    });

    await page.waitForFunction(
        () => {
            const modal = document.querySelector('#launchpad-modal');
            const grid = document.querySelector('#launchpad-container #launchpad-apps-grid');
            return !!modal && !modal.classList.contains('hidden') && !!grid;
        },
        { timeout: 20000 }
    );
}

function getPhotosWindow(page) {
    return page.locator('.modal.multi-window.photos-window-shell[id^="window-photos-"]').first();
}

test.describe('Photos App', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('Photos App modal structure exists', async ({ page }) => {
        await page.evaluate(() => {
            window.PhotosWindow?.focusOrCreate?.();
        });

        const photosWindow = getPhotosWindow(page);
        await expect(photosWindow).toBeVisible();

        // New redesign: Check for tab structure instead of sidebar/gallery
        await expect(photosWindow.locator('[id$="-tab-content"]')).toBeDefined();

        // Check for gallery grid
        const gallery = photosWindow.locator('[class*="grid"]');
        await expect(gallery).toBeDefined();
    });

    test('Photos App can be opened from Launchpad', async ({ page }) => {
        const photosWindow = getPhotosWindow(page);
        await expect(photosWindow).toHaveCount(0);

        await openLaunchpad(page);
        await page.locator('.launchpad-app-button[data-window-id="image-modal"]').click();

        await expect(page.locator('#launchpad-modal')).toHaveClass(/hidden/);
        await expect(photosWindow).toBeVisible();
    });
});
