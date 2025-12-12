// E2E: Reopen Finder after closing all tabs should render content and a fresh tab
const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    openFinderWindow,
    waitForFinderReady,
    getFinderAddTabButton,
    getFinderTabs,
} = require('../utils');

async function openFinder(page) {
    const finderWindow = await openFinderWindow(page);
    await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
    await waitForFinderReady(page);
    return finderWindow;
}

async function closeAllFinderTabs(page) {
    // Close until no instances remain
    let attempts = 0;
    while (attempts < 10) {
        // Check how many tabs exist across all Finder windows
        const tabs = page.locator('.modal.multi-window[id^="window-finder-"] .wt-tab');
        const count = await tabs.count();
        if (count === 0) break;

        // Click close button on last tab
        const closeBtn = tabs.nth(count - 1).locator('.wt-tab-close');
        await closeBtn.click();

        // Wait until tab count decreases or no instances remain
        await page.waitForFunction(
            prev => {
                try {
                    const tabsNow = document.querySelectorAll(
                        '.modal.multi-window[id^="window-finder-"] .wt-tab'
                    ).length;
                    const instanceCount = (window.WindowRegistry?.getAllWindows('finder') || [])
                        .length;
                    return instanceCount === 0 || tabsNow < prev;
                } catch {
                    return false;
                }
            },
            count,
            { timeout: 5000 }
        );
        attempts++;

        // Check if any instances remain
        const instanceCount = await page.evaluate(
            () => (window.WindowRegistry?.getAllWindows('finder') || []).length
        );
        if (instanceCount === 0) break;
    }

    // Verify no instances remain
    const finalCount = await page.evaluate(
        () => (window.WindowRegistry?.getAllWindows('finder') || []).length
    );
    expect(finalCount).toBe(0);
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
