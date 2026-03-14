// E2E: Reopen Finder after closing all tabs should render content and a fresh tab
const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    getFinderAddTabButton,
    getFinderTabs,
    dismissWelcomeDialogIfPresent,
} = require('../utils');
const { openFinder } = require('../utils/window-helpers');

async function closeAllFinderTabs(page) {
    // More reliable than repeated UI clicks in headless mode.
    await page.evaluate(() => {
        try {
            const registry = window.WindowRegistry;
            const wins = registry?.getAllWindows?.('finder') || [];
            wins.forEach(win => {
                try {
                    const tabIds = Array.from(win.tabs?.keys?.() || []);
                    tabIds.forEach(id => win.removeTab?.(id));
                } catch {
                    // Ignore per-window issues; final assertion below validates outcome.
                }
            });
        } catch {
            // Ignore and fall through to assertion.
        }
    });

    // Verify no instances remain
    await page.waitForFunction(
        () => (window.WindowRegistry?.getAllWindows('finder') || []).length === 0,
        {
            timeout: 5000,
        }
    );
}

function visibleInstanceContainer(page, finderWindow) {
    // In the new architecture, each FinderView is a tab with a root element containing
    // .finder-content. We locate the visible tab by checking for the content area
    // and then navigate to the nearest .flex container that's not hidden
    return finderWindow.locator('div:has(.finder-content):not(.hidden)').first();
}

test.describe('Finder reopen after closing all tabs', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);
    });

    test('Reopen renders fresh content and tab', async ({ page }) => {
        // Open Finder and create a second tab
        let finderWindow = await openFinder(page);
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click();
        await expect(await getFinderTabs(page, finderWindow)).toHaveCount(2, {
            timeout: 5000,
        });

        // Now close all tabs (modal should hide)
        await closeAllFinderTabs(page);

        // Reopen Finder
        finderWindow = await openFinder(page);

        // Expect at least one tab present
        const tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(1);

        // Expect visible instance container with content
        const container = visibleInstanceContainer(page, finderWindow);
        await expect(container).toBeVisible();
        // Verify that the finder content area and toolbar are accessible
        await expect(
            container.locator('.finder-toolbar, [data-finder-content]').first()
        ).toBeVisible();
        await expect(
            container
                .locator('.finder-content, #finder-content-area, [data-finder-content]')
                .first()
        ).toBeVisible();
    });
});
