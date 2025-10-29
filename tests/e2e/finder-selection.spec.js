// Finder item selection behavior (single, toggle, range)
const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('./utils');

const finderRoot = '#finder-modal:not(.hidden)';

async function getListItems(page) {
    return await page.locator(`${finderRoot} #finder-list-container .finder-list-item`);
}

async function selectItemByName(page, name, modifiers = {}) {
    const row = page
        .locator(
            `${finderRoot} #finder-list-container .finder-list-item [data-item-name="${name}"]`
        )
        .first();
    await expect(row).toBeVisible();
    await row.click(modifiers);
}

async function getSelectedNames(page) {
    return await page.evaluate(() => {
        const root = document.querySelector('#finder-modal')?.classList.contains('hidden')
            ? document
            : document;
        const rows = Array.from(
            document.querySelectorAll(
                '#finder-modal:not(.hidden) #finder-list-container .finder-list-item'
            )
        );
        return rows
            .filter(
                r => r.classList.contains('bg-blue-100') || r.classList.contains('dark:bg-blue-900')
            )
            .map(
                r =>
                    r.getAttribute('data-item-name') ||
                    r.querySelector('[data-item-name]')?.getAttribute('data-item-name') ||
                    r.querySelector('.finder-item-name')?.textContent?.trim()
            );
    });
}

async function ensureComputerRoot(page) {
    // Click sidebar computer if present
    const computerBtn = page.locator('[data-finder-view="computer"]').first();
    if (await computerBtn.isVisible().catch(() => false)) {
        await computerBtn.click();
    }
}

async function openFinderAtRoot(page) {
    await clickDockIcon(page, 'Finder Icon');
    await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);
    await ensureComputerRoot(page);
}

async function openDocumentsIfExists(page) {
    const el = page.locator('#finder-list-container [data-item-name="Documents"]').first();
    if (await el.isVisible().catch(() => false)) {
        await el.dblclick();
    }
}

test.describe('Finder selection', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('single click selects one item', async ({ page }) => {
        await openFinderAtRoot(page);
        await openDocumentsIfExists(page);

        const items = await getListItems(page);
        const count = await items.count();
        expect(count).toBeGreaterThan(0);

        // Click first row
        await items.nth(0).click();
        const classes = await items.nth(0).getAttribute('class');
        expect(classes).toMatch(/finder-list-item/);
        expect(classes).toMatch(/bg-blue-100|dark:bg-blue-900/);
    });

    test('Ctrl/Cmd toggles selection of items', async ({ page }) => {
        await openFinderAtRoot(page);
        await openDocumentsIfExists(page);

        const items = await getListItems(page);
        const count = await items.count();
        if (count < 2) test.skip();

        await items.nth(0).click();
        await items.nth(1).click({ modifiers: ['Control'] });

        const selected = await getSelectedNames(page);
        expect(selected.length).toBe(2);
    });

    test('Shift selects range between items', async ({ page }) => {
        await openFinderAtRoot(page);
        await openDocumentsIfExists(page);

        const items = await getListItems(page);
        const count = await items.count();
        if (count < 3) test.skip();

        // Anchor on 0, then range to 2
        await items.nth(0).click();
        await items.nth(2).click({ modifiers: ['Shift'] });

        const selected = await getSelectedNames(page);
        expect(selected.length).toBeGreaterThanOrEqual(3);
    });

    test('click on empty area clears selection', async ({ page }) => {
        await openFinderAtRoot(page);
        await openDocumentsIfExists(page);

        const items = await getListItems(page);
        const count = await items.count();
        if (count < 1) test.skip();

        await items.nth(0).click();
        let selected = await getSelectedNames(page);
        expect(selected.length).toBe(1);

        // Click an ensured empty area inside the list container (bottom padding)
        await page.waitForSelector(`${finderRoot} #finder-empty-spacer`, { state: 'visible' });
        await page.click(`${finderRoot} #finder-empty-spacer`);
        selected = await getSelectedNames(page);
        expect(selected.length).toBe(0);
    });
});
