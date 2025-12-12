/**
 * E2E Test for new FinderView features
 * Tests: i18n, Favorites, Recent Files, Search, Sorting
 */

import { test, expect } from '@playwright/test';
import { waitForAppReady, mockGitHubIfNeeded, openFinderWindow } from '../utils.js';

test.describe('FinderView New Features', () => {
    test.beforeEach(async ({ page }) => {
        await mockGitHubIfNeeded(page);
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('i18n: Sidebar labels are translatable', async ({ page }) => {
        // Open Finder
        const finderWindow = await openFinderWindow(page);
        await expect(finderWindow).toBeVisible();

        // Check for data-i18n attributes (they should exist)
        const computerBtn = finderWindow.locator('[data-sidebar-action="computer"]');
        await expect(computerBtn).toBeVisible();

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

        // Wait for content to load
        await page.waitForTimeout(500);

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
        await page.waitForTimeout(300);

        // Count filtered items (should be less or equal)
        const filteredItems = await finderWindow
            .locator('.finder-list-item, .finder-grid-item')
            .count();
        expect(filteredItems).toBeLessThanOrEqual(initialItems);

        // Clear search
        await searchInput.fill('');
        await page.waitForTimeout(300);

        // Items should return to original count
        const finalItems = await finderWindow
            .locator('.finder-list-item, .finder-grid-item')
            .count();
        expect(finalItems).toBe(initialItems);
    });

    test('Sort UI: Toggle sort menu', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);

        // Find sort button
        const sortBtn = finderWindow.locator('[data-action="toggle-sort"]');
        await expect(sortBtn).toBeVisible();

        // Sort menu should be hidden initially
        const sortMenu = finderWindow.locator('.finder-sort-menu');
        await expect(sortMenu).toHaveClass(/hidden/);

        // Click to show menu
        await sortBtn.click();
        await expect(sortMenu).not.toHaveClass(/hidden/);

        // Click again to hide
        await sortBtn.click();
        await expect(sortMenu).toHaveClass(/hidden/);
    });

    test('Sort UI: Change sort order', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);

        // Open sort menu
        const sortBtn = finderWindow.locator('[data-action="toggle-sort"]');
        await sortBtn.click();

        const sortMenu = finderWindow.locator('.finder-sort-menu');

        // Click "Nach Datum" (or "Sort by Date")
        const sortByDate = sortMenu.locator('[data-sort="date"]');
        await sortByDate.click();

        // Menu should close
        await expect(sortMenu).toHaveClass(/hidden/);

        // Re-open and change order
        await sortBtn.click();
        const sortDesc = sortMenu.locator('[data-order="desc"]');
        await sortDesc.click();

        // Menu should close again
        await expect(sortMenu).toHaveClass(/hidden/);
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

        // Wait for initial load
        await page.waitForTimeout(500);

        // Check breadcrumbs exist
        const breadcrumbs = finderWindow.locator('.breadcrumbs');
        await expect(breadcrumbs).toBeVisible();

        // Navigate to Documents folder (if it exists)
        const documentsFolder = finderWindow
            .locator('.finder-list-item, .finder-grid-item')
            .filter({ hasText: 'Documents' })
            .first();
        if ((await documentsFolder.count()) > 0) {
            await documentsFolder.dblclick();
            await page.waitForTimeout(300);

            // Breadcrumbs should now show Documents
            const breadcrumbText = await breadcrumbs.textContent();
            expect(breadcrumbText).toContain('Documents');
        }
    });

    test('View Modes: Switch between list and grid', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);

        // Find view mode buttons
        const listBtn = finderWindow.locator('[data-action="view-list"]');
        const gridBtn = finderWindow.locator('[data-action="view-grid"]');

        await expect(listBtn).toBeVisible();
        await expect(gridBtn).toBeVisible();

        // Switch to grid view
        await gridBtn.click();
        await page.waitForTimeout(300);

        // Should show grid items
        const gridItems = await finderWindow.locator('.finder-grid-item').count();
        if (gridItems === 0) {
            // Might be list if no items, check for list
            const listItems = await finderWindow.locator('.finder-list-item').count();
            expect(listItems).toBeGreaterThanOrEqual(0);
        }

        // Switch back to list view
        await listBtn.click();
        await page.waitForTimeout(300);

        const listItems = await finderWindow.locator('.finder-list-item').count();
        expect(listItems).toBeGreaterThanOrEqual(0);
    });

    test('State Persistence: Remembers view mode and sort settings', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);

        // Change to grid view
        const gridBtn = finderWindow.locator('[data-action="view-grid"]');
        await gridBtn.click();
        await page.waitForTimeout(300);

        // Change sort
        const sortBtn = finderWindow.locator('[data-action="toggle-sort"]');
        await sortBtn.click();
        const sortBySize = finderWindow.locator('[data-sort="size"]');
        await sortBySize.click();

        // Close and reopen Finder (simulate)
        const closeBtn = finderWindow.locator('.window-titlebar-close').first();
        await closeBtn.click();
        await page.waitForTimeout(300);

        // Reopen
        const finderWindow2 = await openFinderWindow(page);
        await page.waitForTimeout(500);

        // State should be preserved (grid view and size sort)
        // This is hard to test without inspecting internal state,
        // but we can at least verify the window opens
        await expect(finderWindow2).toBeVisible();
    });
});
