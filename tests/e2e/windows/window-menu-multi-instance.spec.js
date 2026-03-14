// E2E tests for Window menu multi-instance integration

// Note: waitForTimeout used intentionally for menu animations and DOM updates
const { test, expect } = require('@playwright/test');
const { gotoHome, waitForAppReady, dismissWelcomeDialogIfPresent } = require('../utils');
const {
    getFinderWindowCount,
    openFinderViaDock,
    openWindowMenu,
    closeWindowMenu,
} = require('../utils/window-helpers');

test.describe('Window Menu Multi-Instance Integration', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        // Prevent session restore from leaking windows across tests.
        // This spec relies on deterministic window counts.
        await page.addInitScript(() => {
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch {
                /* ignore */
            }
        });
        await gotoHome(page, baseURL);
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);
    });

    async function createAdditionalFinderWindow(page) {
        const before = await getFinderWindowCount(page);

        await page.evaluate(() => {
            const FinderWindow = window.FinderWindow;
            if (FinderWindow?.create) {
                FinderWindow.create();
                return;
            }
            FinderWindow?.focusOrCreate?.();
        });

        await page.waitForFunction(
            b => (window.WindowRegistry?.getAllWindows?.('finder') || []).length >= b + 1,
            before,
            { timeout: 10000 }
        );
    }

    test('@basic Window menu shows Finder instances and actions', async ({ page }) => {
        await openFinderViaDock(page);

        await openWindowMenu(page);

        // In Finder context, "New Finder" lives in the File menu, not in Window.
        const newFinderItem = page.locator('#menu-dropdown-window .menu-item', {
            hasText: /Neuer Finder|New Finder/i,
        });
        await expect(newFinderItem).toHaveCount(0);

        // Verify at least one Finder instance is listed
        const finderItems = page.locator('#menu-dropdown-window .menu-item', {
            hasText: /Finder\s+\d+/i,
        });
        await expect(finderItems.first()).toBeVisible();

        await closeWindowMenu(page);
    });

    test('Window menu lists multiple Finder instances', async ({ page }) => {
        await openFinderViaDock(page);

        // Create a second Finder window via the current multi-window API.
        await createAdditionalFinderWindow(page);

        // Verify two instances exist via WindowRegistry
        const instanceCount = await getFinderWindowCount(page);
        expect(instanceCount).toBeGreaterThanOrEqual(2);

        await openWindowMenu(page);

        // Verify two Finder instances are listed in menu
        // Look for "Finder 1" and "Finder 2" in the menu
        const finderItems = page.locator('#menu-dropdown-window .menu-item', {
            hasText: /Finder\s+\d+/i,
        });
        const count = await finderItems.count();
        expect(count).toBeGreaterThanOrEqual(2);

        await closeWindowMenu(page);
    });

    test('Window menu shows checkmark on active instance', async ({ page }) => {
        await openFinderViaDock(page);
        await createAdditionalFinderWindow(page);

        await openWindowMenu(page);

        // Exactly one active checkmark is expected (✓ prefix in label text)
        const checkmarks = page.locator('#menu-dropdown-window .menu-item', {
            hasText: /^✓/,
        });
        await expect(checkmarks).toHaveCount(1);

        await closeWindowMenu(page);
    });

    test('Can switch Finder instances via Window menu', async ({ page }) => {
        await openFinderViaDock(page);
        await createAdditionalFinderWindow(page);

        const initialActiveId = await page.evaluate(
            () => window.WindowRegistry?.getActiveWindow?.()?.id || null
        );
        expect(initialActiveId).toBeTruthy();

        await openWindowMenu(page);

        const menuItems = page.locator('#menu-dropdown-window .menu-item', {
            hasText: /Finder\s+\d+/,
        });
        const itemCount = await menuItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(2);

        // Click the non-active one (no checkmark)
        for (let i = 0; i < itemCount; i++) {
            const item = menuItems.nth(i);
            const text = (await item.textContent()) || '';
            if (!text.includes('✓')) {
                await item.click();
                break;
            }
        }

        await closeWindowMenu(page);

        await page.waitForFunction(
            prev => (window.WindowRegistry?.getActiveWindow?.()?.id || null) !== prev,
            initialActiveId,
            { timeout: 5000 }
        );

        const newActiveId = await page.evaluate(
            () => window.WindowRegistry?.getActiveWindow?.()?.id || null
        );
        expect(newActiveId).not.toBe(initialActiveId);
    });

    test('Window menu shows "Close All" action with multiple instances', async ({ page }) => {
        await openFinderViaDock(page);
        await createAdditionalFinderWindow(page);

        await openWindowMenu(page);

        // Verify "Close All" action is visible
        const closeAllItem = page.locator('#menu-dropdown-window .menu-item', {
            hasText: /Alle schließen|Close All/i,
        });
        await expect(closeAllItem).toBeVisible();

        await closeWindowMenu(page);
    });

    test('Close All action closes all Finder instances', async ({ page }) => {
        await openFinderViaDock(page);
        await createAdditionalFinderWindow(page);

        let count = await getFinderWindowCount(page);
        expect(count).toBeGreaterThanOrEqual(2);

        await openWindowMenu(page);

        // Click "Close All"
        const closeAllItem = page.locator('#menu-dropdown-window .menu-item', {
            hasText: /Alle schließen|Close All/i,
        });

        // Handle the confirmation dialog
        page.on('dialog', dialog => dialog.accept());

        await closeAllItem.click();

        // Wait until WindowRegistry reports zero finder windows
        await page.waitForFunction(
            () => (window.WindowRegistry?.getAllWindows('finder') || []).length === 0,
            { timeout: 5000 }
        );

        // Verify all instances are closed
        count = await page.evaluate(
            () => (window.WindowRegistry?.getAllWindows('finder') || []).length
        );
        expect(count).toBe(0);
    });

    test('Window menu omits "New Finder" while Finder is active', async ({ page }) => {
        await openFinderViaDock(page);

        await openWindowMenu(page);

        const newFinderItem = page.locator('#menu-dropdown-window .menu-item', {
            hasText: /Neuer Finder|New Finder/i,
        });
        await expect(newFinderItem).toHaveCount(0);

        await closeWindowMenu(page);
    });

    test('Menu updates when instances are created/destroyed', async ({ page }) => {
        await openFinderViaDock(page);

        // Open Window menu with one instance
        await openWindowMenu(page);

        // Should not have "Close All" yet (only one instance)
        let closeAllItem = page.locator('#menu-dropdown-window .menu-item', {
            hasText: /Alle schließen|Close All/i,
        });
        await expect(closeAllItem).not.toBeVisible();

        await closeWindowMenu(page);

        // Create second window
        await createAdditionalFinderWindow(page);

        // Open Window menu again - should now show instance list and Close All
        await openWindowMenu(page);

        // Now "Close All" should be visible
        closeAllItem = page.locator('#menu-dropdown-window .menu-item', {
            hasText: /Alle schließen|Close All/i,
        });
        await expect(closeAllItem).toBeVisible();

        // Should see instance items
        const instanceItems = page.locator('#menu-dropdown-window .menu-item', {
            hasText: /Finder\s+\d+/,
        });
        const itemCount = await instanceItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(2);

        await closeWindowMenu(page);
    });
});
