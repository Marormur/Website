/**
 * Desktop Icons E2E Tests
 * Tests that desktop icons are rendered correctly with the programmatic system.
 */

const { test, expect } = require('@playwright/test');
const { gotoHome } = require('./utils');

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

        // Should have the expected shortcuts from DESKTOP_SHORTCUTS
        expect(shortcutIds).toContain('projects');
        expect(shortcutIds).toContain('about');
        expect(shortcutIds).toContain('settings');
        expect(shortcutIds).toContain('github');
    });

    test('can click desktop icon to open window', async ({ page, baseURL }) => {
        await gotoHome(page, baseURL);

        // Click the "about" desktop icon
        const aboutIcon = page.locator('#desktop-icons .desktop-icon-button[data-item-id="about"]');
        await expect(aboutIcon).toBeVisible();
        await aboutIcon.click();

        // Check if about-modal is visible (wait for modal to open)
        const aboutModal = page.locator('#about-modal');
        const isVisible = await aboutModal.evaluate(el => {
            return !el.classList.contains('hidden');
        });

        console.log('About modal visible after desktop icon click:', isVisible);
        expect(isVisible).toBe(true);
    });
});
