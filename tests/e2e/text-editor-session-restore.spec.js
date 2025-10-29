// E2E test to ensure the previously selected TextEditor tab is restored after reload
const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('./utils');

test.describe('TextEditor active tab persistence across reload', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('restores the same active TextEditor tab after page reload', async ({ page }) => {
        // Open TextEditor and create two instances
        await clickDockIcon(page, 'text-modal');
        await expect(page.locator('#text-modal')).not.toHaveClass(/hidden/);

        const addButton = page.locator('#text-editor-tabs-container .wt-add');
        await expect(addButton).toBeVisible();
        await addButton.click(); // Now we have at least two instances

        // Switch to the first tab explicitly
        const tabs = page.locator('#text-editor-tabs-container .wt-tab');
        await expect(tabs.nth(0)).toBeVisible();
        await tabs.nth(0).click();

        // Capture active instance id before reload
        const beforeId = await page.evaluate(() => {
            return window.TextEditorInstanceManager?.getActiveInstance()?.instanceId || null;
        });
        expect(beforeId).toBeTruthy();

        // Reload the page; auto-save on active change should have persisted selection
        await page.reload();
        await waitForAppReady(page);

        // If TextEditor isn't open, open it
        const textModal = page.locator('#text-modal');
        const cls = await textModal.getAttribute('class');
        if (!cls || /hidden/.test(cls)) {
            await clickDockIcon(page, 'text-modal');
        }

        // Check that the same instance is active after restore
        const afterId = await page.evaluate(() => {
            return window.TextEditorInstanceManager?.getActiveInstance()?.instanceId || null;
        });
        expect(afterId).toBe(beforeId);
    });
});
