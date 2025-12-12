/**
 * Desktop Icons E2E Tests
 * Tests that desktop icons are rendered correctly with the programmatic system.
 */

const { test, expect } = require('@playwright/test');
const { gotoHome } = require('../utils');

test.describe('Desktop Icons - Basic', () => {
    test('desktop icons are rendered', async ({ page, baseURL }) => {
        await gotoHome(page, baseURL);

        // Check that desktop-icons container exists
        const desktopIcons = page.locator('#desktop-icons');
        await expect(desktopIcons).toBeVisible();

        // Check that shortcuts are rendered
        const shortcuts = desktopIcons.locator('.desktop-icon-button');
        const count = await shortcuts.count();

        console.log('Desktop shortcuts count:', count);
        expect(count).toBeGreaterThan(0);

        // Get all shortcut IDs
        const shortcutIds = await shortcuts.evaluateAll(elements =>
            elements.map(el => el.getAttribute('data-item-id'))
        );

        console.log('Desktop shortcut IDs:', shortcutIds);

        // Should include at least the known mandatory shortcut(s)
        expect(shortcutIds).toContain('projects');
    });

    test('can click desktop icon to open window', async ({ page, baseURL }) => {
        await gotoHome(page, baseURL);

        // Click the first available desktop icon (robust against set changes)
        const firstIcon = page.locator('#desktop-icons .desktop-icon-button').first();
        await expect(firstIcon).toBeVisible();
        await firstIcon.click();

        // Check if any app window (multi-window) is visible
        const anyModal = page.locator('.modal.multi-window:not(.hidden)').first();
        await expect(anyModal).toBeVisible();
    });
});
