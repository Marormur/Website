// E2E: Desktop shortcut opens Finder in GitHub view
const { test, expect } = require('@playwright/test');

test.describe('Desktop GitHub shortcut', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
    });

    test('Clicking GitHub desktop icon opens Finder GitHub view', async ({ page }) => {
        // Click desktop shortcut with i18n key desktop.github
        const shortcut = page.locator('.desktop-icon-button[data-i18n-title="desktop.github"]');
        await expect(shortcut).toBeVisible();
        await shortcut.dblclick();

        // Finder should be visible
        const finderModal = page.locator('#finder-modal');
        await expect(finderModal).not.toHaveClass(/hidden/);

        // Sidebar GitHub entry should be active
        const githubBtn = page.locator('#finder-sidebar-github');
        await expect(githubBtn).toHaveClass(/finder-sidebar-active/);

        // Content should either load repos or show a loading/info row
        const content = page.locator('#finder-content-area');
        await expect(content).toBeVisible();
    });
});
