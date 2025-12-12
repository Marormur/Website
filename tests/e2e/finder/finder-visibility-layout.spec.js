// E2E tests validating Finder instance visibility and layout
/* eslint-disable no-restricted-syntax */
const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    openFinderWindow,
    getFinderAddTabButton,
    getFinderTabs,
    waitForFinderReady,
} = require('../utils');

async function countVisibleInstanceContainers(page, finderWindow) {
    const windowId = await finderWindow.getAttribute('id');
    return await page.evaluate(winId => {
        try {
            // In new architecture, each tab is a div with .finder-content inside
            // Count divs that have .finder-content and are not hidden
            const tabContainer = document.querySelector(`#${winId}-container`);
            if (!tabContainer) return 0;
            const viewElements = Array.from(tabContainer.children);
            return viewElements.filter(el => {
                const notHidden = !el.classList.contains('hidden');
                const hasContent = el.querySelector('.finder-content');
                return notHidden && hasContent;
            }).length;
        } catch {
            return 0;
        }
    }, windowId);
}

async function getVisibleAndParentWidths(page, finderWindow) {
    const windowId = await finderWindow.getAttribute('id');
    return await page.evaluate(winId => {
        try {
            // Get the container element
            const container = document.querySelector(`#${winId}-container`);
            if (!container) return { parent: 0, visible: 0 };

            // Find the first visible tab (div with .finder-content that's not hidden)
            const visibleTab = Array.from(container.children).find(el => {
                const notHidden = !el.classList.contains('hidden');
                const hasContent = el.querySelector('.finder-content');
                return notHidden && hasContent;
            });

            if (!visibleTab) {
                return { parent: Math.round(container.getBoundingClientRect().width), visible: 0 };
            }

            const parentWidth = container.getBoundingClientRect().width;
            const visibleWidth = visibleTab.getBoundingClientRect().width;
            return { parent: Math.round(parentWidth), visible: Math.round(visibleWidth) };
        } catch {
            return { parent: 0, visible: 0 };
        }
    }, windowId);
}

test.describe('Finder visibility and full-width layout', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('only one instance is visible when multiple tabs exist', async ({ page }) => {
        // Open Finder (multi-window) and ensure readiness
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Create a second Finder instance via the tabs add button
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await expect(addButton).toBeVisible();
        await addButton.click();

        // Wait for DOM updates
        await page.waitForTimeout(250);

        // Verify there are two containers and only one visible
        const total = await page.evaluate(
            winId => {
                const container = document.querySelector(`#${winId}-container`);
                if (!container) return 0;
                // Count all tabs (children with .finder-content)
                return Array.from(container.children).filter(el =>
                    el.querySelector('.finder-content')
                ).length;
            },
            await finderWindow.getAttribute('id')
        );
        expect(total).toBeGreaterThanOrEqual(2);
        const visible = await countVisibleInstanceContainers(page, finderWindow);
        expect(visible).toBe(1);

        // Switch to the first tab and verify visibility remains singular
        const tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs.nth(0)).toBeVisible();
        await tabs.nth(0).click();
        await page.waitForTimeout(150);
        const visibleAfterSwitch = await countVisibleInstanceContainers(page, finderWindow);
        expect(visibleAfterSwitch).toBe(1);
    });

    test('visible instance fills parent container width', async ({ page }) => {
        // Open Finder and ensure an instance exists
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Create another instance to ensure tabbed layout is active
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await expect(addButton).toBeVisible();
        await addButton.click();
        await page.waitForTimeout(250);

        // Measure widths
        const { parent, visible } = await getVisibleAndParentWidths(page, finderWindow);

        // Allow tiny rounding differences (<= 2px)
        expect(visible).toBeGreaterThanOrEqual(parent - 2);
        expect(Math.abs(parent - visible)).toBeLessThanOrEqual(2);
    });

    test('after reload and session restore, only one instance is visible', async ({ page }) => {
        // Open Finder and create a second instance
        let finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await expect(addButton).toBeVisible();
        await addButton.click();
        await page.waitForTimeout(250);

        // Reload the page (session manager should restore instances)
        await page.reload();
        await waitForAppReady(page);

        // If the Finder window isn't open automatically, open it
        let visibleFinder = page.locator('.modal.multi-window[id^="window-finder-"]');
        if ((await visibleFinder.count()) === 0) {
            finderWindow = await openFinderWindow(page);
        } else {
            finderWindow = visibleFinder.first();
        }

        // Verify only one instance container is visible
        await page.waitForTimeout(250);
        const visible = await countVisibleInstanceContainers(page, finderWindow);
        expect(visible).toBe(1);
    });
});
