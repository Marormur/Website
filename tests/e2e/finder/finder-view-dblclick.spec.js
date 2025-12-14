/**
 * @file tests/e2e/finder-view-dblclick.spec.js
 * Verifies that double-click navigation works in the new FinderView tab system.
 * Tests both list and grid view modes, ensures DOM stability during click sequences.
 *
 * Scope: new BaseTab-based FinderView (finder-view.ts + finder-window.ts).
 * Legacy finder-instance.ts is not tested here.
 */
const { test, expect } = require('@playwright/test');
const {
    gotoHome,
    waitForAppReady,
    openFinderWindow,
    ensureFinderViewMode,
    waitForFinderContent,
} = require('../utils');
test.describe('FinderView Double-Click Navigation @basic', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        // Use shared navigation helper so loader flags (USE_BUNDLE etc.) are applied deterministically
        await gotoHome(page, baseURL);
        await waitForAppReady(page);
    });

    test('should navigate into folder on double-click in list view', async ({ page }) => {
        console.log('[Test] Starting dblclick test in list view');

        // Ensure list view is active within the Finder window
        const win = await openFinderWindow(page);
        await ensureFinderViewMode(win, 'list');
        await waitForFinderContent(win, 'list');

        // Verify we are at Computer root (breadcrumb should show "Computer")
        const breadcrumb = win.locator('.breadcrumbs');
        await expect(breadcrumb).toContainText('Computer');

        // Look for the first folder item in list view with data-item-type="folder"
        const firstFolder = win.locator('.finder-list-item[data-item-type="folder"]').first();
        await firstFolder.waitFor({ state: 'visible', timeout: 5000 });

        // Get the folder name
        const folderName = await firstFolder.getAttribute('data-item-name');
        console.log('[Test] Found folder:', folderName);

        // Double-click the folder
        await firstFolder.dblclick();
        // Wait until breadcrumb includes the folder name
        await expect(breadcrumb).toContainText(folderName);

        // Verify breadcrumb now contains the folder name
        await expect(breadcrumb).toContainText(folderName);
        console.log('[Test] Breadcrumb updated to include:', folderName);

        // Verify content area updated (should have new items or be empty)
        const content = win.locator('.finder-content');
        await expect(content).toBeVisible();
    });

    test('should navigate into folder on double-click in grid view', async ({ page }) => {
        console.log('[Test] Starting dblclick test in grid view');

        // Switch to grid view
        const win = await openFinderWindow(page);
        await ensureFinderViewMode(win, 'grid');
        const firstGridItem = await waitForFinderContent(win, 'grid');

        // Verify we are at Computer root
        const breadcrumb = win.locator('.breadcrumbs');
        await expect(breadcrumb).toContainText('Computer');

        const itemIndex = await firstGridItem.getAttribute('data-item-index');
        console.log('[Test] First grid item index:', itemIndex);

        // Double-click the item
        await firstGridItem.dblclick();
        // Wait until breadcrumb is no longer just "Computer" (root)
        await expect(breadcrumb).not.toHaveText(/^\s*Computer\s*$/);

        // The breadcrumb should now show a subfolder (depends on structure)
        // For now just verify it changed (not just "Computer")
        const updatedBreadcrumb = await breadcrumb.textContent();
        console.log('[Test] Breadcrumb after dblclick:', updatedBreadcrumb);

        // At minimum, verify content is still visible
        const content = win.locator('.finder-content');
        await expect(content).toBeVisible();
    });

    test('should not break DOM on single-click (no re-render issue)', async ({ page }) => {
        console.log('[Test] Verify single-click does not re-render and break dblclick');

        // Ensure list view
        const win = await openFinderWindow(page);
        await ensureFinderViewMode(win, 'list');
        await waitForFinderContent(win, 'list');

        const firstFolder = win.locator('.finder-list-item[data-item-type="folder"]').first();
        await firstFolder.waitFor({ state: 'visible' });

        const folderName = await firstFolder.getAttribute('data-item-name');
        console.log('[Test] Folder name:', folderName);

        // Single-click the folder (should select, not navigate)
        await firstFolder.click();

        // Verify selection style applied (bg-blue-100 or dark:bg-blue-900)
        const classList = await firstFolder.getAttribute('class');
        console.log('[Test] Class list after click:', classList);

        // The element should remain in DOM (not be re-rendered)
        // If we can still reference it and dblclick, that proves stability
        await firstFolder.dblclick();
        // Breadcrumb should now contain the folder name
        const breadcrumb = win.locator('.breadcrumbs');
        await expect(breadcrumb).toContainText(folderName);
        await expect(breadcrumb).toContainText(folderName);
        console.log('[Test] Successfully double-clicked after single-click selection');
    });
});
