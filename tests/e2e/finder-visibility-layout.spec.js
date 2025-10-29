// E2E tests validating Finder instance visibility and layout
/* eslint-disable no-restricted-syntax */
const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('./utils');

async function countVisibleInstanceContainers(page) {
    return await page.evaluate(() => {
        const nodes = Array.from(
            document.querySelectorAll('#finder-container .finder-instance-container')
        );
        return nodes.filter(el => !el.classList.contains('hidden')).length;
    });
}

async function getVisibleAndParentWidths(page) {
    return await page.evaluate(() => {
        const parent = document.getElementById('finder-container');
        if (!parent) return { parent: 0, visible: 0 };
        const visible = Array.from(parent.querySelectorAll('.finder-instance-container')).find(
            el => !el.classList.contains('hidden')
        );
        if (!visible) return { parent: parent.getBoundingClientRect().width, visible: 0 };
        const parentWidth = parent.getBoundingClientRect().width;
        const visibleWidth = visible.getBoundingClientRect().width;
        return { parent: Math.round(parentWidth), visible: Math.round(visibleWidth) };
    });
}

test.describe('Finder visibility and full-width layout', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('only one instance is visible when multiple tabs exist', async ({ page }) => {
        // Open Finder
        await clickDockIcon(page, 'Finder Icon');
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Create a second Finder instance via the tabs add button
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await expect(addButton).toBeVisible();
        await addButton.click();

        // Wait for DOM updates
        await page.waitForTimeout(250);

        // Verify there are two containers and only one visible
        const total = await page.locator('#finder-container .finder-instance-container').count();
        expect(total).toBeGreaterThanOrEqual(2);
        const visible = await countVisibleInstanceContainers(page);
        expect(visible).toBe(1);

        // Switch to the first tab and verify visibility remains singular
        const tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs.nth(0)).toBeVisible();
        await tabs.nth(0).click();
        await page.waitForTimeout(150);
        const visibleAfterSwitch = await countVisibleInstanceContainers(page);
        expect(visibleAfterSwitch).toBe(1);
    });

    test('visible instance fills parent container width', async ({ page }) => {
        // Open Finder and ensure an instance exists
        await clickDockIcon(page, 'Finder Icon');
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

        // Create another instance to ensure tabbed layout is active
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await expect(addButton).toBeVisible();
        await addButton.click();
        await page.waitForTimeout(250);

        // Measure widths
        const { parent, visible } = await getVisibleAndParentWidths(page);

        // Allow tiny rounding differences (<= 2px)
        expect(visible).toBeGreaterThanOrEqual(parent - 2);
        expect(Math.abs(parent - visible)).toBeLessThanOrEqual(2);
    });

    test('after reload and session restore, only one instance is visible', async ({ page }) => {
        // Open Finder and create a second instance
        await clickDockIcon(page, 'Finder Icon');
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await expect(addButton).toBeVisible();
        await addButton.click();
        await page.waitForTimeout(250);

        // Reload the page (session manager should restore instances)
        await page.reload();
        await waitForAppReady(page);

        // If the Finder modal isn't open automatically, open it
        const finderModal = page.locator('#finder-modal');
        const isHidden = await finderModal.getAttribute('class');
        if (!isHidden || /hidden/.test(isHidden)) {
            await clickDockIcon(page, 'Finder Icon');
        }

        // Verify only one instance container is visible
        await page.waitForTimeout(250);
        const visible = await countVisibleInstanceContainers(page);
        expect(visible).toBe(1);
    });
});
