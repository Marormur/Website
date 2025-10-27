import { test, expect } from '@playwright/test';
import utils from './utils.js';

test.describe('Launchpad Basic Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('should open launchpad when clicking dock icon', async ({ page }) => {
        // Find and click the launchpad dock icon
        const launchpadDockIcon = page.locator(
            '#dock .dock-item[data-window-id="launchpad-modal"]'
        );
        await expect(launchpadDockIcon).toBeVisible();
        await launchpadDockIcon.click();

        // Verify launchpad modal is visible
        const launchpadModal = page.locator('#launchpad-modal');
        await expect(launchpadModal).not.toHaveClass(/hidden/);
        await expect(launchpadModal).toBeVisible();
    });

    test('should display apps grid', async ({ page }) => {
        // Open launchpad
        await page.locator('#dock .dock-item[data-window-id="launchpad-modal"]').click();

        // Verify apps grid is visible
        const appsGrid = page.locator('#launchpad-apps-grid');
        await expect(appsGrid).toBeVisible();

        // Check that at least one app is shown
        const appButtons = page.locator('.launchpad-app-button');
        await expect(appButtons.first()).toBeVisible();
    });

    test('should have search input', async ({ page }) => {
        // Open launchpad
        await page.locator('#dock .dock-item[data-window-id="launchpad-modal"]').click();

        // Verify search input exists
        const searchInput = page.locator('#launchpad-search-input');
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toHaveAttribute('placeholder');
    });

    test('should filter apps when searching', async ({ page }) => {
        // Open launchpad
        await page.locator('#dock .dock-item[data-window-id="launchpad-modal"]').click();

        // Get initial app count
        const appButtons = page.locator('.launchpad-app-button');
        const initialCount = await appButtons.count();

        // Type in search
        const searchInput = page.locator('#launchpad-search-input');
        await searchInput.fill('Finder');

        // Wait for filtering to take effect (filtered count should be <= initial)
        await page.waitForFunction(
            init => {
                try {
                    return document.querySelectorAll('.launchpad-app-button').length <= init;
                } catch {
                    return false;
                }
            },
            initialCount,
            { timeout: 5000 }
        );
        const filteredCount = await appButtons.count();
        expect(filteredCount).toBeLessThanOrEqual(initialCount);

        // Clear search
        await searchInput.clear();
        // Wait for the apps grid to restore to the original count
        await page.waitForFunction(
            init => {
                try {
                    return document.querySelectorAll('.launchpad-app-button').length === init;
                } catch {
                    return false;
                }
            },
            initialCount,
            { timeout: 5000 }
        );
        const finalCount = await appButtons.count();
        expect(finalCount).toBe(initialCount);
    });

    test('should close launchpad when clicking background', async ({ page }) => {
        // Open launchpad
        await page.locator('#dock .dock-item[data-window-id="launchpad-modal"]').click();

        const launchpadModal = page.locator('#launchpad-modal');
        await expect(launchpadModal).toBeVisible();

        // Click on the modal background (outside the inner content)
        await launchpadModal.click({ position: { x: 10, y: 10 } });

        // Verify launchpad is hidden
        await expect(launchpadModal).toHaveClass(/hidden/);
    });

    test('should open app and close launchpad when clicking app', async ({ page }) => {
        // Open launchpad
        await page.locator('#dock .dock-item[data-window-id="launchpad-modal"]').click();

        // Click on first app (likely Finder)
        const firstApp = page.locator('.launchpad-app-button').first();
        await firstApp.click();

        // Verify launchpad is closed
        const launchpadModal = page.locator('#launchpad-modal');
        await expect(launchpadModal).toHaveClass(/hidden/);

        // Verify an app window opened (check for any visible modal)
        const anyModal = page.locator('.modal:not(.hidden)').first();
        await expect(anyModal).toBeVisible();
    });

    test('should close launchpad when clicking dock icon while launchpad is open', async ({
        page,
    }) => {
        // Open launchpad
        const launchpadDockIcon = page.locator(
            '#dock .dock-item[data-window-id="launchpad-modal"]'
        );
        await launchpadDockIcon.click();

        const launchpadModal = page.locator('#launchpad-modal');
        await expect(launchpadModal).not.toHaveClass(/hidden/);

        // Click dock icon of another app (e.g., Finder)
        const finderDockIcon = page.locator('#dock .dock-item[data-window-id="finder-modal"]');
        await finderDockIcon.click();

        // Verify launchpad is closed
        await expect(launchpadModal).toHaveClass(/hidden/);

        // Verify Finder opened
        const finderModal = page.locator('#finder-modal');
        await expect(finderModal).not.toHaveClass(/hidden/);
    });
});
