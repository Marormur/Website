// E2E test to ensure the previously selected Terminal tab is restored after reload
const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('./utils');

test.describe('Terminal active tab persistence across reload', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('restores the same active Terminal tab after page reload', async ({ page }) => {
        // Open Terminal and create two instances
        await clickDockIcon(page, 'terminal-modal');
        await expect(page.locator('#terminal-modal')).not.toHaveClass(/hidden/);

        const addButton = page.locator('#terminal-tabs-container .wt-add');
        await expect(addButton).toBeVisible();
        await addButton.click(); // Now we have at least two instances

        // Switch to the first tab explicitly
        const tabs = page.locator('#terminal-tabs-container .wt-tab');
        await expect(tabs.nth(0)).toBeVisible();
        await tabs.nth(0).click();

        // Capture active instance id before reload
        const beforeId = await page.evaluate(() => {
            return window.TerminalInstanceManager?.getActiveInstance()?.instanceId || null;
        });
        expect(beforeId).toBeTruthy();

        // Reload the page; auto-save on active change should have persisted selection
        await page.reload();
        await waitForAppReady(page);

        // If Terminal isn't open, open it
        const terminalModal = page.locator('#terminal-modal');
        const cls = await terminalModal.getAttribute('class');
        if (!cls || /hidden/.test(cls)) {
            await clickDockIcon(page, 'terminal-modal');
        }

        // Check that the same instance is active after restore
        const afterId = await page.evaluate(() => {
            return window.TerminalInstanceManager?.getActiveInstance()?.instanceId || null;
        });
        expect(afterId).toBe(beforeId);
    });
});
