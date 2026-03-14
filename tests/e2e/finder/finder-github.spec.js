// E2E tests for Finder GitHub integration (inline browsing)
const { test, expect } = require('@playwright/test');
const { waitForAppReady, openFinderWindow, mockGithubRepoImageFlow } = require('../utils');

async function dismissWelcomeDialog(page) {
    const overlay = page.locator('#welcome-dialog-overlay');
    if (!(await overlay.isVisible().catch(() => false))) {
        return;
    }

    const continueButton = page.locator('#welcome-dialog-continue');
    if (await continueButton.isVisible().catch(() => false)) {
        await continueButton.click();
        await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
    }
}

async function openFinderGithub(page) {
    // Ensure Finder window is opened and visible, then open the GitHub sidebar
    const finderWindow = await openFinderWindow(page);
    const githubBtn = finderWindow
        .locator('.tab-content:not(.hidden) [data-sidebar-id="github"]')
        .first();
    await githubBtn.waitFor({ state: 'visible', timeout: 5000 });
    await githubBtn.click();

    return finderWindow;
}

test.describe('Finder GitHub integration', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        // Forward page console messages to test output for debugging
        page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));
        page.on('pageerror', err => console.log('[PAGE][ERROR]', err.message));
        await waitForAppReady(page);
        await dismissWelcomeDialog(page);
    });

    test('Clicking GitHub in Finder does not open Projects window', async ({ page }) => {
        await openFinderGithub(page);
        // Projects modal should remain hidden regardless
        const projectsModal = page.locator('#projects-modal');
        await expect(projectsModal).toHaveClass(/hidden/);
    });

    test('Open Website/img/wallpaper.png in image viewer', async ({ page, baseURL }) => {
        // Use shared GitHub API mock to ensure deterministic content
        await mockGithubRepoImageFlow(page, baseURL);

        const finderWindow = await openFinderGithub(page);
        // Guard against GitHub API issues: wait for either repo row or error/empty messages
        const websiteRow = finderWindow
            .locator('.tab-content:not(.hidden) tr:has-text("Website")')
            .first();
        const errorMsg = finderWindow
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
        await finderWindow
            .locator('.tab-content:not(.hidden) tr:has-text("img")')
            .first()
            .waitFor({ state: 'visible', timeout: 20000 });
        const imgRow = finderWindow.locator('.tab-content:not(.hidden) tr:has-text("img")').first();
        await expect(imgRow).toBeVisible({ timeout: 20000 });
        await imgRow.dblclick();
        // Click on wallpaper.png to open in viewer
        const wallRow = finderWindow
            .locator('.tab-content:not(.hidden) tr:has-text("wallpaper.png")')
            .first();
        await expect(wallRow).toBeVisible({ timeout: 20000 });
        await wallRow.dblclick();
        // Current behavior opens an image in a Photos window instance.
        await page.waitForFunction(
            () => (window.WindowRegistry?.getAllWindows?.('photos') || []).length > 0,
            { timeout: 10000 }
        );

        const photosWindowCount = await page.evaluate(
            () => (window.WindowRegistry?.getAllWindows?.('photos') || []).length
        );
        expect(photosWindowCount).toBeGreaterThan(0);
    });

    test('Back and forward switch GitHub folder contents reliably', async ({ page, baseURL }) => {
        await mockGithubRepoImageFlow(page, baseURL);

        const finder = await openFinderWindow(page);
        const githubBtn = finder.locator('[data-sidebar-id="github"]');
        await githubBtn.waitFor({ state: 'visible', timeout: 5000 });
        await githubBtn.click();

        const websiteRow = finder.locator('tr:has-text("Website")').first();
        await expect(websiteRow).toBeVisible({ timeout: 20000 });
        await websiteRow.dblclick();

        const imgRow = finder.locator('tr:has-text("img")').first();
        await expect(imgRow).toBeVisible({ timeout: 20000 });
        await imgRow.dblclick();

        const wallpaperRow = finder.locator('tr:has-text("wallpaper.png")').first();
        await expect(wallpaperRow).toBeVisible({ timeout: 20000 });

        const backButton = finder.locator('[data-action="navigate-back"]').first();
        const forwardButton = finder.locator('[data-action="navigate-forward"]').first();

        await backButton.click();
        await expect(imgRow).toBeVisible({ timeout: 20000 });
        await expect(finder.locator('tr:has-text("README.md")').first()).toBeVisible({
            timeout: 20000,
        });
        await expect(wallpaperRow).toHaveCount(0);

        await forwardButton.click();
        await expect(wallpaperRow).toBeVisible({ timeout: 20000 });
        await expect(finder.locator('tr:has-text("README.md")').first()).toHaveCount(0);
    });
});
