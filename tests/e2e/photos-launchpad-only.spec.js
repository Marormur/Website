import { test, expect } from '@playwright/test';
import utils from './utils.js';

test.describe('Photos App: Launchpad Only (Not in Dock)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('should NOT appear in dock by default', async ({ page }) => {
        // Verify Photos app (image-modal) is NOT in the dock
        const photosDockIcon = page.locator(
            '#dock .dock-item[data-window-id="image-modal"]'
        );
        await expect(photosDockIcon).toHaveCount(0);

        // Also check for photos-window (alternative window ID)
        const photosWindowDockIcon = page.locator(
            '#dock .dock-item[data-window-id="photos-window"]'
        );
        await expect(photosWindowDockIcon).toHaveCount(0);
    });

    test('should appear in Launchpad', async ({ page }) => {
        // Open Launchpad
        const launchpadDockIcon = page.locator(
            '#dock .dock-item[data-window-id="launchpad-modal"]'
        );
        await launchpadDockIcon.click();

        // Wait for Launchpad to be visible
        const launchpadModal = page.locator('#launchpad-modal');
        await expect(launchpadModal).not.toHaveClass(/hidden/);

        // Verify Photos app appears in Launchpad
        // The app could be registered as 'image-modal' or 'photos-window'
        const photosApp = page.locator(
            '.launchpad-app-button[data-window-id="image-modal"], .launchpad-app-button[data-window-id="photos-window"]'
        );
        await expect(photosApp).toHaveCount(1);
        await expect(photosApp).toBeVisible();
    });

    test('should open Photos app from Launchpad', async ({ page }) => {
        // Open Launchpad
        await page.locator('#dock .dock-item[data-window-id="launchpad-modal"]').click();

        // Click on Photos app in Launchpad
        const photosApp = page.locator(
            '.launchpad-app-button[data-window-id="image-modal"], .launchpad-app-button[data-window-id="photos-window"]'
        );
        await photosApp.click();

        // Verify Launchpad closes
        const launchpadModal = page.locator('#launchpad-modal');
        await expect(launchpadModal).toHaveClass(/hidden/);

        // Verify Photos window opens
        const photosModal = page.locator('#image-modal, #photos-window');
        await expect(photosModal).not.toHaveClass(/hidden/);
        await expect(photosModal).toBeVisible();
    });

    test('should be searchable in Launchpad', async ({ page }) => {
        // Open Launchpad
        await page.locator('#dock .dock-item[data-window-id="launchpad-modal"]').click();

        // Get initial app count
        const appButtons = page.locator('.launchpad-app-button');
        const initialCount = await appButtons.count();
        expect(initialCount).toBeGreaterThan(0);

        // Search for Photos (try different possible labels)
        const searchInput = page.locator('#launchpad-search-input');
        await searchInput.fill('Fotos');

        // Wait for filtering to take effect by checking the grid updates
        await page.waitForFunction(
            init => {
                try {
                    return document.querySelectorAll('.launchpad-app-button').length <= init;
                } catch {
                    return false;
                }
            },
            initialCount,
            { timeout: 3000 }
        );

        // Should show at least Photos app
        const visibleApps = page.locator('.launchpad-app-button');
        const filteredCount = await visibleApps.count();
        expect(filteredCount).toBeGreaterThan(0);
        expect(filteredCount).toBeLessThanOrEqual(initialCount);

        // Verify Photos app is in the filtered results
        const photosApp = page.locator(
            '.launchpad-app-button[data-window-id="image-modal"], .launchpad-app-button[data-window-id="photos-window"]'
        );
        await expect(photosApp).toHaveCount(1);
    });
});
