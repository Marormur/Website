// Test: Finder tab titles show current folder name instead of "Finder <number>"
const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('./utils');

async function getTabTitles(page) {
    return await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('#finder-tabs-container .wt-tab-title'));
        return tabs.map(t => t.textContent.trim());
    });
}

test.describe('Finder tab titles show folder names', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('tab title shows current folder name instead of "Finder <number>"', async ({ page }) => {
        // Open Finder
        await clickDockIcon(page, 'Finder Icon');
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Wait for initial render
        await page.waitForTimeout(300);

        // Get initial tab title - should be view name (e.g., "Computer")
        let titles = await getTabTitles(page);
        expect(titles[0]).not.toMatch(/^Finder \d+$/); // Should NOT be "Finder 1"
        expect(titles[0]).toMatch(/Computer|GitHub/i); // Should be a view name

        // Navigate to Documents folder (if in computer view)
        const documentsBtn = page.locator('[data-finder-content] [data-item-name="Documents"]').first();
        if (await documentsBtn.isVisible().catch(() => false)) {
            await documentsBtn.dblclick();
            await page.waitForTimeout(300);

            // Tab title should now show "Documents"
            titles = await getTabTitles(page);
            expect(titles[0]).toBe('Documents');
        }

        // Create a second tab
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await expect(addButton).toBeVisible();
        await addButton.click();
        await page.waitForTimeout(300);

        // Second tab should also have a folder name, not "Finder 2"
        titles = await getTabTitles(page);
        expect(titles.length).toBe(2);
        expect(titles[1]).not.toMatch(/^Finder \d+$/);
        expect(titles[1]).toMatch(/Computer|GitHub|Favoriten|Favorites|Zuletzt/i);
    });

    test('tab title updates when navigating folders', async ({ page }) => {
        // Open Finder
        await clickDockIcon(page, 'Finder Icon');
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);
        await page.waitForTimeout(300);

        // Navigate to GitHub view (sidebar click)
        const githubSidebarBtn = page.locator('[data-finder-view="github"]').first();
        if (await githubSidebarBtn.isVisible().catch(() => false)) {
            await githubSidebarBtn.click();
            await page.waitForTimeout(300);

            // Tab title should update to GitHub view name
            const titles = await getTabTitles(page);
            expect(titles[0]).toMatch(/GitHub/i);
        }
    });

    test('tab titles persist across reload', async ({ page }) => {
        // Open Finder and navigate to a folder
        await clickDockIcon(page, 'Finder Icon');
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);
        await page.waitForTimeout(300);

        // Try to navigate to Documents
        const documentsBtn = page.locator('[data-finder-content] [data-item-name="Documents"]').first();
        let navigatedToDocuments = false;
        if (await documentsBtn.isVisible().catch(() => false)) {
            await documentsBtn.dblclick();
            await page.waitForTimeout(300);
            navigatedToDocuments = true;
        }

        // Reload page
        await page.reload();
        await waitForAppReady(page);

        // Open Finder again if needed
        const finderModal = page.locator('#finder-modal');
        const cls = await finderModal.getAttribute('class');
        if (!cls || /hidden/.test(cls)) {
            await clickDockIcon(page, 'Finder Icon');
            await page.waitForTimeout(300);
        }

        // Tab title should be restored (not "Finder 1")
        const titles = await getTabTitles(page);
        expect(titles[0]).not.toMatch(/^Finder \d+$/);
        
        if (navigatedToDocuments) {
            // If we navigated to Documents before reload, title should still be Documents
            expect(titles[0]).toBe('Documents');
        }
    });
});
