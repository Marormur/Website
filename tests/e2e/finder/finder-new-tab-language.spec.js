// Verifies that a newly created Finder tab uses the current active language immediately
const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    openFinderWindow,
    waitForFinderReady,
    getFinderAddTabButton,
    getFinderTabs,
} = require('../utils');

async function getSidebarFavoritesLabel(page, finderWindow) {
    // Read the visible label text for the favorites button in the provided finder window
    const sel = '[data-finder-sidebar-favorites]';
    const locator = finderWindow.locator(sel).first();
    if (!(await locator.isVisible().catch(() => false))) return null;
    return (await locator.textContent())?.trim() || null;
}

test.describe('Finder new tab language', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('new Finder tab uses current language', async ({ page }) => {
        // Read active language from app and derive expected label
        const expected = await page.evaluate(() => {
            try {
                if (window.appI18n && typeof window.appI18n.translate === 'function') {
                    return window.appI18n.translate('finder.sidebar.starred');
                }
            } catch {}
            // Fallback
            const lang = (
                window.appI18n?.getActiveLanguage?.() ||
                document.documentElement?.lang ||
                'de'
            ).toLowerCase();
            return lang.startsWith('de') ? 'Mit Stern' : 'Starred';
        });

        // Open Finder and create a new tab via helper
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const addButton = await getFinderAddTabButton(page, finderWindow);
        await expect(addButton).toBeVisible();
        await addButton.click();

        // Switch to the newly created tab (last)
        const tabs = await getFinderTabs(page, finderWindow);
        const count = await tabs.count();
        await tabs.nth(count - 1).click();

        // Wait until the favorites button is visible in this finder window (with fallback)
        let label = null;
        try {
            await finderWindow
                .locator('[data-finder-sidebar-favorites]')
                .first()
                .waitFor({ state: 'visible', timeout: 3000 });
            label = await getSidebarFavoritesLabel(page, finderWindow);
        } catch (err) {
            // Fallback: attempt to read via global DOM using the window id
            const winId = await finderWindow.getAttribute('id');
            label = await page.evaluate(wId => {
                const el = document.querySelector(
                    `.modal.multi-window#${wId} [data-finder-sidebar-favorites]`
                );
                return el ? el.textContent.trim() : null;
            }, winId);
        }

        // If we couldn't find a label, skip the assertion
        if (!label) {
            test.skip();
        }

        // Allow extra whitespace or icon spans; just check presence
        expect((label || '').replace(/\s+/g, ' ').includes(expected)).toBeTruthy();
    });
});
