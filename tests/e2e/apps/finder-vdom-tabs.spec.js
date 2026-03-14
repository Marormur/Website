import { test, expect } from '@playwright/test';
import { openFinderWindow, waitForFinderReady } from '../utils';

test.describe('Finder VDOM Tabs', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        await page.goto('http://127.0.0.1:5173/');
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('MOCK_GITHUB', '1');
            localStorage.setItem('USE_BUNDLE', '1');
        });
        await page.reload();
        await page.waitForFunction(() => window['__APP_READY'] === true);
    });

    test('should render VDOM tabs inside the content area', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page, { timeout: 15000 });

        // Check if tabs are inside the content area (not in window chrome)
        // The legacy tab bar was .window-tab-bar. The new one is .macui-tabs.
        const legacyTabBar = finderWindow.locator('.window-tab-bar');
        await expect(legacyTabBar).toHaveCount(0);

        const vdomTabs = finderWindow.locator('.finder-tabs-container .macui-tabs');
        await expect(vdomTabs).toBeVisible();

        // The tab bar is rendered in the main content region, not in the titlebar/sidebar.
        const tabsInMainContent = finderWindow.locator(
            '[data-main-content-wrap] .finder-tabs-container .macui-tabs'
        );
        await expect(tabsInMainContent).toBeVisible();
    });

    test('should support adding and switching tabs', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page, { timeout: 15000 });

        const windowId = await finderWindow.getAttribute('id');
        if (!windowId) {
            throw new Error('Finder window id not available');
        }

        const tabs = finderWindow.locator(`#${windowId}-tabs .macui-tab`);
        const addButton = finderWindow.locator(`#${windowId}-tabs .wt-add`);

        // Initial tab count - might be 1 or 2 depending on environment
        const initialTabs = await tabs.count();
        console.log(`DEBUG: Initial tabs count: ${initialTabs}`);

        // Click "+" button (use force: true to avoid dock interference)
        await addButton.click({ force: true });

        // Should have one more tab now
        await expect(tabs).toHaveCount(initialTabs + 1, {
            timeout: 10000,
        });

        // Switch back to first tab
        await tabs.nth(0).click({ force: true });

        // Check active state (bg-white in macos variant)
        await expect(tabs.nth(0)).toHaveClass(/bg-white|dark:!bg-gray-700\/60/);
    });
});
