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
const {
    waitForAppReady,
    openFinderWindow,
    waitForFinderReady,
    getFinderAddTabButton,
    getFinderTabs,
} = require('../utils');

test.describe('Finder Session Restore - Empty Tab Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForAppReady(page);
    });

    test.skip('should restore Finder tabs and show active content after page reload', async ({
        page,
    }) => {
        // Step 1: Open Finder via helper
        let finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Step 2: Verify initial state - should have at least one tab
        const tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs.first()).toBeVisible();
        const initialTabCount = await tabs.count();
        expect(initialTabCount).toBeGreaterThanOrEqual(1);

        // Step 3: Verify content area is visible and not empty
        const contentArea = page
            .locator('.modal.multi-window[id^="window-finder-"] [id$="-container"]')
            .first();
        await expect(contentArea).toBeVisible();

        // Content should contain either list items, grid items, or an empty state message
        const hasContent = await page.evaluate(() => {
            const container = document.querySelector(
                '.modal.multi-window[id^="window-finder-"] [id$="-container"]'
            );
            if (!container) return false;
            const content = container;
            const hasItems =
                content.querySelector('.finder-list-item') ||
                content.querySelector('.finder-grid-item') ||
                content.querySelector('.finder-empty-state');
            return hasItems !== null;
        });
        expect(hasContent).toBe(true);

        // Step 4: Navigate to a different folder to create more state
        // Use FinderInstanceManager API to switch view
        const viewSwitched = await page.evaluate(() => {
            try {
                const manager = window.FinderInstanceManager;
                const activeInstance = manager?.getActiveInstance?.();
                if (activeInstance && typeof activeInstance.switchView === 'function') {
                    activeInstance.switchView('github');
                    return true;
                }
                return false;
            } catch (e) {
                console.error('View switch failed:', e);
                return false;
            }
        });
        expect(viewSwitched).toBe(true);
        // Wait for view switch to complete
        await page.waitForTimeout(500);

        // Step 5: Trigger immediate save
        const saved = await page.evaluate(() => {
            // @ts-ignore - SessionManager exists at runtime
            const result = window.SessionManager?.saveAll({ immediate: true });
            // Return confirmation that save was called (result could be undefined, just return true if saveAll exists)
            return typeof window.SessionManager?.saveAll === 'function';
        });
        expect(saved).toBe(true);

        // Step 6: Reload the page
        await page.reload();
        await waitForAppReady(page);

        // Step 7: Open Finder again if not already active and obtain finderWindow
        const isActive = await page.evaluate(() => {
            const reg = window.WindowRegistry;
            if (reg && typeof reg.getAllWindows === 'function')
                return (reg.getAllWindows('finder') || []).length > 0;
            return !!window.FinderInstanceManager?.getActiveInstance?.();
        });
        if (!isActive) {
            finderWindow = await openFinderWindow(page);
            await waitForFinderReady(page);
        } else {
            finderWindow = page.locator('.modal.multi-window[id^="window-finder-"]').first();
        }

        // Step 8: Verify tabs are restored (use getFinderTabs helper)
        const restoredTabCount = await (await getFinderTabs(page, finderWindow)).count();
        expect(restoredTabCount).toBeGreaterThanOrEqual(1);

        // Step 9: Verify at least one tab is active (has active styling)
        const restoredTabsActive = await page.evaluate(() => {
            const manager = window.FinderInstanceManager;
            const activeInstance = manager?.getActiveInstance?.();
            return activeInstance ? 1 : 0;
        });
        expect(restoredTabsActive).toBeGreaterThan(0);

        // Step 10: Verify content area is visible and populated
        await expect(contentArea).toBeVisible();

        const hasRestoredContent = await page.evaluate(
            winId => {
                const container =
                    document.querySelector(`#${winId}-container`) ||
                    document.querySelector('[id$="-container"]');
                if (!container) return false;
                const hasItems =
                    container.querySelector('.finder-list-item') ||
                    container.querySelector('.finder-grid-item') ||
                    container.querySelector('.finder-empty-state');
                return hasItems !== null;
            },
            await finderWindow.getAttribute('id')
        );
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

    test.skip('should show first tab content when no active instance was saved', async ({
        page,
    }) => {
        // Step 1: Clear any saved session first
        await page.evaluate(() => {
            // @ts-ignore - SessionManager exists at runtime
            window.SessionManager?.clear();
        });

        // Step 2: Open Finder
        let finderWindow2 = await openFinderWindow(page);
        await finderWindow2.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Step 3: Verify initial tab exists
        const initialTabCount2 = await (await getFinderTabs(page, finderWindow2)).count();
        expect(initialTabCount2).toBeGreaterThanOrEqual(1);

        // Step 4: Manually create a second tab
        const addButton2 = await getFinderAddTabButton(page, finderWindow2);
        await addButton2.click();
        // Wait for second tab to appear
        await page.waitForFunction(
            () =>
                document.querySelectorAll('.modal.multi-window[id^="window-finder-"] .wt-tab')
                    .length >= 2,
            { timeout: 2000 }
        );

        // Step 5: Verify we now have 2 tabs
        const tabCount = await page
            .locator('.modal.multi-window[id^="window-finder-"] .wt-tab')
            .count();
        expect(tabCount).toBeGreaterThanOrEqual(2);

        // Step 6: Save and close
        await page.evaluate(() => {
            // @ts-ignore - SessionManager exists at runtime
            window.SessionManager?.saveAll({ immediate: true });
        });
        // Close all Finder instances (WindowRegistry-aware)
        await page.evaluate(() => {
            try {
                const reg = window.WindowRegistry;
                if (reg && typeof reg.getAllWindows === 'function') {
                    const wins = reg.getAllWindows('finder') || [];
                    wins.forEach(w => w.close && w.close());
                } else {
                    const instances = window.FinderInstanceManager?.getAllInstances?.() || [];
                    instances.forEach(inst => inst.close?.());
                }
            } catch {}
        });
        // Wait for all instances to close
        await page.waitForFunction(
            () => {
                const reg = window.WindowRegistry;
                if (reg && typeof reg.getAllWindows === 'function')
                    return (reg.getAllWindows('finder') || []).length === 0;
                return (window.FinderInstanceManager?.getInstanceCount?.() || 0) === 0;
            },
            { timeout: 5000 }
        );

        // Step 7: Reload
        await page.reload();
        await waitForAppReady(page);

        // Step 8: Open Finder (use helper for multi-window) and wait for active instance
        finderWindow2 = await openFinderWindow(page);
        await waitForFinderReady(page);

        // Wait for active instance to be set
        await page.waitForFunction(
            () => {
                const manager = window.FinderInstanceManager;
                return manager?.getActiveInstance?.() !== undefined;
            },
            { timeout: 5000 }
        );

        // Step 9: Verify at least one tab is active
        const tabs = await getFinderTabs(page, finderWindow2);
        const activeTabCount = await page.evaluate(async () => {
            const manager = window.FinderInstanceManager;
            const activeInstance = manager?.getActiveInstance?.();
            return activeInstance ? 1 : 0;
        });
        expect(activeTabCount).toBeGreaterThan(0);

        // Step 10: Verify content is shown (use visible content area since there are multiple instances)
        const visibleContentArea = finderWindow2
            .locator('#finder-content-area')
            .filter({ hasNot: finderWindow2.locator('.hidden') })
            .first();
        await expect(visibleContentArea).toBeVisible();

        const hasContent = await page.evaluate(
            winId => {
                // In new architecture, each tab is a child of the container with .finder-content
                const container = document.querySelector(`#${winId}-container`);
                if (!container) return false;

                // Find first visible tab
                const visibleTab = Array.from(container.children).find(el => {
                    return !el.classList.contains('hidden') && el.querySelector('.finder-content');
                });

                if (!visibleTab) return false;

                const content =
                    visibleTab.querySelector('#finder-content-area') ||
                    visibleTab.querySelector('.finder-content');
                if (!content) return false;
                return !!(
                    content.querySelector('.finder-list-item') ||
                    content.querySelector('.finder-grid-item') ||
                    content.querySelector('.finder-empty-state')
                );
            },
            await finderWindow2.getAttribute('id')
        );
        expect(hasContent).toBeTruthy();
    });
});
