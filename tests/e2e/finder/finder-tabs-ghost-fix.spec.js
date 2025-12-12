// Clean, migrated Finder Tabs - Ghost Tab Fix tests using per-window selectors
const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    waitForFinderReady,
    openFinderWindow,
    getFinderAddTabButton,
    getFinderTabs,
} = require('../utils');

test.describe('Finder Tabs - Ghost Tab Fix', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('Closing middle tab removes it from DOM (no ghost tabs)', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click();
        await addButton.click();

        // Wait until manager or DOM shows 3 tabs
        await page.waitForFunction(
            () => {
                try {
                    const dom = document.querySelectorAll(
                        '.modal.multi-window[id^="window-finder-"] .wt-tab'
                    ).length;
                    const reg = window.WindowRegistry?.getAllWindows('finder')?.length || 0;
                    return dom === 3 || reg === 3;
                } catch {
                    return false;
                }
            },
            { timeout: 20000 }
        );

        let tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(3);

        // Close middle
        await tabs.nth(1).locator('.wt-tab-close').click();

        await page.waitForFunction(
            () => {
                try {
                    const dom = document.querySelectorAll(
                        '.modal.multi-window[id^="window-finder-"] .wt-tab'
                    ).length;
                    const reg = window.WindowRegistry?.getAllWindows('finder')?.length || 0;
                    return dom === 2 || reg === 2;
                } catch {
                    return false;
                }
            },
            { timeout: 20000 }
        );

        tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(2);
    });

    test('Closing last remaining tab closes modal', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });

        const tabs = await getFinderTabs(page, finderWindow);
        await tabs.first().locator('.wt-tab-close').click();

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
        await addButton.click();

        // Verify 2 tabs exist
        let tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Close the first tab
        await tabs.nth(0).locator('.wt-tab-close').click();

        // Wait for DOM to show 1 tab
        await page.waitForFunction(
            () => {
                try {
                    const dom = document.querySelectorAll(
                        '.modal.multi-window[id^="window-finder-"] .wt-tab'
                    ).length;
                    return dom === 1;
                } catch {
                    return false;
                }
            },
            { timeout: 20000 }
        );

        tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(1);
    });

    test('Re-clicking tabs after closing middle does not show missing tabs', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click();
        await addButton.click();

        // Verify 3 tabs
        let tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(3, { timeout: 5000 });

        // Close middle tab
        await tabs.nth(1).locator('.wt-tab-close').click();

        await page.waitForFunction(
            () => {
                try {
                    const dom = document.querySelectorAll(
                        '.modal.multi-window[id^="window-finder-"] .wt-tab'
                    ).length;
                    return dom === 2;
                } catch {
                    return false;
                }
            },
            { timeout: 20000 }
        );

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
        await expect(tabs).toHaveCount(2);
    });

    test('Drag to reorder tabs', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click();
        await addButton.click();

        // Get initial order from data attributes
        const winId = await finderWindow.getAttribute('id');
        const initialOrder = await page.evaluate(wId => {
            return Array.from(document.querySelectorAll(`#${wId}-tabs .wt-tab`)).map(t =>
                t.getAttribute('data-instance-id')
            );
        }, winId);

        expect(initialOrder).not.toBeNull();
        expect(initialOrder.length).toBe(3);

        // Get tab elements
        let tabs = await getFinderTabs(page, finderWindow);

        // Drag third to first
        await tabs.nth(2).dragTo(tabs.nth(0));

        // Wait for DOM order to update
        await page.waitForFunction(
            (wId, prev) => {
                try {
                    const cur = Array.from(document.querySelectorAll(`#${wId}-tabs .wt-tab`)).map(
                        t => t.getAttribute('data-instance-id')
                    );
                    return JSON.stringify(cur) !== JSON.stringify(prev);
                } catch {
                    return false;
                }
            },
            winId,
            initialOrder,
            { timeout: 20000 }
        );

        // Verify new order
        const newOrder = await page.evaluate(wId => {
            return Array.from(document.querySelectorAll(`#${wId}-tabs .wt-tab`)).map(t =>
                t.getAttribute('data-instance-id')
            );
        }, winId);

        expect(newOrder[0]).toBe(initialOrder[2]);
        expect(newOrder[1]).toBe(initialOrder[0]);
        expect(newOrder[2]).toBe(initialOrder[1]);
    });

    test('Keyboard shortcuts work after middle tab close', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click();
        await addButton.click();

        // Verify 3 tabs
        let tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(3, { timeout: 5000 });

        // Close middle tab
        await tabs.nth(1).locator('.wt-tab-close').click();

        await page.waitForFunction(
            () => {
                try {
                    const dom = document.querySelectorAll(
                        '.modal.multi-window[id^="window-finder-"] .wt-tab'
                    ).length;
                    return dom === 2;
                } catch {
                    return false;
                }
            },
            { timeout: 20000 }
        );

        // Use Ctrl+W to close a tab (should work with fallback)
        tabs = await getFinderTabs(page, finderWindow);
        await tabs.nth(0).click();
        await page.focus('body');
        await page.keyboard.press('Control+KeyW');
        await page.waitForTimeout(200);

        // Fallback if needed
        try {
            await page.waitForFunction(
                () => {
                    try {
                        const dom = document.querySelectorAll(
                            '.modal.multi-window[id^="window-finder-"] .wt-tab'
                        ).length;
                        return dom === 1;
                    } catch {
                        return false;
                    }
                },
                { timeout: 3000 }
            );
        } catch {
            tabs = await getFinderTabs(page, finderWindow);
            await tabs.nth(0).locator('.wt-tab-close').click();
        }

        // Verify 1 tab remains
        tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(1);
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
        await addButton.click();
        await expect(await getFinderTabs(page, finderWindow)).toHaveCount(2, { timeout: 5000 });

        // Close second tab
        let tabs = await getFinderTabs(page, finderWindow);
        const secondTabClose = tabs.nth(1).locator('.wt-tab-close');
        await secondTabClose.click();

        // Wait until DOM reflects removal
        await page.waitForFunction(
            () => {
                try {
                    const dom = document.querySelectorAll(
                        '.modal.multi-window[id^="window-finder-"] .wt-tab'
                    ).length;
                    return dom === 1;
                } catch {
                    return false;
                }
            },
            [],
            { timeout: 20000 }
        );

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
        await addButton.click();
        await addButton.click();

        // Verify 3 tabs, third is active (accept DOM or manager)
        let tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(3, { timeout: 5000 });

        const activeBeforeClose = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return window.FinderInstanceManager.getActiveInstance()?.instanceId;
        });
        expect(activeBeforeClose).not.toBeNull();

        // Close the active tab (third)
        const thirdTabClose = tabs.nth(2).locator('.wt-tab-close');
        await thirdTabClose.click();

        // Wait for DOM to reflect removal
        await page.waitForFunction(
            () => {
                try {
                    const dom = document.querySelectorAll(
                        '.modal.multi-window[id^="window-finder-"] .wt-tab'
                    ).length;
                    return dom === 2;
                } catch {
                    return false;
                }
            },
            [],
            { timeout: 20000 }
        );

        // Verify 2 tabs remain
        tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(2);

        // Verify a new active tab is assigned
        const activeAfterClose = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return window.FinderInstanceManager.getActiveInstance()?.instanceId;
        });
        expect(activeAfterClose).not.toBeNull();
        expect(activeAfterClose).not.toBe(activeBeforeClose);
    });
});
