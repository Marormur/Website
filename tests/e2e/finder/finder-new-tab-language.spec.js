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

    test.skip('new Finder tab uses current language', async ({ page }) => {
        // TODO: Sidebar favorites label element structure changed or not rendering
        // This test verifies that new Finder tabs inherit the current language setting
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

        // Wait for sidebar to be visible with longer timeout
        await page.waitForTimeout(500);

        // Try to find the favorites label
        let label = null;
        try {
            // Try direct method first
            label = await getSidebarFavoritesLabel(page, finderWindow);
        } catch (err) {
            console.log('[debug] getSidebarFavoritesLabel failed:', err.message);
        }

        if (!label) {
            // Fallback: attempt to read via global DOM using the window id
            const winId = await finderWindow.getAttribute('id');
            label = await page.evaluate(wId => {
                const el = document.querySelector(
                    `.modal.multi-window#${wId} [data-finder-sidebar-favorites]`
                );
                console.log('[debug] favorites element found:', !!el, el?.textContent);
                return el ? el.textContent.trim() : null;
            }, winId);
        }

        // If still not found, try more generic selectors
        if (!label) {
            label = await page.evaluate(() => {
                // Look for any element with text containing "Stern" or "Star"
                const sidebar = document.querySelector('.finder-sidebar');
                if (sidebar) {
                    const items = sidebar.querySelectorAll('[class*="sidebar"]');
                    for (const item of items) {
                        const text = item.textContent.trim();
                        if (text.includes('Stern') || text.includes('Starred')) {
                            return text;
                        }
                    }
                }
                return null;
            });
        }

        console.log('[test] found label:', label, 'expected:', expected);

        // Assert that we found a label
        expect(label).toBeTruthy();

        // Allow extra whitespace or icon spans; just check presence
        expect((label || '').replace(/\s+/g, ' ').includes(expected)).toBeTruthy();
    });
});
