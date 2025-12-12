// Finder item selection behavior (single, toggle, range)
const { test, expect } = require('@playwright/test');
const { waitForAppReady, openFinderWindow, waitForFinderReady } = require('../utils');

async function getListItems(page, finderWindow) {
    return await finderWindow.locator('#finder-list-container .finder-list-item');
}

async function selectItemByName(page, finderWindow, name, modifiers = {}) {
    const row = finderWindow
        .locator(`#finder-list-container .finder-list-item [data-item-name="${name}"]`)
        .first();
    await expect(row).toBeVisible();
    await row.click(modifiers);
}

async function getSelectedNames(page, finderWindow) {
    return await page.evaluate(
        wId => {
            const rows = Array.from(
                document.querySelectorAll(
                    `.modal.multi-window#${wId} #finder-list-container .finder-list-item`
                )
            );
            return rows
                .filter(
                    r =>
                        r.classList.contains('bg-blue-100') ||
                        r.classList.contains('dark:bg-blue-900')
                )
                .map(
                    r =>
                        r.getAttribute('data-item-name') ||
                        r.querySelector('[data-item-name]')?.getAttribute('data-item-name') ||
                        r.querySelector('.finder-item-name')?.textContent?.trim()
                );
        },
        await finderWindow.getAttribute('id')
    );
}

async function ensureComputerRoot(page, finderWindow) {
    // Click sidebar computer if present
    const computerBtn = finderWindow.locator('[data-finder-view="computer"]').first();
    if (await computerBtn.isVisible().catch(() => false)) {
        await computerBtn.click();
    }
}

async function openFinderAtRoot(page) {
    const finderWindow = await openFinderWindow(page);
    await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
    await waitForFinderReady(page);
    await ensureComputerRoot(page, finderWindow);
    return finderWindow;
}

async function openDocumentsIfExists(page, finderWindow) {
    const docEl = finderWindow
        .locator('#finder-list-container [data-item-name="Documents"]')
        .first();
    if (await docEl.isVisible().catch(() => false)) {
        await docEl.dblclick();
        // Wait for navigation
        await page.waitForTimeout(500);
    }
}

test.describe('Finder selection', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('single click selects one item', async ({ page }) => {
        const finderWindow = await openFinderAtRoot(page);

        // Ensure we have items to work with
        let items = await getListItems(page, finderWindow);
        let count = await items.count();

        // If root is empty, try opening Documents
        if (count < 2) {
            await openDocumentsIfExists(page, finderWindow);
            items = await getListItems(page, finderWindow);
            count = await items.count();
        }

        // If still empty, we need to skip or wait for items
        if (count === 0) {
            // Wait for items to appear in Computer view
            await page
                .waitForFunction(
                    () => {
                        const rows = Array.from(document.querySelectorAll('.finder-list-item'));
                        return rows.length > 0;
                    },
                    { timeout: 5000 }
                )
                .catch(() => {});
            items = await getListItems(page, finderWindow);
            count = await items.count();
        }

        if (count === 0) test.skip();

        // Click first row
        await items.nth(0).click();
        const classes = await items.nth(0).getAttribute('class');
        expect(classes).toMatch(/finder-list-item/);
        expect(classes).toMatch(/bg-blue-100|dark:bg-blue-900/);
    });

    test('Ctrl/Cmd toggles selection of items', async ({ page }) => {
        const finderWindow = await openFinderAtRoot(page);
        await openDocumentsIfExists(page, finderWindow);

        const items = await getListItems(page, finderWindow);
        const count = await items.count();
        if (count < 2) test.skip();

        await items.nth(0).click();
        await items.nth(1).click({ modifiers: ['Control'] });

        const selected = await getSelectedNames(page, finderWindow);
        expect(selected.length).toBe(2);
    });

    test('Shift selects range between items', async ({ page }) => {
        const finderWindow = await openFinderAtRoot(page);
        await openDocumentsIfExists(page, finderWindow);

        const items = await getListItems(page, finderWindow);
        const count = await items.count();
        if (count < 3) test.skip();

        // Anchor on 0, then range to 2
        await items.nth(0).click();
        await items.nth(2).click({ modifiers: ['Shift'] });

        const selected = await getSelectedNames(page, finderWindow);
        expect(selected.length).toBeGreaterThanOrEqual(3);
    });

    test('click on empty area clears selection', async ({ page }) => {
        const finderWindow = await openFinderAtRoot(page);
        await openDocumentsIfExists(page, finderWindow);

        const items = await getListItems(page, finderWindow);
        const count = await items.count();
        if (count < 1) test.skip();

        await items.nth(0).click();
        let selected = await getSelectedNames(page, finderWindow);
        expect(selected.length).toBe(1);

        // Click an ensured empty area inside the list container (bottom padding)
        const emptyArea = finderWindow.locator('#finder-empty-spacer').first();
        if (await emptyArea.isVisible().catch(() => false)) {
            await emptyArea.click();
        } else {
            // Fallback: click bottom area of list container
            const listContainer = finderWindow.locator('#finder-list-container').first();
            const box = await listContainer.boundingBox();
            if (box) {
                await listContainer.click({
                    position: { x: box.width / 2, y: box.height - 10 },
                });
            }
        }
        selected = await getSelectedNames(page, finderWindow);
        expect(selected.length).toBe(0);
    });
});
