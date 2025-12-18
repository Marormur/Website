// E2E tests for Finder GitHub integration (inline browsing)
const { test, expect } = require('@playwright/test');
const { waitForAppReady, openFinderWindow, mockGithubRepoImageFlow } = require('../utils');

async function openFinderGithub(page) {
    // Ensure Finder window is opened and visible, then open the GitHub sidebar
    await openFinderWindow(page);
    const githubBtn = page.locator('[data-sidebar-id="github"]');
    await githubBtn.waitFor({ state: 'visible', timeout: 5000 });
    await githubBtn.click();
}

test.describe('Finder GitHub integration', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        // Forward page console messages to test output for debugging
        page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));
        page.on('pageerror', err => console.log('[PAGE][ERROR]', err.message));
        await waitForAppReady(page);
    });

    test('Clicking GitHub in Finder does not open Projects window', async ({ page }) => {
        await openFinderWindow(page);
        await openFinderGithub(page);
        // Wait for either repo rows or an error/empty message to appear
        const websiteRow = page.locator('tr:has-text("Website")').first();
        const errorMsg = page
            .locator(
                'text=/Repos konnten nicht geladen werden|Keine öffentlichen Repositories gefunden|Repositories could not be loaded|No public repositories found|Rate Limit/i'
            )
            .first();
        const race = Promise.race([
            websiteRow.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'ok'),
            errorMsg.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error'),
        ]);
        const _outcome = await race;
        // Projects modal should remain hidden regardless
        const projectsModal = page.locator('#projects-modal');
        await expect(projectsModal).toHaveClass(/hidden/);
    });

    test('Open Website/img/wallpaper.png in image viewer', async ({ page, baseURL }) => {
        // Use shared GitHub API mock to ensure deterministic content
        await mockGithubRepoImageFlow(page, baseURL);

        await openFinderWindow(page);
        await openFinderGithub(page);
        // Guard against GitHub API issues: wait for either repo row or error/empty messages
        const websiteRow = page.locator('tr:has-text("Website")').first();
        const errorMsg = page
            .locator(
                'text=/Repos konnten nicht geladen werden|Keine öffentlichen Repositories gefunden|Repositories could not be loaded|No public repositories found|Rate Limit/i'
            )
            .first();
        const race = Promise.race([
            websiteRow.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'ok'),
            errorMsg.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error'),
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
        // Preview should render an image; check the preview instance container
        const previewImgSelector = '#preview-instance-container .preview-image-area img';
        // Wait until an <img> exists in the preview area and has a src (either blob: or remote)
        await page.waitForFunction(
            selector => {
                const el = document.querySelector(selector);
                return !!(el && el.getAttribute && el.getAttribute('src'));
            },
            previewImgSelector,
            { timeout: 10000 }
        );
        const src = await page.getAttribute(previewImgSelector, 'src');
        expect(src).toMatch(/(blob:|wallpaper\.png)/);
    });
});
