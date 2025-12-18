import { test, expect } from '@playwright/test';

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
        // Open Finder
        await page.evaluate(() => {
            if (window.ActionBus) {
                window.ActionBus.execute('openWindow', { id: 'finder-modal' });
            }
        });

        // Wait for Finder
        await page.waitForSelector('.macui-tabs:visible');

        // Check if tabs are inside the content area (not in window chrome)
        // The legacy tab bar was .window-tab-bar. The new one is .macui-tabs.
        const legacyTabBar = page.locator('.window-tab-bar');
        await expect(legacyTabBar).not.toBeVisible();

        const vdomTabs = page.locator('.macui-tabs:visible');
        await expect(vdomTabs).toBeVisible();

        // Check if it's inside the split-view right pane
        const rightPane = page.locator('.split-view-right:visible');
        const tabsInRightPane = rightPane.locator('.macui-tabs:visible');
        await expect(tabsInRightPane).toBeVisible();
    });

    test('should support adding and switching tabs', async ({ page }) => {
        await page.evaluate(() => {
            if (window.ActionBus) {
                window.ActionBus.execute('openWindow', { id: 'finder-modal' });
            }
        });

        await page.waitForSelector('.macui-tabs');

        // Initial tab count - might be 1 or 2 depending on environment
        const initialTabs = await page.locator('.macui-tab:visible').count();
        console.log(`DEBUG: Initial tabs count: ${initialTabs}`);

        // Click "+" button (use force: true to avoid dock interference)
        await page.click('button[title="Neuer Tab"]', { force: true });

        // Should have one more tab now
        await expect(page.locator('.macui-tab:visible')).toHaveCount(initialTabs + 1, {
            timeout: 10000,
        });

        // Switch back to first tab
        const tabs = page.locator('.macui-tab:visible');
        await tabs.nth(0).click({ force: true });

        // Check active state (bg-white in macos variant)
        await expect(tabs.nth(0)).toHaveClass(/bg-white/);
    });
});
