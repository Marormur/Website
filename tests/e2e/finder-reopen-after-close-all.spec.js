// E2E: Reopen Finder after closing all tabs should render content and a fresh tab
const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

async function openFinder(page) {
    await page.getByRole('img', { name: 'Finder Icon' }).click();
    await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);
}

async function closeAllFinderTabs(page) {
    // Close until modal hides
    let attempts = 0;
    while (attempts < 3) {
        const tabs = page.locator('#finder-tabs-container .wt-tab');
        const count = await tabs.count();
        if (count === 0) break;
        const closeBtn = tabs.nth(count - 1).locator('.wt-tab-close');
        await closeBtn.click();
        // Wait until either the modal hides or the tabs count decreases
        await page.waitForFunction(
            prev => {
                try {
                    const tabsNow = document.querySelectorAll(
                        '#finder-tabs-container .wt-tab'
                    ).length;
                    const modalHidden = document
                        .querySelector('#finder-modal')
                        ?.classList.contains('hidden');
                    return modalHidden || tabsNow < prev;
                } catch {
                    return false;
                }
            },
            count,
            { timeout: 20000 }
        );
        attempts++;
        const modalHidden = await page
            .locator('#finder-modal')
            .evaluate(el => el.classList.contains('hidden'));
        if (modalHidden) break;
    }
    await expect(page.locator('#finder-modal')).toHaveClass(/hidden/);
}

function visibleInstanceContainer(page) {
    return page.locator('.finder-instance-container:not(.hidden)');
}

test.describe('Finder reopen after closing all tabs', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('Reopen renders fresh content and tab', async ({ page }) => {
        // Open Finder and create a second tab
        await openFinder(page);
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await addButton.click();
        await expect(page.locator('#finder-tabs-container .wt-tab')).toHaveCount(2, {
            timeout: 5000,
        });

        // Now close all tabs (modal should hide)
        await closeAllFinderTabs(page);

        // Reopen Finder
        await openFinder(page);

        // Expect at least one tab present
        const tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(1);

        // Expect visible instance container with toolbar and content area
        const container = visibleInstanceContainer(page);
        await expect(container).toBeVisible();
        await expect(container.locator('#finder-toolbar')).toBeVisible();
        await expect(container.locator('#finder-content-area')).toBeVisible();
    });
});
