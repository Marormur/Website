// E2E tests for Finder GitHub integration (inline browsing)
const { test, expect } = require('@playwright/test');
const { mockGithubRepoImageFlow } = require('./utils');

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

    test('Open Website/img/wallpaper.png in image viewer', async ({ page, baseURL }) => {
        // Use shared GitHub API mock to ensure deterministic content
        await mockGithubRepoImageFlow(page, baseURL);

        await openFinder(page);
        await openFinderGithub(page);
        // Guard against GitHub API issues: wait for either repo row or error/empty messages
        const websiteRow = page.locator('tr:has-text("Website")').first();
        const errorMsg = page
            .locator('text=/Repos konnten nicht geladen werden|Keine öffentlichen Repositories gefunden|Repositories could not be loaded|No public repositories found|Rate Limit/i')
            .first();
        const race = Promise.race([
            websiteRow.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'ok'),
            errorMsg.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error')
        ]);
        const outcome = await race;
        if (outcome !== 'ok') {
            test.skip(true, 'Skipping due to GitHub API being unavailable or empty.');
        }
        // Double click repo "Website"
        await expect(websiteRow).toBeVisible({ timeout: 20000 });
        await websiteRow.dblclick();
        // Open folder img
        // Wait for repo contents to load and show the 'img' folder
        await page.waitForSelector('tr:has-text("img")', { timeout: 20000 });
        const imgRow = page.locator('tr:has-text("img")').first();
        await expect(imgRow).toBeVisible({ timeout: 20000 });
        await imgRow.dblclick();
        // Click on wallpaper.png to open in viewer
        const wallRow = page.locator('tr:has-text("wallpaper.png")').first();
        await expect(wallRow).toBeVisible({ timeout: 20000 });
        await wallRow.dblclick();
        // Image modal should be visible and image src set
        const imageModal = page.locator('#image-modal');
        await expect(imageModal).not.toHaveClass(/hidden/);
        const viewer = page.locator('#image-viewer');
        await expect(viewer).toHaveAttribute('src', /wallpaper\.png/);
    });
});
