const { test, expect } = require('@playwright/test');
const {
    dismissWelcomeDialogIfPresent,
    waitForAppReady,
    openFinderWindow,
    mockGithubRepoImageFlow,
} = require('../utils');

function githubItem(finderWindow, name) {
    return finderWindow.locator(`[data-item-name="${name}"]`).first();
}

async function openGithubItem(finderWindow, name) {
    const item = githubItem(finderWindow, name);
    await expect(item).toBeVisible({ timeout: 20000 });
    await item.dblclick();
    return item;
}

async function openGithubItemAndWait(page, finderWindow, name, nextItemName) {
    const nextItem = githubItem(finderWindow, nextItemName);

    await openGithubItem(finderWindow, name);

    try {
        await expect(nextItem).toBeVisible({ timeout: 2500 });
        return;
    } catch {
        const item = githubItem(finderWindow, name);
        await item.click({ force: true });
        await page.keyboard.press('Enter');
    }

    await expect(nextItem).toBeVisible({ timeout: 20000 });
}

async function openLaunchpad(page) {
    await page.evaluate(() => {
        const modal = document.querySelector('#launchpad-modal');
        if (modal && modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
        }

        if (window.LaunchpadSystem && typeof window.LaunchpadSystem.init === 'function') {
            const container = document.querySelector('#launchpad-container');
            if (container) {
                window.LaunchpadSystem.init(container);
            }
        }
    });

    await page.waitForFunction(
        () => {
            const modal = document.querySelector('#launchpad-modal');
            const grid = document.querySelector('#launchpad-container #launchpad-apps-grid');
            return !!modal && !modal.classList.contains('hidden') && !!grid;
        },
        { timeout: 20000 }
    );
}

function getPreviewWindow(page) {
    return page.locator('.modal.multi-window.preview-window-shell[id^="window-preview-"]').first();
}

test.describe('Preview App', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);
    });

    test('Preview can be opened from Launchpad', async ({ page }) => {
        const previewWindow = getPreviewWindow(page);
        await expect(previewWindow).toHaveCount(0);

        await openLaunchpad(page);
        await page.locator('.launchpad-app-button[data-window-id="preview-modal"]').click();

        await expect(page.locator('#launchpad-modal')).toHaveClass(/hidden/);
        await expect(previewWindow).toBeVisible();
        await expect(previewWindow.locator('.preview-stage-empty')).toBeVisible();
    });

    test('Finder opens GitHub images in Preview instead of Photos', async ({ page, baseURL }) => {
        await mockGithubRepoImageFlow(page, baseURL);

        const finderWindow = await openFinderWindow(page);
        const githubButton = finderWindow.locator('[data-sidebar-id="github"]');
        await githubButton.click();

        const websiteRow = githubItem(finderWindow, 'Website');
        await expect(websiteRow).toBeVisible({ timeout: 20000 });
        await openGithubItemAndWait(page, finderWindow, 'Website', 'img');

        const imgRow = githubItem(finderWindow, 'img');
        await expect(imgRow).toBeVisible({ timeout: 20000 });
        await openGithubItemAndWait(page, finderWindow, 'img', 'wallpaper.png');

        const wallpaperRow = githubItem(finderWindow, 'wallpaper.png');
        await expect(wallpaperRow).toBeVisible({ timeout: 20000 });
        await openGithubItem(finderWindow, 'wallpaper.png');

        const previewWindow = getPreviewWindow(page);
        await expect(previewWindow).toBeVisible({ timeout: 10000 });
        await expect(previewWindow.locator('.preview-stage-image')).toBeVisible();

        await expect
            .poll(async () =>
                page.evaluate(() => (window.WindowRegistry?.getAllWindows?.('photos') || []).length)
            )
            .toBe(0);
    });
});
