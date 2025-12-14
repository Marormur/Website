// E2E tests for Window menu multi-instance integration
/* eslint-disable no-restricted-syntax */
// Note: waitForTimeout used intentionally for menu animations and DOM updates
const { test, expect } = require('@playwright/test');
const { gotoHome, waitForAppReady } = require('../utils');
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
    });

    async function clickNewFinderInMenu(page) {
        const before = await getFinderWindowCount(page);
        await openWindowMenu(page);
        const newFinderItem = page
            .locator('#window-menu-dropdown .menu-item', { hasText: /Neuer Finder|New Finder/i })
            .first();
        await expect(newFinderItem).toBeVisible();
        await newFinderItem.click();
        await closeWindowMenu(page);

        await page.waitForFunction(
            b => (window.WindowRegistry?.getAllWindows?.('finder') || []).length >= b + 1,
            before,
            { timeout: 10000 }
        );
    }

    test('@basic Window menu shows Finder instances and actions', async ({ page }) => {
        await openFinderViaDock(page);

        await openWindowMenu(page);

        // Verify "New Finder" action is visible
        const newFinderItem = page
            .locator('#window-menu-dropdown .menu-item', { hasText: /Neuer Finder|New Finder/i })
            .first();
        await expect(newFinderItem).toBeVisible();

        // Verify at least one Finder instance is listed
        const finderItems = page.locator('#window-menu-dropdown .menu-item', {
            hasText: /Finder\s+\d+/i,
        });
        await expect(finderItems.first()).toBeVisible();

        await closeWindowMenu(page);
    });

    test('Window menu lists multiple Finder instances', async ({ page }) => {
        await openFinderViaDock(page);

        // Create a second Finder window via Window menu
        await clickNewFinderInMenu(page);

        // Verify two instances exist via WindowRegistry
        const instanceCount = await getFinderWindowCount(page);
        expect(instanceCount).toBeGreaterThanOrEqual(2);

        await openWindowMenu(page);

        // Verify two Finder instances are listed in menu
        // Look for "Finder 1" and "Finder 2" in the menu
        const finderItems = page.locator('#window-menu-dropdown .menu-item', {
            hasText: /Finder\s+\d+/i,
        });
        const count = await finderItems.count();
        expect(count).toBeGreaterThanOrEqual(2);

        await closeWindowMenu(page);
    });

    test('Window menu shows checkmark on active instance', async ({ page }) => {
        await openFinderViaDock(page);
        await clickNewFinderInMenu(page);

        await openWindowMenu(page);

        // Exactly one active checkmark is expected
        const checkmarks = page.locator('#window-menu-dropdown .menu-item-checkmark');
        await expect(checkmarks).toHaveCount(1);

        await closeWindowMenu(page);
    });

    test('Can switch Finder instances via Window menu', async ({ page }) => {
        await openFinderViaDock(page);
        await clickNewFinderInMenu(page);

        const initialActiveId = await page.evaluate(
            () => window.WindowRegistry?.getActiveWindow?.()?.id || null
        );
        expect(initialActiveId).toBeTruthy();

        await openWindowMenu(page);

        const menuItems = page.locator('#window-menu-dropdown .menu-item', {
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
        await clickNewFinderInMenu(page);

        await openWindowMenu(page);

        // Verify "Close All" action is visible
        const closeAllItem = page.locator('#window-menu-dropdown .menu-item', {
            hasText: /Alle schließen|Close All/i,
        });
        await expect(closeAllItem).toBeVisible();

        await closeWindowMenu(page);
    });

    test('Close All action closes all Finder instances', async ({ page }) => {
        await openFinderViaDock(page);
        await clickNewFinderInMenu(page);

        let count = await getFinderWindowCount(page);
        expect(count).toBeGreaterThanOrEqual(2);

        await openWindowMenu(page);

        // Click "Close All"
        const closeAllItem = page.locator('#window-menu-dropdown .menu-item', {
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

    test('New Finder action creates new instance', async ({ page }) => {
        await openFinderViaDock(page);

        // Verify one instance initially
        let count = await getFinderWindowCount(page);
        expect(count).toBe(1);

        await clickNewFinderInMenu(page);

        // Verify two instances now exist
        count = await getFinderWindowCount(page);
        expect(count).toBeGreaterThanOrEqual(2);

        // Verify at least two Finder windows exist in the DOM
        const windows = page.locator('.modal.multi-window[id^="window-finder-"]');
        const winCount = await windows.count();
        expect(winCount).toBeGreaterThanOrEqual(2);
    });

    test('Menu updates when instances are created/destroyed', async ({ page }) => {
        await openFinderViaDock(page);

        // Open Window menu - should show only "New Finder", no instance list
        await openWindowMenu(page);

        // Should not have "Close All" yet (only one instance)
        let closeAllItem = page.locator('#window-menu-dropdown .menu-item', {
            hasText: /Alle schließen|Close All/i,
        });
        await expect(closeAllItem).not.toBeVisible();

        await closeWindowMenu(page);

        // Create second window
        await clickNewFinderInMenu(page);

        // Open Window menu again - should now show instance list and Close All
        await openWindowMenu(page);

        // Now "Close All" should be visible
        closeAllItem = page.locator('#window-menu-dropdown .menu-item', {
            hasText: /Alle schließen|Close All/i,
        });
        await expect(closeAllItem).toBeVisible();

        // Should see instance items
        const instanceItems = page.locator('#window-menu-dropdown .menu-item', {
            hasText: /Finder\s+\d+/,
        });
        const itemCount = await instanceItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(2);

        await closeWindowMenu(page);
    });
});
