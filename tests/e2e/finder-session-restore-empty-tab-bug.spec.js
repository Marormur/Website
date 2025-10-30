/**
 * @file finder-session-restore-empty-tab-bug.spec.js
 * @description Regression test for empty Finder window after session restore
 *
 * Bug: After page reload with saved Finder session, Finder opens with no visible tabs,
 * only the "+" button is present. The content area is empty.
 *
 * Expected: After restore, at least one tab should be visible and active, showing its content.
 */

// @ts-check
const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

test.describe('Finder Session Restore - Empty Tab Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForAppReady(page);
    });

    test('should restore Finder tabs and show active content after page reload', async ({
        page,
    }) => {
        // Step 1: Open Finder
        await page.click('[data-action="openWindow"][data-window-id="finder-modal"]');
        await page.waitForSelector('#finder-modal:not(.hidden)', { timeout: 5000 });

        // Step 2: Verify initial state - should have at least one tab
        const tabsContainer = page.locator('#finder-tabs-container');
        await expect(tabsContainer).toBeVisible();

        // Count tabs (excluding the "+" button)
        const initialTabCount = await page.locator('.wt-tab').count();
        expect(initialTabCount).toBeGreaterThanOrEqual(1);

        // Step 3: Verify content area is visible and not empty
        const contentArea = page.locator('#finder-content-area');
        await expect(contentArea).toBeVisible();

        // Content should contain either list items, grid items, or an empty state message
        const hasContent = await page.evaluate(() => {
            const content = document.querySelector('#finder-content-area');
            if (!content) return false;
            const hasItems =
                content.querySelector('.finder-list-item') ||
                content.querySelector('.finder-grid-item') ||
                content.querySelector('.finder-empty-state');
            return hasItems !== null;
        });
        expect(hasContent).toBe(true);

        // Step 4: Navigate to a different folder to create more state
        await page.click('[data-action="finder:switchView"][data-finder-view="github"]');
        // Wait for view switch to complete by checking sidebar selection
        await page.waitForSelector('#finder-sidebar-github.finder-sidebar-active', {
            timeout: 2000,
        });

        // Step 5: Trigger immediate save
        const saved = await page.evaluate(() => {
            // @ts-ignore - SessionManager exists at runtime
            window.SessionManager?.saveAll({ immediate: true });
            // Return confirmation that save was called
            return true;
        });
        expect(saved).toBe(true);

        // Step 6: Reload the page
        await page.reload();
        await waitForAppReady(page);

        // Step 7: Open Finder again
        await page.click('[data-action="openWindow"][data-window-id="finder-modal"]');
        await page.waitForSelector('#finder-modal:not(.hidden)', { timeout: 5000 });

        // Step 8: Verify tabs are restored
        const restoredTabCount = await page.locator('.wt-tab').count();
        expect(restoredTabCount).toBeGreaterThanOrEqual(1);

        // Step 9: Verify at least one tab is active (has active styling)
        const activeTab = page.locator(
            '.wt-tab.bg-white.dark\\:bg-gray-900, .wt-tab.text-gray-900.dark\\:text-gray-100'
        );
        await expect(activeTab.first()).toBeVisible();

        // Step 10: Verify content area is visible and populated
        await expect(contentArea).toBeVisible();

        const hasRestoredContent = await page.evaluate(() => {
            const content = document.querySelector('#finder-content-area');
            if (!content) return false;
            const hasItems =
                content.querySelector('.finder-list-item') ||
                content.querySelector('.finder-grid-item') ||
                content.querySelector('.finder-empty-state');
            return hasItems !== null;
        });
        expect(hasRestoredContent).toBe(true);

        // Step 11: Verify no "empty window" state (no content at all)
        const isCompletelyEmpty = await page.evaluate(() => {
            const content = document.querySelector('#finder-content-area');
            if (!content) return true;
            const text = content.textContent?.trim() || '';
            const hasAnyChild = content.children.length > 0;
            return !hasAnyChild && text.length === 0;
        });
        expect(isCompletelyEmpty).toBe(false);
    });

    test('should show first tab content when no active instance was saved', async ({ page }) => {
        // Step 1: Clear any saved session first
        await page.evaluate(() => {
            // @ts-ignore - SessionManager exists at runtime
            window.SessionManager?.clear();
        });

        // Step 2: Open Finder
        await page.click('[data-action="openWindow"][data-window-id="finder-modal"]');
        await page.waitForSelector('#finder-modal:not(.hidden)', { timeout: 5000 });

        // Step 3: Verify initial tab exists
        const initialTabCount = await page.locator('.wt-tab').count();
        expect(initialTabCount).toBeGreaterThanOrEqual(1);

        // Step 4: Manually create a second tab
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await addButton.click();
        // Wait for second tab to appear
        await page.waitForSelector('.wt-tab:nth-child(2)', { timeout: 2000 });

        // Step 5: Verify we now have 2 tabs
        const tabCount = await page.locator('.wt-tab').count();
        expect(tabCount).toBe(2);

        // Step 6: Save and close
        await page.evaluate(() => {
            // @ts-ignore - SessionManager exists at runtime
            window.SessionManager?.saveAll({ immediate: true });
        });
        // Use API to close window
        await page.evaluate(() => {
            // @ts-ignore
            window.API?.window?.close('finder-modal');
        });
        // Wait for modal to be hidden
        await page.waitForFunction(
            () => {
                const modal = document.getElementById('finder-modal');
                return modal?.classList.contains('hidden');
            },
            { timeout: 2000 }
        );

        // Step 7: Reload
        await page.reload();
        await waitForAppReady(page);

        // Step 8: Open Finder
        await page.click('[data-action="openWindow"][data-window-id="finder-modal"]');
        await page.waitForSelector('#finder-modal:not(.hidden)', { timeout: 5000 });

        // Step 9: Verify at least one tab is active
        const activeTab = page.locator(
            '.wt-tab.bg-white.dark\\:bg-gray-900, .wt-tab.text-gray-900.dark\\:text-gray-100'
        );
        await expect(activeTab.first()).toBeVisible();

        // Step 10: Verify content is shown (use visible content area since there are multiple instances)
        const visibleContentArea = page
            .locator('#finder-content-area')
            .filter({ hasNot: page.locator('.hidden') })
            .first();
        await expect(visibleContentArea).toBeVisible();

        const hasContent = await page.evaluate(() => {
            // Find the visible content area (not in a hidden container)
            const containers = Array.from(document.querySelectorAll('.finder-instance-container'));
            const visibleContainer = containers.find(c => !c.classList.contains('hidden'));
            if (!visibleContainer) return false;

            const content = visibleContainer.querySelector('#finder-content-area');
            if (!content) return false;
            return !!(
                content.querySelector('.finder-list-item') ||
                content.querySelector('.finder-grid-item') ||
                content.querySelector('.finder-empty-state')
            );
        });
        expect(hasContent).toBeTruthy();
    });
});
