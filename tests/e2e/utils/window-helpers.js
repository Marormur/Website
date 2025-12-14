// Shared window and instance helper utilities for E2E tests
// Reduces duplication and improves maintainability of window-related test helpers

const { expect } = require('@playwright/test');
const { openFinderWindow, waitForFinderReady } = require('../utils');

/**
 * Get the count of Finder windows registered in WindowRegistry
 * @param {Page} page - Playwright page
 * @returns {Promise<number>} Number of Finder windows
 */
async function getFinderWindowCount(page) {
    return await page.evaluate(
        () => (window.WindowRegistry?.getAllWindows?.('finder') || []).length
    );
}

/**
 * Opens a Finder window via the multi-window API (deterministic, avoids bubbling issues)
 * @param {Page} page - Playwright page
 * @returns {Promise<{windowId: string, finderWindowEl: Locator}>} Window ID and locator
 */
async function openFinderViaDock(page) {
    // Deterministic open: Dock clicks can bubble to multiple handlers in this project,
    // which can create 2+ windows unexpectedly. For specs we only need a Finder
    // window to exist; we can create it directly via the multi-window API.
    await page.evaluate(() => {
        try {
            window.WindowRegistry?.closeAllWindows?.();
        } catch {
            /* ignore */
        }
        const FW = window.FinderWindow;
        if (FW && typeof FW.create === 'function') {
            FW.create();
            return;
        }
        if (FW && typeof FW.focusOrCreate === 'function') {
            FW.focusOrCreate();
        }
    });

    // Wait until at least one Finder window is registered.
    await page.waitForFunction(
        () => (window.WindowRegistry?.getAllWindows?.('finder') || []).length > 0,
        { timeout: 15000 }
    );

    // Resolve the top-most Finder window id (highest zIndex) and return its locator.
    const windowId = await page.evaluate(() => {
        const wins = window.WindowRegistry?.getAllWindows?.('finder') || [];
        if (!wins.length) return null;
        let top = wins[0];
        for (const w of wins) {
            if ((w?.zIndex || 0) > (top?.zIndex || 0)) top = w;
        }
        return top?.id || null;
    });

    if (!windowId) throw new Error('Finder window did not register an id');
    const finderWindowEl = page.locator(`#${windowId}`);
    await expect(finderWindowEl).toBeVisible({ timeout: 10000 });
    return { windowId, finderWindowEl };
}

/**
 * Opens the Window menu in the menubar
 * @param {Page} page - Playwright page
 */
async function openWindowMenu(page) {
    const trigger = page.locator('#window-menu-trigger');
    await trigger.waitFor({ state: 'visible', timeout: 10000 });
    await trigger.click();
    // The dropdown toggles via the menubar system; wait until it is not hidden.
    try {
        await page.waitForSelector('#window-menu-dropdown:not(.hidden)', { timeout: 2000 });
    } catch {
        // Fallback: focus/hover also forces open in menubar-utils
        await trigger.focus();
        await trigger.hover();
        await page.waitForSelector('#window-menu-dropdown:not(.hidden)', { timeout: 5000 });
    }
    await page.waitForTimeout(150);
}

/**
 * Closes the Window menu if open
 * @param {Page} page - Playwright page
 */
async function closeWindowMenu(page) {
    await page.keyboard.press('Escape');
    // If the menubar system keeps it open, a second Escape is harmless.
    try {
        await page.waitForSelector('#window-menu-dropdown.hidden', { timeout: 1000 });
    } catch {
        await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(100);
}

/**
 * Opens a Finder window and waits for it to be ready
 * Wrapper around openFinderWindow + waitForFinderReady
 * @param {Page} page - Playwright page
 * @returns {Promise<Locator>} Finder window locator
 */
async function openFinder(page) {
    const finderWindow = await openFinderWindow(page);
    await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
    await waitForFinderReady(page);
    return finderWindow;
}

/**
 * Opens a Finder window at the root (Computer view)
 * @param {Page} page - Playwright page
 * @returns {Promise<Locator>} Finder window locator
 */
async function openFinderAtRoot(page) {
    const finderWindow = await openFinderWindow(page);
    await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
    await waitForFinderReady(page);

    // Click sidebar computer if present to ensure root view
    const computerBtn = finderWindow.locator('[data-finder-view="computer"]').first();
    if (await computerBtn.isVisible().catch(() => false)) {
        await computerBtn.click();
    }

    return finderWindow;
}

module.exports = {
    getFinderWindowCount,
    openFinderViaDock,
    openWindowMenu,
    closeWindowMenu,
    openFinder,
    openFinderAtRoot,
};
