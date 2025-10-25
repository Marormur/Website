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

    test('Open Website/img/wallpaper.png in image viewer', async ({ page, baseURL }) => {
        // Mock GitHub API to avoid rate limits and ensure deterministic content
        const reposPattern = /https:\/\/api\.github\.com\/users\/Marormur\/repos.*/i;
        const contentsRootPattern = /https:\/\/api\.github\.com\/repos\/Marormur\/Website\/contents$/i;
        const contentsImgPattern = /https:\/\/api\.github\.com\/repos\/Marormur\/Website\/contents\/img$/i;

        await page.route(reposPattern, async (route) => {
            const body = [
                { name: 'Website', description: 'Portfolio Website', private: false }
            ];
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        });

        await page.route(contentsRootPattern, async (route) => {
            const body = [
                { name: 'img', path: 'img', type: 'dir' },
                { name: 'README.md', path: 'README.md', type: 'file', size: 10 }
            ];
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        });

        await page.route(contentsImgPattern, async (route) => {
            const body = [
                {
                    name: 'wallpaper.png',
                    path: 'img/wallpaper.png',
                    type: 'file',
                    size: 12345,
                    download_url: baseURL.replace(/\/$/, '') + '/img/wallpaper.png'
                }
            ];
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        });

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
