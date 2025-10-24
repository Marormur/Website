// E2E tests for Finder GitHub integration (inline browsing)
const { test, expect } = require('@playwright/test');

async function openFinder(page) {
    await page.getByRole('img', { name: 'Finder Icon' }).click();
    await expect(page.getByRole('button', { name: 'Finder' })).toBeVisible();
}

async function openFinderGithub(page) {
    await page.locator('#finder-sidebar-github').click();
}

test.describe('Finder GitHub integration', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
    });

    test('Clicking GitHub in Finder does not open Projects window', async ({ page }) => {
        await openFinder(page);
        await openFinderGithub(page);
        // Wait for either loading text or any content to appear
        await page.waitForTimeout(500);
        const projectsModal = page.locator('#projects-modal');
        await expect(projectsModal).toHaveClass(/hidden/);
    });

    test('Open Website/img/wallpaper.png in image viewer', async ({ page }) => {
        await openFinder(page);
        await openFinderGithub(page);
        // Double click repo "Website" (wait until visible)
        const websiteRow = page.locator('tr:has-text("Website")').first();
        await expect(websiteRow).toBeVisible({ timeout: 15000 });
        await websiteRow.dblclick();
        // Open folder img
        const imgRow = page.locator('tr:has-text("img")').first();
        await expect(imgRow).toBeVisible({ timeout: 10000 });
        await imgRow.dblclick();
        // Click on wallpaper.png to open in viewer
        const wallRow = page.locator('tr:has-text("wallpaper.png")').first();
        await expect(wallRow).toBeVisible({ timeout: 10000 });
        await wallRow.dblclick();
        // Image modal should be visible and image src set
        const imageModal = page.locator('#image-modal');
        await expect(imageModal).not.toHaveClass(/hidden/);
        const viewer = page.locator('#image-viewer');
        await expect(viewer).toHaveAttribute('src', /wallpaper\.png/);
    });
});
