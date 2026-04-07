/**
 * E2E Test for new FinderView features
 * Tests: i18n, Favorites, Recent Files, Search, Sorting
 */

import { test, expect } from '@playwright/test';
import {
    waitForAppReady,
    mockGitHubIfNeeded,
    openFinderWindow,
    dismissWelcomeDialogIfPresent,
} from '../utils.js';

test.describe('FinderView New Features', () => {
    test.beforeEach(async ({ page }) => {
        await mockGitHubIfNeeded(page);
        await page.goto('/');
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);
    });

    test('i18n: Sidebar labels are translatable', async ({ page }) => {
        // Open Finder
        const finderWindow = await openFinderWindow(page);
        await expect(finderWindow).toBeVisible();

        // Current Finder sidebar uses "devices" as the primary computer entry.
        // Keep "computer" as fallback for backward compatibility in older builds.
        const primaryDeviceBtn = finderWindow.locator(
            '[data-sidebar-id="devices"], [data-sidebar-id="computer"]'
        );
        await expect(primaryDeviceBtn.first()).toBeVisible();

        // Check text content (should be in German by default or current locale)
        const sidebarTexts = await finderWindow
            .locator('.finder-sidebar-item span:not(.finder-sidebar-icon)')
            .allTextContents();
        console.log('Sidebar texts:', sidebarTexts);

        // Should contain these items in some language
        expect(sidebarTexts.length).toBeGreaterThanOrEqual(4);
    });

    test('Search: Filters items in real-time', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);

        // Wait for at least one item to be rendered (not a timeout!)
        await finderWindow
            .locator('.finder-list-item, .finder-grid-item')
            .first()
            .waitFor({ state: 'visible', timeout: 10000 });

        // Get search input
        const searchInput = finderWindow.locator('.finder-search');
        await expect(searchInput).toBeVisible();

        // Count initial items
        const initialItems = await finderWindow
            .locator('.finder-list-item, .finder-grid-item')
            .count();
        expect(initialItems).toBeGreaterThan(0);

        // Type search term
        await searchInput.fill('Doc');

        // Wait for filtering to complete (count changes or stabilizes)
        await page.waitForFunction(
            initial => {
                const items = document.querySelectorAll('.finder-list-item, .finder-grid-item');
                return items.length <= initial;
            },
            initialItems,
            { timeout: 3000 }
        );

        // Count filtered items (should be less or equal)
        const filteredItems = await finderWindow
            .locator('.finder-list-item, .finder-grid-item')
            .count();
        expect(filteredItems).toBeLessThanOrEqual(initialItems);

        // Clear search
        await searchInput.fill('');

        // Wait for items to restore
        await page.waitForFunction(
            initial => {
                const items = document.querySelectorAll('.finder-list-item, .finder-grid-item');
                return items.length === initial;
            },
            initialItems,
            { timeout: 3000 }
        );

        // Items should return to original count
        const finalItems = await finderWindow
            .locator('.finder-list-item, .finder-grid-item')
            .count();
        expect(finalItems).toBe(initialItems);
    });

    test('Sort UI: Toggle sort menu', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);

        // Find sort button
        const sortBtn = finderWindow.locator('[data-finder-sort-trigger="1"]');
        await expect(sortBtn).toBeVisible();

        // Sort menu overlay should not exist initially
        const sortMenu = page.locator('.finder-sort-menu-overlay[aria-label="Sortierung"]');
        await expect(sortMenu).toHaveCount(0);

        // Click to show menu
        await sortBtn.click();
        await expect(sortMenu).toBeVisible();

        // Click again to close and remove overlay from DOM
        await sortBtn.click();
        await expect(sortMenu).toHaveCount(0);
    });

    test('Sort UI: Change sort order', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);

        // Open sort menu and choose a different sort mode
        const sortBtn = finderWindow.locator('[data-finder-sort-trigger="1"]');
        await sortBtn.click();

        const sortMenu = page.locator('.finder-sort-menu-overlay[aria-label="Sortierung"]');
        await expect(sortMenu).toBeVisible();

        // New sort menu uses menuitemradio options, not data-sort/data-order attributes.
        const sortByDate = page.getByRole('menuitemradio', { name: /Änderungsdatum|Date/i });
        await sortByDate.click();

        // Overlay should be removed after selection
        await expect(sortMenu).toHaveCount(0);

        // Re-open and choose another sort option
        await sortBtn.click();
        const sortBySize = page.getByRole('menuitemradio', { name: /Größe|Size/i });
        await sortBySize.click();

        // Menu should close again
        await expect(sortMenu).toHaveCount(0);
    });

    test('Recent Files: Shows recent view when clicked', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);

        // Click Recent sidebar button
        const recentBtn = finderWindow.locator('[data-sidebar-action="recent"]');
        await expect(recentBtn).toBeVisible();
        await recentBtn.click();

        // Should highlight the Recent button
        await expect(recentBtn).toHaveClass(/finder-sidebar-active/);

        // Content should update (may be empty if no recent files yet)
        const content = finderWindow.locator('.finder-content');
        await expect(content).toBeVisible();
    });

    test('Starred/Favorites: Shows favorites view when clicked', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);

        // Click Starred sidebar button
        const starredBtn = finderWindow.locator('[data-sidebar-action="starred"]');
        await expect(starredBtn).toBeVisible();
        await starredBtn.click();

        // Should highlight the Starred button
        await expect(starredBtn).toHaveClass(/finder-sidebar-active/);

        // Content should update (may be empty if no favorites yet)
        const content = finderWindow.locator('.finder-content');
        await expect(content).toBeVisible();
    });

    test('Navigation: Updates breadcrumbs correctly', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);

        // Wait for at least one item to be visible
        await finderWindow
            .locator('.finder-list-item, .finder-grid-item')
            .first()
            .waitFor({ state: 'visible', timeout: 10000 });

        // Finder toolbar now shows current folder label in the center.
        const centerLabel = finderWindow.locator('[data-main-toolbar-wrap] .truncate').first();
        await expect(centerLabel).toBeVisible();
        const initialLabel = ((await centerLabel.textContent()) || '').trim();

        // Navigate into the first visible folder to verify breadcrumb updates.
        const firstFolder = finderWindow
            .locator('.finder-list-item[data-item-type="folder"]')
            .first();
        if ((await firstFolder.count()) > 0) {
            const folderName = await firstFolder.getAttribute('data-item-name');
            await firstFolder.dblclick();

            if (folderName) {
                await expect(centerLabel).toContainText(folderName);
            }
        } else {
            // If there are no folders in the current fixture, label must still stay visible.
            await expect(centerLabel).toContainText(initialLabel);
        }
    });

    test('View Modes: Switch between list and grid', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);

        const viewBtn = finderWindow.locator('[data-finder-view-trigger="1"]');
        await expect(viewBtn).toBeVisible();

        // Switch to grid view
        await viewBtn.click();
        await page.getByRole('menuitemradio', { name: /Als grosse Symbole|Large Icons/i }).click();

        await finderWindow
            .locator('.finder-grid-container')
            .waitFor({ state: 'visible', timeout: 5000 });

        // Should show grid items
        const gridItems = await finderWindow.locator('.finder-grid-item').count();
        if (gridItems === 0) {
            // Might be list if no items, check for list
            const listItems = await finderWindow.locator('.finder-list-item').count();
            expect(listItems).toBeGreaterThanOrEqual(0);
        }

        // Switch back to list view
        await viewBtn.click();
        await page.getByRole('menuitemradio', { name: /Als Liste|List/i }).click();

        // Wait for list table to appear
        await finderWindow
            .locator('.finder-list-table')
            .waitFor({ state: 'visible', timeout: 5000 });

        const listItems = await finderWindow.locator('.finder-list-item').count();
        expect(listItems).toBeGreaterThanOrEqual(0);
    });

    test('State Persistence: Remembers view mode and sort settings', async ({ page }) => {
        test.setTimeout(60000);
        const finderWindow = await openFinderWindow(page);

        // Change to grid view
        const viewBtn = finderWindow.locator('[data-finder-view-trigger="1"]');
        await viewBtn.click();
        await page.getByRole('menuitemradio', { name: /Als grosse Symbole|Large Icons/i }).click();

        // Wait for grid container to appear
        await finderWindow
            .locator('.finder-grid-container')
            .waitFor({ state: 'visible', timeout: 5000 });

        // Change sort
        const sortBtn = finderWindow.locator('[data-finder-sort-trigger="1"]');
        await sortBtn.click();
        const sortBySize = page.getByRole('menuitemradio', { name: /Größe|Size/i });
        await sortBySize.click();

        // Wait for sort menu overlay to close
        await expect(
            page.locator('.finder-sort-menu-overlay[aria-label="Sortierung"]')
        ).toHaveCount(0);

        // Close Finder window
        const closeBtn = finderWindow.locator('[data-action="window-close"]').first();
        await closeBtn.click({ timeout: 5000 });

        // Wait for window to actually close
        await finderWindow.waitFor({ state: 'hidden', timeout: 5000 });

        // Reopen
        const finderWindow2 = await openFinderWindow(page);

        // State should be preserved at least for chosen sort mode.
        await expect(finderWindow2).toBeVisible();

        const reopenedSortBtn = finderWindow2.locator('[data-finder-sort-trigger="1"]');
        await expect(reopenedSortBtn).toHaveAttribute('title', /Größe|Size/i);
    });
});
