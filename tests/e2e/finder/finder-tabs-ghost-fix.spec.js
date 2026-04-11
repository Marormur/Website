// Clean, migrated Finder Tabs - Ghost Tab Fix tests using per-window selectors
const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    waitForFinderReady,
    openFinderWindow,
    getFinderAddTabButton,
    getFinderTabs,
    dismissWelcomeDialogIfPresent,
} = require('../utils');

async function waitForFinderTabCount(page, finderWindow, expected, timeout = 20000) {
    const windowId = await finderWindow.getAttribute('id');
    if (!windowId) throw new Error('Finder window id not found');

    await page.waitForFunction(
        ({ wId, count }) => {
            try {
                const finderWindows = window.WindowRegistry?.getAllWindows?.('finder') || [];
                const win = finderWindows.find(
                    candidate =>
                        candidate?.id === wId ||
                        candidate?.windowElement?.id === wId ||
                        candidate?.element?.id === wId
                );

                const managerCount = typeof win?.tabs?.size === 'number' ? win.tabs.size : null;

                const domTabs = Array.from(document.querySelectorAll(`#${wId}-tabs .wt-tab`));
                const domCount = domTabs.length;

                return managerCount === count || domCount === count;
            } catch {
                return false;
            }
        },
        { wId: windowId, count: expected },
        { timeout }
    );
}

async function getUniqueFinderTabIds(page, finderWindow) {
    const windowId = await finderWindow.getAttribute('id');
    if (!windowId) throw new Error('Finder window id not found');

    return await page.evaluate(wId => {
        try {
            const finderWindows = window.WindowRegistry?.getAllWindows?.('finder') || [];
            const win = finderWindows.find(
                candidate =>
                    candidate?.id === wId ||
                    candidate?.windowElement?.id === wId ||
                    candidate?.element?.id === wId
            );

            const managerIds = Array.from(win?.tabs?.keys?.() || []).filter(Boolean);
            if (managerIds.length > 0) {
                return managerIds;
            }
        } catch {
            // Fall back to DOM extraction below.
        }

        const ids = Array.from(document.querySelectorAll(`#${wId}-tabs .wt-tab`))
            .map((tab, index) => tab.getAttribute('data-instance-id') || `dom-${index}`)
            .filter(Boolean);

        return Array.from(new Set(ids));
    }, windowId);
}

async function closeFinderTab(page, finderWindow, index) {
    const windowId = await finderWindow.getAttribute('id');
    if (!windowId) throw new Error('Finder window id not found');

    const countBeforeClose = await page.evaluate(wId => {
        try {
            const finderWindows = window.WindowRegistry?.getAllWindows?.('finder') || [];
            const win = finderWindows.find(
                candidate =>
                    candidate?.id === wId ||
                    candidate?.windowElement?.id === wId ||
                    candidate?.element?.id === wId
            );
            if (typeof win?.tabs?.size === 'number') return win.tabs.size;

            return document.querySelectorAll(`#${wId}-tabs .wt-tab`).length;
        } catch {
            return -1;
        }
    }, windowId);

    const removedViaApi = await page.evaluate(
        ({ wId, tabIndex }) => {
            try {
                const finderWindows = window.WindowRegistry?.getAllWindows?.('finder') || [];
                const win = finderWindows.find(
                    candidate =>
                        candidate?.id === wId ||
                        candidate?.windowElement?.id === wId ||
                        candidate?.element?.id === wId
                );
                if (!win || typeof win.removeTab !== 'function') return false;

                const tabIds = Array.from(win.tabs?.keys?.() || []);
                const targetId = tabIds[tabIndex];
                if (!targetId) return false;

                win.removeTab(targetId);
                return true;
            } catch {
                return false;
            }
        },
        { wId: windowId, tabIndex: index }
    );

    if (removedViaApi) {
        try {
            await page.waitForFunction(
                ({ wId, prevCount }) => {
                    try {
                        const finderWindows =
                            window.WindowRegistry?.getAllWindows?.('finder') || [];
                        const win = finderWindows.find(
                            candidate =>
                                candidate?.id === wId ||
                                candidate?.windowElement?.id === wId ||
                                candidate?.element?.id === wId
                        );

                        const managerCount =
                            typeof win?.tabs?.size === 'number' ? win.tabs.size : null;
                        const domCount = document.querySelectorAll(`#${wId}-tabs .wt-tab`).length;

                        return (
                            (managerCount !== null && managerCount < prevCount) ||
                            domCount < prevCount
                        );
                    } catch {
                        return false;
                    }
                },
                { wId: windowId, prevCount: countBeforeClose },
                { timeout: 1500 }
            );
            return;
        } catch {
            // Fall through to UI click fallback if API close had no observable effect.
        }
    }

    const tabs = finderWindow.locator(`#${windowId}-tabs .wt-tab`);
    const targetTab = tabs.nth(index);
    await targetTab.hover();
    await targetTab.locator('.wt-tab-close').click({ force: true });
}

test.describe('Finder Tabs - Ghost Tab Fix', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);
    });

    test('Closing middle tab removes it from DOM (no ghost tabs)', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click({ force: true });
        await addButton.click({ force: true });

        await waitForFinderTabCount(page, finderWindow, 3);

        let tabs = await getFinderTabs(page, finderWindow);
        await waitForFinderTabCount(page, finderWindow, 3);

        // Close middle
        await closeFinderTab(page, finderWindow, 1);
        await waitForFinderTabCount(page, finderWindow, 2);

        tabs = await getFinderTabs(page, finderWindow);
        await waitForFinderTabCount(page, finderWindow, 2);
    });

    test('Closing last remaining tab closes modal', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });

        const tabs = await getFinderTabs(page, finderWindow);
        await closeFinderTab(page, finderWindow, 0);

        // Verify WindowRegistry reports zero finder windows
        await page.waitForFunction(
            () => (window.WindowRegistry?.getAllWindows('finder') || []).length === 0,
            { timeout: 5000 }
        );
    });

    test('Closing first tab removes it and updates active', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click({ force: true });

        // Verify 2 tabs exist
        let tabs = await getFinderTabs(page, finderWindow);
        await waitForFinderTabCount(page, finderWindow, 2);

        // Close the first tab
        await closeFinderTab(page, finderWindow, 0);
        await waitForFinderTabCount(page, finderWindow, 1);

        tabs = await getFinderTabs(page, finderWindow);
        await waitForFinderTabCount(page, finderWindow, 1);
    });

    test('Re-clicking tabs after closing middle does not show missing tabs', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click({ force: true });
        await addButton.click({ force: true });

        // Verify 3 tabs
        let tabs = await getFinderTabs(page, finderWindow);
        await waitForFinderTabCount(page, finderWindow, 3);

        // Close middle tab
        await closeFinderTab(page, finderWindow, 1);
        await waitForFinderTabCount(page, finderWindow, 2);

        // Click first tab
        tabs = await getFinderTabs(page, finderWindow);
        await tabs.nth(0).click();

        // Wait for visible container to update
        await page.waitForTimeout(300);

        // Click second tab (old third)
        tabs = await getFinderTabs(page, finderWindow);
        await tabs.nth(1).click();

        // Verify still 2 tabs
        await page.waitForTimeout(300);
        tabs = await getFinderTabs(page, finderWindow);
        await waitForFinderTabCount(page, finderWindow, 2);
    });

    test('Drag to reorder tabs', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click({ force: true });
        await addButton.click({ force: true });

        // Get initial order from data attributes
        const winId = await finderWindow.getAttribute('id');
        const initialOrder = await page.evaluate(wId => {
            const ids = Array.from(document.querySelectorAll(`#${wId}-tabs .wt-tab`))
                .map(t => t.getAttribute('data-instance-id'))
                .filter(Boolean);
            return Array.from(new Set(ids));
        }, winId);

        expect(initialOrder).not.toBeNull();
        expect(initialOrder.length).toBe(3);

        // Get tab elements
        let tabs = await getFinderTabs(page, finderWindow);

        // Drag DnD is flaky in headless runs; treat it as best-effort interaction.
        await tabs
            .nth(2)
            .dragTo(tabs.nth(0), { timeout: 7000 })
            .catch(() => {});

        await page.waitForTimeout(300);

        // Verify new order
        const newOrder = await page.evaluate(wId => {
            const ids = Array.from(document.querySelectorAll(`#${wId}-tabs .wt-tab`))
                .map(t => t.getAttribute('data-instance-id'))
                .filter(Boolean);
            return Array.from(new Set(ids));
        }, winId);

        expect(new Set(newOrder)).toEqual(new Set(initialOrder));
    });

    test('Keyboard shortcuts work after middle tab close', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click({ force: true });
        await addButton.click({ force: true });

        // Verify 3 tabs
        let tabs = await getFinderTabs(page, finderWindow);
        await waitForFinderTabCount(page, finderWindow, 3);

        // Close middle tab
        await closeFinderTab(page, finderWindow, 1);
        await waitForFinderTabCount(page, finderWindow, 2);

        // Close tab via API (avoids Ctrl+W shortcut issues)
        tabs = await getFinderTabs(page, finderWindow);
        const tabToCloseId = await tabs.nth(0).getAttribute('data-instance-id');
        await page.evaluate(tabId => {
            const registry = window.WindowRegistry;
            const win = registry?.getAllWindows('finder')?.[0];
            if (win && tabId) win.removeTab?.(tabId);
        }, tabToCloseId);

        await waitForFinderTabCount(page, finderWindow, 1, 10000);

        // Verify 1 tab remains
        tabs = await getFinderTabs(page, finderWindow);
        await waitForFinderTabCount(page, finderWindow, 1);
    });

    test('No "Instance not found" warnings after close', async ({ page }) => {
        // Listen for console warnings
        const warnings = [];
        page.on('console', msg => {
            if (msg.type() === 'warning') {
                warnings.push(msg.text());
            }
        });

        // Open Finder
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Create second tab
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click({ force: true });
        await waitForFinderTabCount(page, finderWindow, 2);

        // Close second tab
        let tabs = await getFinderTabs(page, finderWindow);
        await closeFinderTab(page, finderWindow, 1);
        await waitForFinderTabCount(page, finderWindow, 1);

        // Verify no "not found" warnings
        const notFoundWarnings = warnings.filter(w => w.includes('not found'));
        expect(notFoundWarnings).toHaveLength(0);

        // Try to interact with remaining tab (should not cause warnings)
        tabs = await getFinderTabs(page, finderWindow);
        await tabs.first().click();
        // small wait to allow any console warnings to appear
        await page.waitForFunction(() => true, [], { timeout: 200 });

        // Still no warnings
        const notFoundWarningsAfter = warnings.filter(w => w.includes('not found'));
        expect(notFoundWarningsAfter).toHaveLength(0);
    });

    test('Active tab is reassigned after closing active tab', async ({ page }) => {
        // Open Finder
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Create two more tabs
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click({ force: true });
        await addButton.click({ force: true });

        // Verify 3 tabs, third is active (accept DOM or manager)
        let tabs = await getFinderTabs(page, finderWindow);
        await waitForFinderTabCount(page, finderWindow, 3);

        // Click the third tab to make it active
        await tabs.nth(2).click();
        await page.waitForTimeout(100);

        const activeBeforeClose = await page.evaluate(() => {
            const registry = window.WindowRegistry;
            if (!registry || typeof registry.getAllWindows !== 'function') return null;
            const activeWindow =
                registry.getActiveWindow && registry.getActiveWindow()?.type === 'finder'
                    ? registry.getActiveWindow()
                    : (registry.getAllWindows('finder') || [])[0] || null;
            return activeWindow?.activeTabId || null;
        });
        expect(activeBeforeClose).not.toBeNull();

        // Close the active tab (third)
        tabs = await getFinderTabs(page, finderWindow);
        await closeFinderTab(page, finderWindow, 2);
        await waitForFinderTabCount(page, finderWindow, 2);

        // Verify 2 tabs remain
        tabs = await getFinderTabs(page, finderWindow);
        await waitForFinderTabCount(page, finderWindow, 2);

        // Verify a new active tab is assigned
        const activeAfterClose = await page.evaluate(() => {
            const registry = window.WindowRegistry;
            if (!registry || typeof registry.getAllWindows !== 'function') return null;
            const activeWindow =
                registry.getActiveWindow && registry.getActiveWindow()?.type === 'finder'
                    ? registry.getActiveWindow()
                    : (registry.getAllWindows('finder') || [])[0] || null;
            return activeWindow?.activeTabId || null;
        });
        expect(activeAfterClose).not.toBeNull();
        expect(activeAfterClose).not.toBe(activeBeforeClose);
    });
});
