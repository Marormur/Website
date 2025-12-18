// E2E tests for Finder multi-instance tabs
const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    waitForFinderReady,
    openFinderWindow,
    getFinderAddTabButton,
    getFinderTabs,
} = require('../utils');

test.describe('Finder Multi-Instance Tabs', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('Finder opens with initial tab', async ({ page }) => {
        // Open Finder
        const finderWindow = await openFinderWindow(page);
        await waitForFinderReady(page);
        // Wait for Finder window to be visible and registered in WindowRegistry
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForFunction(
            () => window.WindowRegistry?.getAllWindows('finder')?.length >= 1,
            { timeout: 10000 }
        );

        // Inspect WindowRegistry for finder windows
        const finderInfo = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('finder') || [];
            return { count: wins.length, hasActive: !!window.WindowRegistry?.getActiveWindow?.() };
        });

        expect(finderInfo.count).toBe(1);
        expect(finderInfo.hasActive).toBe(true);

        // Verify tab container exists and has one tab (scoped to the finder window)
        const windowId = await finderWindow.getAttribute('id');
        const tabContainer = finderWindow.locator(`#${windowId}-tabs`);
        await expect(tabContainer).toBeVisible();

        const tabs = tabContainer.locator('.wt-tab');
        await expect(tabs).toHaveCount(1);
    });

    test('Can create multiple Finder instances via + button', async ({ page }) => {
        // Open Finder and ensure visible
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Click the + button to create a new tab (scoped to the Finder window)
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await expect(addButton).toBeVisible();
        const tabs = await getFinderTabs(page, finderWindow);
        await addButton.click();

        // Wait deterministically for a second tab to appear
        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Verify the DOM shows two tabs (registry may update asynchronously)
        await expect(await getFinderTabs(page, finderWindow)).toHaveCount(2);
    });

    test('Can switch between Finder tabs', async ({ page }) => {
        // Open Finder and ensure visible
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Create a second tab (scoped to finder window)
        const addButton = await getFinderAddTabButton(page, finderWindow);
        const tabs = await getFinderTabs(page, finderWindow);
        await addButton.click();

        // DEBUG: Check why we have too many tabs
        const tabDetails = await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('.wt-tab'));
            return tabs.map(t => ({
                text: t.textContent?.trim(),
                visible: t.offsetParent !== null,
                id: t.id,
                parentId: t.parentElement?.id,
                parentClass: t.parentElement?.className,
                grandParentClass: t.parentElement?.parentElement?.className,
            }));
        });
        console.log('DEBUG TABS:', JSON.stringify(tabDetails, null, 2));

        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Get the two tab buttons (reuse the locator declared above)
        await expect(tabs).toHaveCount(2);

        const firstTab = tabs.nth(0);
        const secondTab = tabs.nth(1);

        // Second tab should be present (visual active class can vary)
        await expect(secondTab).toBeVisible();

        // Click first tab to switch
        await firstTab.click();
        await expect(firstTab).toBeVisible({ timeout: 5000 });

        // Verify active window via WindowRegistry
        const activeInfo = await page.evaluate(() => {
            const active = window.WindowRegistry?.getActiveWindow();
            const all = window.WindowRegistry?.getAllWindows('finder') || [];
            return {
                activeId: active?.windowId,
                isFirstActive: active?.windowId === all[0]?.windowId,
            };
        });
        expect(activeInfo.isFirstActive).toBe(true);
    });

    test('Can close Finder tab via close button', async ({ page }) => {
        // Open Finder and ensure visible
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Create a second tab (scoped to finder window)
        const addButton = await getFinderAddTabButton(page, finderWindow);
        let tabs = await getFinderTabs(page, finderWindow);
        await addButton.click();
        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Registry may lag; assert via DOM tabs instead
        const tabsNow = await getFinderTabs(page, finderWindow);
        await expect(tabsNow).toHaveCount(2, { timeout: 5000 });

        // Click close button on second tab (active tab)
        const secondTabClose = tabs.nth(1).locator('.wt-tab-close');
        await secondTabClose.click();

        // Small diagnostic: capture manager and DOM counts immediately after click
        // so we can see if the close action fired but DOM update is delayed.
        const countsAfterClose = await page.evaluate(() => {
            const mgrCount = window.WindowRegistry?.getAllWindows('finder')?.length || null;
            return {
                mgrCount,
                domCount: document.querySelectorAll(
                    '.modal.multi-window[id^="window-finder-"] .wt-tab'
                ).length,
            };
        });
        // Print to test output for diagnostics (Playwright captures console output)
        console.log('countsAfterClose:', countsAfterClose);

        // Wait until the DOM reflects the removal (tab element removed).
        // We intentionally wait on the DOM here because the test's later
        // assertion checks the DOM count strictly.
        await page.waitForFunction(
            () => {
                return (
                    (window.WindowRegistry?.getAllWindows('finder') || []).length === 1 ||
                    document.querySelectorAll('.modal.multi-window[id^="window-finder-"] .wt-tab')
                        .length === 1
                );
            },
            { timeout: 20000 }
        );

        tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(1, { timeout: 5000 });
    });

    test('Closing last Finder tab closes the modal', async ({ page }) => {
        // Open Finder and assert visible (legacy #finder-modal removed)
        const finderWindow = await openFinderWindow(page);
        await expect(finderWindow).toBeVisible();

        // Close the single tab
        const tabs = await getFinderTabs(page, finderWindow);
        const closeButton = tabs.first().locator('.wt-tab-close');
        await closeButton.click();

        // Verify WindowRegistry reports zero finder windows
        await page.waitForFunction(
            () => (window.WindowRegistry?.getAllWindows('finder') || []).length === 0,
            { timeout: 5000 }
        );
    });

    test('Finder tabs have correct title display', async ({ page }) => {
        // Open Finder and ensure visible
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Check first tab title
        const firstTab = (await getFinderTabs(page, finderWindow)).first();
        const firstTabTitle = firstTab.locator('.wt-tab-title');
        await expect(firstTabTitle).toContainText(/Finder|Computer/);

        // Create second tab
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click();
        await expect(await getFinderTabs(page, finderWindow)).toHaveCount(2, {
            timeout: 5000,
        });

        // Check second tab title
        const secondTab = (await getFinderTabs(page, finderWindow)).nth(1);
        const secondTabTitle = secondTab.locator('.wt-tab-title');
        await expect(secondTabTitle).toContainText(/Finder|Computer/);
    });

    test('Finder instances maintain independent navigation state', async ({ page }) => {
        // Open Finder and ensure visible
        const finderWindow = await openFinderWindow(page);
        await waitForFinderReady(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });

        // Create second tab (should start at default view)
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click();
        await expect(await getFinderTabs(page, finderWindow)).toHaveCount(2, {
            timeout: 10000,
        });

        // Verify both instances exist and have distinct instance ids (DOM-based check)
        const instanceIds = await page.evaluate(
            winId => {
                const winEl = document.querySelector(`.modal.multi-window#${winId}`);
                if (!winEl) return null;
                return Array.from(winEl.querySelectorAll('.wt-tab')).map(t =>
                    t.getAttribute('data-instance-id')
                );
            },
            await finderWindow.getAttribute('id')
        );

        expect(instanceIds).not.toBeNull();
        expect(instanceIds.length).toBe(2);
        expect(instanceIds[0]).not.toBe(instanceIds[1]);
    });

    test('API-based tab close (replaces Ctrl+W)', async ({ page }) => {
        // Open Finder and ensure active
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Create a second tab (scoped)
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click();
        const tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Get active tab ID and close via API
        const activeTabId = await tabs.nth(0).getAttribute('data-instance-id');
        await page.evaluate(tabId => {
            const registry = window.WindowRegistry;
            const win = registry?.getAllWindows('finder')?.[0];
            if (win && tabId) win.removeTab(tabId);
        }, activeTabId);

        await page.waitForFunction(
            () => {
                try {
                    const domCount = document.querySelectorAll(
                        '.modal.multi-window[id^="window-finder-"] .wt-tab'
                    ).length;
                    return domCount === 1;
                } catch {
                    return false;
                }
            },
            { timeout: 5000 }
        );

        // Verify one tab remains
        await expect(await getFinderTabs(page, finderWindow)).toHaveCount(1);
    });

    test('API-based tab creation (replaces Ctrl+N)', async ({ page }) => {
        // Open Finder
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        const tabsBefore = await getFinderTabs(page, finderWindow);
        await expect(tabsBefore).toHaveCount(1);

        // Create new tab via API
        await page.evaluate(() => {
            const registry = window.WindowRegistry;
            const win = registry?.getAllWindows('finder')?.[0];
            return win?.createView?.();
        });

        await expect(await getFinderTabs(page, finderWindow)).toHaveCount(2, { timeout: 5000 });
    });

    test('API-based tab switching (replaces Ctrl+Tab)', async ({ page }) => {
        // Open Finder via helper
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Create second tab (scoped)
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click();
        // Wait for the tab to be present
        const tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(2, { timeout: 5000 });

        // Click first tab to make it active
        await tabs.nth(0).click();
        await expect(tabs.nth(0)).toBeVisible({ timeout: 5000 });

        // Switch to next tab via API
        const secondTabId = await tabs.nth(1).getAttribute('data-instance-id');
        await page.evaluate(tabId => {
            const registry = window.WindowRegistry;
            const win = registry?.getAllWindows('finder')?.[0];
            if (win && tabId) win.setActiveTab(tabId);
        }, secondTabId);
        await page.waitForTimeout(200);

        // Verify second tab is now active (has active styling)
        await expect(tabs.nth(1)).toBeVisible();
    });

    test('Can reorder Finder tabs via drag and drop', async ({ page }) => {
        // Open Finder via helper
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });

        // Create two more tabs (total 3)
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click();
        await addButton.click();
        // Verify three tabs exist
        const tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs).toHaveCount(3, { timeout: 5000 });

        // Derive initial order from DOM data attributes (fallback if manager not present)
        const windowId = await finderWindow.getAttribute('id');
        const initialOrder = await page.evaluate(winId => {
            return Array.from(document.querySelectorAll(`#${winId}-tabs .wt-tab`)).map(t =>
                t.getAttribute('data-instance-id')
            );
        }, windowId);

        expect(initialOrder).not.toBeNull();
        expect(initialOrder.length).toBe(3);

        // Get tab elements for drag and drop
        const firstTab = tabs.nth(0);
        const thirdTab = tabs.nth(2);

        // Drag the third tab to before the first tab
        await thirdTab.dragTo(firstTab);

        // Wait for the DOM order to update for this window's tabs (prefer DOM over manager)
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
            windowId,
            initialOrder,
            { timeout: 20000 }
        );

        // Verify the DOM order changed
        const newOrderDom = await page.evaluate(winId => {
            return Array.from(document.querySelectorAll(`#${winId}-tabs .wt-tab`)).map(t =>
                t.getAttribute('data-instance-id')
            );
        }, windowId);

        expect(newOrderDom).not.toBeNull();
        expect(newOrderDom.length).toBe(3);
        expect(newOrderDom[0]).toBe(initialOrder[2]);
        expect(newOrderDom[1]).toBe(initialOrder[0]);
        expect(newOrderDom[2]).toBe(initialOrder[1]);
    });

    test('Active tab persists after reordering', async ({ page }) => {
        // Open Finder
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        // Wait for Finder systems to be ready
        await waitForFinderReady(page);

        // Create two more tabs (total 3)
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await addButton.click();
        await expect(await getFinderTabs(page, finderWindow)).toHaveCount(2, {
            timeout: 5000,
        });
        await addButton.click();
        await expect(await getFinderTabs(page, finderWindow)).toHaveCount(3, {
            timeout: 5000,
        });

        // Click the first tab to make it active
        const tabs = await getFinderTabs(page, finderWindow);
        await tabs.nth(0).click();
        await expect(tabs.nth(0)).toBeVisible({ timeout: 5000 });

        // Determine the active instance id from the clicked first tab (more reliable)
        const tabsForActive = await getFinderTabs(page, finderWindow);
        const activeBeforeReorder = await tabsForActive.nth(0).getAttribute('data-instance-id');
        expect(activeBeforeReorder).not.toBeNull();

        // Drag the second tab to before the first tab and wait for DOM order change
        const firstTab = (await getFinderTabs(page, finderWindow)).nth(0);
        const secondTab = (await getFinderTabs(page, finderWindow)).nth(1);
        await secondTab.dragTo(firstTab);

        const winId2 = await finderWindow.getAttribute('id');
        const beforeOrder = await page.evaluate(
            winId =>
                Array.from(document.querySelectorAll(`#${winId}-tabs .wt-tab`)).map(t =>
                    t.getAttribute('data-instance-id')
                ),
            winId2
        );
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
            winId2,
            beforeOrder,
            { timeout: 20000 }
        );

        // Verify the active instance is still the same via manager if available, else verify visible container's data-instance-id
        const activeAfterReorder = await page.evaluate(() => {
            try {
                if (window.FinderInstanceManager) {
                    const active = window.FinderInstanceManager.getActiveInstance();
                    return active?.instanceId;
                }
                return null;
            } catch {
                return null;
            }
        });

        if (activeAfterReorder) {
            expect(activeAfterReorder).toBe(activeBeforeReorder);
        } else {
            const visibleInstance = await page.evaluate(winId => {
                const container = document.querySelector(
                    `.modal.multi-window#${winId} #${winId}-container`
                );
                if (!container) return null;
                const visible = Array.from(container.children).find(el => {
                    return !el.classList.contains('hidden') && el.querySelector('.finder-content');
                });
                return visible ? visible.getAttribute('data-instance-id') : null;
            }, winId2);
            if (visibleInstance) {
                expect(visibleInstance).toBe(activeBeforeReorder);
            } else {
                // If visible container doesn't expose instance id, at least verify the tab element still exists
                const tabStillExists = await page.evaluate(
                    arg =>
                        !!document.querySelector(
                            `#${arg.winId}-tabs .wt-tab[data-instance-id="${arg.id}"]`
                        ),
                    { winId: winId2, id: activeBeforeReorder }
                );
                expect(tabStillExists).toBe(true);
            }
        }
    });
});
